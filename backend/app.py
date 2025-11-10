from langchain.tools import tool
from langgraph.prebuilt import create_react_agent
import json
from summarizer import summarize_json_and_sentence
from persona import generate_personas
from goal import generate_goals
from prompts.prompt import system_prompts
from dotenv import load_dotenv
import os
from langchain.chat_models import init_chat_model
import getpass
import pandas as pd
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import tempfile
from pathlib import Path
import io

load_dotenv()  
gemini_api_key = "" 



#model = init_chat_model("gemini-2.5-flash", model_provider="google_genai")
#llm = genai.GenerativeModel("gemini-1.5-flash")
llm = init_chat_model("gemini-1.5-flash",model_provider= "google_genai")

@tool
def summarize_data(dataset_path: str, gemini_api_key: str) -> str:
    """
    Summarize the data using Gemini LLM.
    """
    dataset = pd.read_csv(dataset_path, encoding='latin1')
    
    summary_json, summary_text = summarize_json_and_sentence(dataset, gemini_api_key)
    # Return both JSON and text summary as a tuple string
    return json.dumps({
        "json_summary": summary_json,
        "text_summary": summary_text
    }, indent=2)

@tool
def persona(data_summary_json: str, gemini_api_key: str, n: int = 5) -> str:
    """
    Generate personas based on the data summary.
    """
    summary = json.loads(data_summary_json)
    # If wrapped in {"json_summary": ..., "text_summary": ...}, extract json_summary
    if "json_summary" in summary:
        summary = summary["json_summary"]
    personas = generate_personas(summary, gemini_api_key, n=n)
    output = []
    for i, persona in enumerate(personas, 1):
        output.append(f"{i}. Persona: {persona['persona']}\n   Rationale: {persona['rationale']}\n")
    return "\n".join(output)

@tool
def goals(data_summary_json: str, persona: str, gemini_api_key: str, n: int = 5) -> str:
    """
    Generate goals based on the data summary and persona.
    """
    summary = json.loads(data_summary_json)
    # If wrapped in {"json_summary": ..., "text_summary": ...}, extract json_summary
    if "json_summary" in summary:
        summary = summary["json_summary"]
    persona_dict = {"persona": persona, "rationale": ""}
    goals = generate_goals(summary, persona_dict, gemini_api_key, n=n)
    output = []
    for goal in goals:
        output.append(f"Goal {goal.get('index', '')}:\n  Question: {goal['question']}\n  Visualization: {goal['visualization']}\n  Rationale: {goal['rationale']}\n")
    return "\n".join(output)

# --- Visualization agent tools ---
@tool
def chart_spec(columns: list, question: str, gemini_api_key: str) -> dict:
    """
    Generate chart specification from columns and question using Gemini LLM.
    """
    from chart_spec import GeminiChartSpecClient
    client = GeminiChartSpecClient(gemini_api_key)
    spec = client.generate_chart_spec(columns, question)
    return spec

@tool
def preprocess_chart(dataset_path: str, chart_spec: dict) -> dict:
    """
    Preprocess data for chart generation. Accepts dataset path, returns processed data as JSON-serializable dict.
    """
    
    from preprocess import ChartDataPreprocessor
    df = pd.read_csv(dataset_path, encoding='latin1')
    preprocessor = ChartDataPreprocessor(df)
    processed_df, error = preprocessor.process_for_chart(chart_spec)
    # Convert processed_df to records (list of dicts) for serialization
    processed_data = processed_df.to_dict(orient='records') if processed_df is not None else None
    return {"processed_data": processed_data, "error": error}

