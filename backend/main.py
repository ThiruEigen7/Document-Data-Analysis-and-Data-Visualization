from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
import pandas as pd
import tempfile
import os
from summarizer import summarize_json_and_sentence, get_column_names
from persona import generate_personas
from goal import generate_goals
from goal import generate_goals_from_queries
from fastapi.middleware.cors import CORSMiddleware
import json
import io
import base64
import matplotlib.pyplot as plt
import plotly.utils
from typing import Optional

app = FastAPI(
    title="DataViz AI Manager API",
    description="Endpoints for LLM-powered data analysis, persona, and goals.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key = "AIzaSyCS0wuvPw4jHoheqHHuWdstsVAsSbxoMTg"

# In-memory storage for uploaded files (in production, use proper database/file storage)
uploaded_files_storage = {}

def generate_charts_from_goals(df, goals, gemini_api_key):
    """Generate charts based on goals - shared functionality"""
    from chart_spec import GeminiChartSpecClient
    from preprocess import ChartDataPreprocessor
    from chart_generator import ChartGenerator
    
    chart_spec_client = GeminiChartSpecClient(gemini_api_key)
    chart_gen = ChartGenerator()
    columns = get_column_names(df)
    chart_results = []
    
    for goal in goals:
        # Generate chart spec for this goal
        chart_spec = chart_spec_client.generate_chart_spec(columns, goal["question"])
        chart_spec = chart_spec_client.validate_chart_spec(chart_spec, columns)
        
        # Preprocess data
        preprocessor = ChartDataPreprocessor(df)
        processed_df, error = preprocessor.process_for_chart(chart_spec)
        
        chart_info = {
            "goal": goal,
            "chart_spec": chart_spec,
            "preprocess_error": error,
        }
        
        if not error:
            # Sanitize processed_df for NaN/inf before chart generation
            processed_df = processed_df.replace([float('nan'), float('inf'), float('-inf')], None)
            
            # Generate chart
            chart_results_dict = chart_gen.generate_chart(processed_df, chart_spec)
            
            # Handle Plotly result
            if chart_results_dict.get("plotly") is not None and chart_results_dict.get("plotly_error") is None:
                plotly_json_str = plotly.utils.PlotlyJSONEncoder().encode(chart_results_dict["plotly"])
                plotly_json_str = plotly_json_str.replace("NaN", "null").replace("Infinity", "null").replace("-Infinity", "null")
                chart_json = json.loads(plotly_json_str)
                chart_info["chart_data_plotly"] = chart_json
                chart_info["chart_error_plotly"] = None
            else:
                chart_info["chart_data_plotly"] = None
                chart_info["chart_error_plotly"] = chart_results_dict.get("plotly_error")
                print(f"Plotly error: {chart_results_dict.get('plotly_error')}")
            
            # Handle Matplotlib result (only if Plotly failed)
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
                if chart_info["chart_data_matplotlib"] is None:
                    print(f"Matplotlib error: {chart_results_dict.get('matplotlib_error')}")
        
        chart_results.append(chart_info)
    
    return chart_results

@app.post("/analyze/")
async def analyze_dataset(
    file: UploadFile = File(...),
    queries: Optional[str] = Form(None),  # Optional queries parameter
    gemini_api_key: str = Form(default=api_key),
    n_personas: int = Form(5),
    n_goals: int = Form(5)
):
    """
    Approach 1: User uploads file and optionally provides queries at the same time
    Workflow: read_csv -> (if no queries: summarizer->personas->goals) -> (if queries: goals with queries) -> generate_chart
    """
    temp_file_path = ""
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as temp_file:
            temp_file.write(await file.read())
            temp_file_path = temp_file.name
        
        # Read CSV
        df = pd.read_csv(temp_file_path, encoding='latin1')
        
        # Store file for future use (Approach 2)
        file_id = f"file_{len(uploaded_files_storage)}"
        uploaded_files_storage[file_id] = {
            "filename": file.filename,
            "dataframe": df.copy(),
            "uploaded_at": pd.Timestamp.now().isoformat()
        }
        
        # Get summary for both approaches
        summary_json, summary_text = summarize_json_and_sentence(df, gemini_api_key)
        
        if queries:
            # Approach 1b: Queries provided with file
            # Parse queries (assuming comma-separated or newline-separated)
            query_list = [q.strip() for q in queries.replace('\n', ',').split(',') if q.strip()]
            
            # Generate goals directly from queries
            goals = generate_goals_from_queries(summary_json, query_list, gemini_api_key)
            
            # Use first persona as default
            personas = generate_personas(summary_json, gemini_api_key, n=1)
            first_persona = personas[0] if personas else {"persona": "admin", "rationale": "Default admin persona"}
        else:
            # Approach 1a: No queries provided (current implementation)
            personas = generate_personas(summary_json, gemini_api_key, n=n_personas)
            first_persona = personas[0] if personas else {"persona": "admin", "rationale": "Default admin persona"}
            goals = generate_goals(summary_json, first_persona, gemini_api_key, n=n_goals)
        
        # Generate charts
        chart_results = generate_charts_from_goals(df, goals, gemini_api_key)
        
        return {
            "file_id": file_id,  # Return file_id for future queries
            "summary_json": summary_json,
            "summary_text": summary_text,
            "personas": personas if not queries else [first_persona],
            "selected_persona": first_persona,
            "goals": goals,
            "charts": chart_results,
            "approach": "upload_with_queries" if queries else "upload_only"
        }
        
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@app.post("/analyze_existing/")
async def analyze_existing_file(
    file_id: str = Form(...),
    queries: str = Form(...),  # Required queries parameter
    gemini_api_key: str = Form(default=api_key)
):
    """
    Approach 2: Files were already uploaded in previous chat, user only asks queries
    Workflow: retrieve_file -> goals(with queries) -> generate_chart -> validate -> process_chart -> generate_chart
    """
    try:
        # Check if file exists in storage
        if file_id not in uploaded_files_storage:
            return JSONResponse(status_code=404, content={"error": "File not found. Please upload the file first."})
        
        # Get stored file data
        file_data = uploaded_files_storage[file_id]
        df = file_data["dataframe"]
        
        # Get summary (could be cached in future)
        summary_json, summary_text = summarize_json_and_sentence(df, gemini_api_key)
        
        # Parse queries
        query_list = [q.strip() for q in queries.replace('\n', ',').split(',') if q.strip()]
        
        # Generate goals directly from queries
        goals = generate_goals_from_queries(summary_json, query_list, gemini_api_key)
        
        # Generate charts
        chart_results = generate_charts_from_goals(df, goals, gemini_api_key)
        
        return {
            "file_id": file_id,
            "filename": file_data["filename"],
            "summary_json": summary_json,
            "summary_text": summary_text,
            "goals": goals,
            "charts": chart_results,
            "approach": "existing_file_with_queries"
        }
        
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/list_files/")
async def list_uploaded_files():
    """List all uploaded files available for analysis"""
    files_info = {}
    for file_id, file_data in uploaded_files_storage.items():
        files_info[file_id] = {
            "filename": file_data["filename"],
            "uploaded_at": file_data["uploaded_at"],
            "rows": len(file_data["dataframe"]),
            "columns": list(file_data["dataframe"].columns)
        }
    return {"files": files_info}

@app.delete("/delete_file/{file_id}")
async def delete_uploaded_file(file_id: str):
    """Delete an uploaded file from storage"""
    if file_id in uploaded_files_storage:
        del uploaded_files_storage[file_id]
        return {"message": f"File {file_id} deleted successfully"}
    else:
        return JSONResponse(status_code=404, content={"error": "File not found"})

@app.post("/summarize/")
async def summarize_only(
    file: UploadFile = File(...),
    gemini_api_key: str = Form(default=api_key),
):
    """Just returns the summary."""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as temp_file:
            temp_file.write(await file.read())
            temp_file_path = temp_file.name

        df = pd.read_csv(temp_file_path, encoding='latin1')
        summary_json, summary_text = summarize_json_and_sentence(df, gemini_api_key)
        os.remove(temp_file_path)
        return {"summary_json": summary_json, "summary_text": summary_text}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/personas/")
async def personas_only(
    summary_json: dict,
    gemini_api_key: str = api_key,
    n: int = 5
):
    """Given a summary JSON, return personas."""
    try:
        personas = generate_personas(summary_json, gemini_api_key, n=n)
        return {"personas": personas}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/goals/")
async def goals_only(
    summary_json: dict,
    persona: dict,
    gemini_api_key: str = api_key,
    n: int = 5
):
    """Given summary JSON and persona, return goals."""
    try:
        goals = generate_goals(summary_json, persona, gemini_api_key, n=n)
        return {"goals": goals}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# To run:
# uvicorn <this_filename>:app --reload