@tool
def chart_generator(processed_data: list, chart_spec: dict) -> dict:
    """
    Generate chart using processed data (list of dicts) and chart spec.
    """
    
    from chart_generator import ChartGenerator
    import plotly.utils, json, io, base64, matplotlib.pyplot as plt
    chart_gen = ChartGenerator()
    # Convert processed_data back to DataFrame for chart generation
    df = pd.DataFrame(processed_data) if processed_data is not None else pd.DataFrame()
    chart_results_dict = chart_gen.generate_chart(df, chart_spec)
    result = {}
    if chart_results_dict.get("plotly") is not None and chart_results_dict.get("plotly_error") is None:
        plotly_json_str = plotly.utils.PlotlyJSONEncoder().encode(chart_results_dict["plotly"])
        plotly_json_str = plotly_json_str.replace("NaN", "null").replace("Infinity", "null").replace("-Infinity", "null")
        chart_json = json.loads(plotly_json_str)
        result["chart_data_plotly"] = chart_json
        result["chart_error_plotly"] = None
    else:
        result["chart_data_plotly"] = None
        result["chart_error_plotly"] = chart_results_dict.get("plotly_error")
    if result["chart_data_plotly"] is None and chart_results_dict.get("matplotlib") is not None and chart_results_dict.get("matplotlib_error") is None:
        img_buffer = io.BytesIO()
        chart_results_dict["matplotlib"].savefig(img_buffer, format='png', bbox_inches='tight', dpi=150)
        img_buffer.seek(0)
        img_base64 = base64.b64encode(img_buffer.getvalue()).decode()
        result["chart_data_matplotlib"] = f"data:image/png;base64,{img_base64}"
        plt.close(chart_results_dict["matplotlib"])
        result["chart_error_matplotlib"] = None
    else:
        result["chart_data_matplotlib"] = None
        result["chart_error_matplotlib"] = chart_results_dict.get("matplotlib_error")
    return result

# --- Create two agents ---
analysis_tools = [summarize_data, persona, goals]
visualization_tools = [chart_spec, preprocess_chart, chart_generator]

analysis_agent = create_react_agent(
    model=llm,
    tools=analysis_tools,
    prompt=system_prompts,
)
viz_agent = create_react_agent(
    model=llm,
    tools=visualization_tools,
    prompt=system_prompts,  # You may want a different prompt for viz agent
)

# In-memory storage for uploaded files (as in main.py)
uploaded_files_storage = {}

# FastAPI app
app = FastAPI(
    title="Vizoraa Agent API",
    description="Agent endpoints using LangGraph/LangChain for LLM-powered data analysis.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def run_agent_on_dataframe(df, gemini_api_key, instruction=None, n_personas=3, n_goals=5):
    # Use the same summarizer/persona/goals logic as main.py, but via agent tools
    summary_json, summary_text = summarize_json_and_sentence(df, gemini_api_key)
    if instruction:
        # Treat instruction as queries (comma/newline separated)
        from goal import generate_goals_from_queries
        query_list = [q.strip() for q in instruction.replace('\n', ',').split(',') if q.strip()]
        goals = generate_goals_from_queries(summary_json, query_list, gemini_api_key)
        personas = generate_personas(summary_json, gemini_api_key, n=1)
        first_persona = personas[0] if personas else {"persona": "agent", "rationale": "Default persona"}
        approach = "agent_upload_with_instruction"
    else:
        personas = generate_personas(summary_json, gemini_api_key, n=n_personas)
        first_persona = personas[0] if personas else {"persona": "agent", "rationale": "Default persona"}
        goals = generate_goals(summary_json, first_persona, gemini_api_key, n=n_goals)
        approach = "agent_upload_no_instruction"
    # Optionally: generate charts here if you want to match main.py
    try:
        from goal import generate_goals_from_queries
        from chart_spec import GeminiChartSpecClient
        from preprocess import ChartDataPreprocessor
        from chart_generator import ChartGenerator

        def generate_charts_from_goals(df, goals, gemini_api_key):
            chart_spec_client = GeminiChartSpecClient(gemini_api_key)
            chart_gen = ChartGenerator()
            from summarizer import get_column_names
            columns = get_column_names(df)
            chart_results = []
            for goal in goals:
                chart_spec = chart_spec_client.generate_chart_spec(columns, goal["question"])
                chart_spec = chart_spec_client.validate_chart_spec(chart_spec, columns)
                preprocessor = ChartDataPreprocessor(df)
                processed_df, error = preprocessor.process_for_chart(chart_spec)
                chart_info = {
                    "goal": goal,
                    "chart_spec": chart_spec,
                    "preprocess_error": error,
                }
                if not error:
                    processed_df = processed_df.replace([float('nan'), float('inf'), float('-inf')], None)
                    chart_results_dict = chart_gen.generate_chart(processed_df, chart_spec)
                    if chart_results_dict.get("plotly") is not None and chart_results_dict.get("plotly_error") is None:
                        import plotly.utils
                        import json
                        plotly_json_str = plotly.utils.PlotlyJSONEncoder().encode(chart_results_dict["plotly"])
                        plotly_json_str = plotly_json_str.replace("NaN", "null").replace("Infinity", "null").replace("-Infinity", "null")
                        chart_json = json.loads(plotly_json_str)
                        chart_info["chart_data_plotly"] = chart_json
                        chart_info["chart_error_plotly"] = None
                    else:
                        chart_info["chart_data_plotly"] = None
                        chart_info["chart_error_plotly"] = chart_results_dict.get("plotly_error")
                    if chart_info["chart_data_plotly"] is None and chart_results_dict.get("matplotlib") is not None and chart_results_dict.get("matplotlib_error") is None:
                        import io, base64, matplotlib.pyplot as plt
                        img_buffer = io.BytesIO()
                        chart_results_dict["matplotlib"].savefig(img_buffer, format='png', bbox_inches='tight', dpi=150)
                        img_buffer.seek(0)
                        img_base64 = base64.b64encode(img_buffer.getvalue()).decode()
                        chart_info["chart_data_matplotlib"] = f"data:image/png;base64,{img_base64}"
                        plt.close(chart_results_dict["matplotlib"])
                        chart_info["chart_error_matplotlib"] = None
                    else:
                        chart_info["chart_data_matplotlib"] = None
                        chart_info["chart_error_matplotlib"] = chart_results_dict.get("matplotlib_error")
                chart_results.append(chart_info)
            return chart_results

        charts = generate_charts_from_goals(df, goals, gemini_api_key)
    except Exception as e:
        charts = []

    return {
        "summary_json": summary_json,
        "summary_text": summary_text,
        "personas": personas if instruction is None else [first_persona],
        "selected_persona": first_persona,
        "goals": goals,
        "charts": charts,  # <-- ADD THIS
        "approach": approach,
    }

@app.post("/agent/")
async def agent_upload(
    file: UploadFile = File(...),
    instruction: Optional[str] = Form(None),
    gemini_api_key: str = Form("")
):
    temp_file_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as temp_file:
            temp_file.write(await file.read())
            temp_file_path = temp_file.name
        df = pd.read_csv(temp_file_path, encoding='latin1')
        file_id = f"file_{len(uploaded_files_storage)}"
        uploaded_files_storage[file_id] = {
            "filename": file.filename,
            "dataframe": df.copy(),
            "uploaded_at": pd.Timestamp.now().isoformat(),
        }
        result = run_agent_on_dataframe(df, gemini_api_key, instruction)
        result["file_id"] = file_id
        return result
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@app.post("/agent_query/")
async def agent_query(
    file_id: str = Form(...),
    instruction: str = Form(...),
    gemini_api_key: str = Form("")
):
    try:
        if file_id not in uploaded_files_storage:
            return JSONResponse(status_code=404, content={"error": "File not found. Upload the file first."})
        file_data = uploaded_files_storage[file_id]
        df = file_data["dataframe"]
        result = run_agent_on_dataframe(df, gemini_api_key, instruction)
        result["file_id"] = file_id
        result["filename"] = file_data["filename"]
        return result
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/extract_columns/")
async def extract_columns(file: UploadFile = File(...)):
    try:
        suffix = Path(file.filename).suffix.lower()
        file_bytes = await file.read()

        # Read CSV
        if suffix == ".csv":
            df = pd.read_csv(io.BytesIO(file_bytes), nrows=5, encoding='latin1')
            columns = list(df.columns)

        # Read Excel
        elif suffix in [".xlsx", ".xls"]:
            df = pd.read_excel(io.BytesIO(file_bytes), nrows=5)
            columns = list(df.columns)

        # Read JSON
        elif suffix == ".json":
            data = json.loads(file_bytes.decode())
            if isinstance(data, list) and len(data) > 0:
                columns = list(data[0].keys())
            else:
                columns = list(data.keys())

        else:
            return JSONResponse(status_code=400, content={"error": "Unsupported file format"})

        return {"columns": columns, "filename": file.filename}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# --- Two-agent orchestration endpoint ---
@app.post("/two_agent/")
async def two_agent_flow(
    file: UploadFile = File(...),
    instruction: Optional[str] = Form(None),
    gemini_api_key: str = Form("")
):
    temp_file_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as temp_file:
            temp_file.write(await file.read())
            temp_file_path = temp_file.name
        df = pd.read_csv(temp_file_path, encoding='latin1')
        
        # CRITICAL: Generate and store file_id
        file_id = f"file_{len(uploaded_files_storage)}_{int(pd.Timestamp.now().timestamp())}"
        uploaded_files_storage[file_id] = {
            "filename": file.filename,
            "dataframe": df.copy(),
            "uploaded_at": pd.Timestamp.now().isoformat(),
        }
        print(f"Stored file with ID: {file_id}")
        
        # --- Analysis agent ---
        summary_json, summary_text = summarize_json_and_sentence(df, gemini_api_key)
        columns = list(df.columns)
        if instruction:
            from goal import generate_goals_from_queries
            query_list = [q.strip() for q in instruction.replace('\n', ',').split(',') if q.strip()]
            goals = generate_goals_from_queries(summary_json, query_list, gemini_api_key)
            personas = generate_personas(summary_json, gemini_api_key, n=1)
            first_persona = personas[0] if personas else {"persona": "agent", "rationale": "Default persona"}
            approach = "agent_upload_with_instruction"
        else:
            personas = generate_personas(summary_json, gemini_api_key, n=3)
            first_persona = personas[0] if personas else {"persona": "agent", "rationale": "Default persona"}
            goals = generate_goals(summary_json, first_persona, gemini_api_key, n=5)
            approach = "agent_upload_no_instruction"
        # --- Visualization agent ---
        charts = []
        from chart_spec import GeminiChartSpecClient
        from preprocess import ChartDataPreprocessor
        from chart_generator import ChartGenerator
        import plotly.utils, json, io, base64, matplotlib.pyplot as plt
        chart_spec_client = GeminiChartSpecClient(gemini_api_key)
        chart_gen = ChartGenerator()
        for goal in goals:
            # 1. chart_spec
            chart_spec_result = chart_spec_client.generate_chart_spec(columns, goal["question"])
            chart_spec_result = chart_spec_client.validate_chart_spec(chart_spec_result, columns)
            # 2. preprocess
            preprocessor = ChartDataPreprocessor(df)
            processed_df, error = preprocessor.process_for_chart(chart_spec_result)
            processed_data = processed_df.to_dict(orient='records') if processed_df is not None else None
            chart_info = {
                "goal": goal,
                "chart_spec": chart_spec_result,
                "preprocess_error": error,
            }

            if not error:
                # 3. chart_generator
                chart_results_dict = chart_gen.generate_chart(processed_df, chart_spec_result)
                if chart_results_dict.get("plotly") is not None and chart_results_dict.get("plotly_error") is None:
                    plotly_json_str = plotly.utils.PlotlyJSONEncoder().encode(chart_results_dict["plotly"])
                    plotly_json_str = plotly_json_str.replace("NaN", "null").replace("Infinity", "null").replace("-Infinity", "null")
                    chart_json = json.loads(plotly_json_str)
                    chart_info["chart_data_plotly"] = chart_json
                    chart_info["chart_error_plotly"] = None
                else:
                    chart_info["chart_data_plotly"] = None
                    chart_info["chart_error_plotly"] = chart_results_dict.get("plotly_error")
                if chart_info["chart_data_plotly"] is None and chart_results_dict.get("matplotlib") is not None and chart_results_dict.get("matplotlib_error") is None:
                    img_buffer = io.BytesIO()
                    chart_results_dict["matplotlib"].savefig(img_buffer, format='png', bbox_inches='tight', dpi=150)
                    img_buffer.seek(0)
                    img_base64 = base64.b64encode(img_buffer.getvalue()).decode()
                    chart_info["chart_data_matplotlib"] = f"data:image/png;base64,{img_base64}"
                    plt.close(chart_results_dict["matplotlib"])
                    chart_info["chart_error_matplotlib"] = None
                else:
                    chart_info["chart_data_matplotlib"] = None
                    chart_info["chart_error_matplotlib"] = chart_results_dict.get("matplotlib_error")
            charts.append(chart_info)
        
        response_data = {
            "file_id": file_id,  # CRITICAL: Always return file_id
            "summary_json": summary_json,
            "summary_text": summary_text,
            "personas": personas if instruction is None else [first_persona],
            "selected_persona": first_persona,
            "goals": goals,
            "charts": charts,
            "approach": approach,
            "columns": columns 
        }

        print(f"Returning response with file_id: {response_data['file_id']}")
        return response_data
    except Exception as e:
        print(f"Error in two_agent_flow: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)



@app.post("/two_agent_query/")
async def two_agent_query(
    file_id: str = Form(...),
    instruction: str = Form(...),
    gemini_api_key: str = Form("")
):
    try:
        if file_id not in uploaded_files_storage:
            return JSONResponse(status_code=404, content={"error": "File not found. Upload the file first."})
        file_data = uploaded_files_storage[file_id]
        df = file_data["dataframe"]

        # --- Analysis agent ---

        summary_json, summary_text = summarize_json_and_sentence(df, gemini_api_key)
        columns = list(df.columns)
        from goal import generate_goals_from_queries
        query_list = [q.strip() for q in instruction.replace('\n', ',').split(',') if q.strip()]
        goals = generate_goals_from_queries(summary_json, query_list, gemini_api_key)
        personas = generate_personas(summary_json, gemini_api_key, n=1)
        first_persona = personas[0] if personas else {"persona": "agent", "rationale": "Default persona"}
        approach = "agent_query_with_instruction"

        # --- Visualization agent ---

        charts = []
        from chart_spec import GeminiChartSpecClient
        from preprocess import ChartDataPreprocessor
        from chart_generator import ChartGenerator
        import plotly.utils, json, io, base64, matplotlib.pyplot as plt
        chart_spec_client = GeminiChartSpecClient(gemini_api_key)
        chart_gen = ChartGenerator()
        for goal in goals:
            chart_spec_result = chart_spec_client.generate_chart_spec(columns, goal["question"])
            chart_spec_result = chart_spec_client.validate_chart_spec(chart_spec_result, columns)
            preprocessor = ChartDataPreprocessor(df)
            processed_df, error = preprocessor.process_for_chart(chart_spec_result)
            processed_data = processed_df.to_dict(orient='records') if processed_df is not None else None
            chart_info = {
                "goal": goal,
                "chart_spec": chart_spec_result,
                "preprocess_error": error,
            }
            if not error:
                chart_results_dict = chart_gen.generate_chart(processed_df, chart_spec_result)
                if chart_results_dict.get("plotly") is not None and chart_results_dict.get("plotly_error") is None:
                    plotly_json_str = plotly.utils.PlotlyJSONEncoder().encode(chart_results_dict["plotly"])
                    plotly_json_str = plotly_json_str.replace("NaN", "null").replace("Infinity", "null").replace("-Infinity", "null")
                    chart_json = json.loads(plotly_json_str)
                    chart_info["chart_data_plotly"] = chart_json
                    chart_info["chart_error_plotly"] = None
                else:
                    chart_info["chart_data_plotly"] = None
                    chart_info["chart_error_plotly"] = chart_results_dict.get("plotly_error")
                if chart_info["chart_data_plotly"] is None and chart_results_dict.get("matplotlib") is not None and chart_results_dict.get("matplotlib_error") is None:
                    img_buffer = io.BytesIO()
                    chart_results_dict["matplotlib"].savefig(img_buffer, format='png', bbox_inches='tight', dpi=150)
                    img_buffer.seek(0)
                    img_base64 = base64.b64encode(img_buffer.getvalue()).decode()
                    chart_info["chart_data_matplotlib"] = f"data:image/png;base64,{img_base64}"
                    plt.close(chart_results_dict["matplotlib"])
                    chart_info["chart_error_matplotlib"] = None
                else:
                    chart_info["chart_data_matplotlib"] = None
                    chart_info["chart_error_matplotlib"] = chart_results_dict.get("matplotlib_error")
            charts.append(chart_info)

        return {
            "file_id": file_id,
            "filename": file_data["filename"],
            "summary_json": summary_json,
            "summary_text": summary_text,
            "personas": [first_persona],
            "selected_persona": first_persona,
            "goals": goals,
            "charts": charts,
            "approach": approach,
            "columns": columns 
        }
    
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

