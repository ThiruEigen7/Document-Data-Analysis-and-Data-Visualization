from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
import pandas as pd
import tempfile
import os
from summarizer import summarize_json_and_sentence
from persona import generate_personas
from goal import generate_goals
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(
    title="DataViz AI Manager API",
    description="Endpoints for LLM-powered data analysis, persona, and goals.",
    version="1.0.0",
)


import os
# Enable CORS for any origin (safe for development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, restrict to your frontend domain!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key = ""


@app.post("/analyze/")
async def analyze_dataset(
    file: UploadFile = File(...),
    gemini_api_key: str = Form(default=api_key),
    n_personas: int = Form(5),
    n_goals: int = Form(5)
):
    """Main endpoint: Receives CSV file and returns summary, personas, and goals."""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as temp_file:
            temp_file.write(await file.read())
            temp_file_path = temp_file.name
        
        df = pd.read_csv(temp_file_path, encoding='latin1')
        summary_json, summary_text = summarize_json_and_sentence(df, gemini_api_key)
        personas = generate_personas(summary_json, gemini_api_key, n=n_personas)
        first_persona = personas[0] if personas else {"persona": None, "rationale": ""}
        goals = generate_goals(summary_json, first_persona, gemini_api_key, n=n_goals)
        
        os.remove(temp_file_path)  # Clean up
        
        return {
            "summary_json": summary_json,
            "summary_text": summary_text,
            "personas": personas,
            "selected_persona": first_persona,
            "goals": goals,
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

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
    gemini_api_key: str = Form(default=api_key),
    n: int = Form(5)
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
    gemini_api_key: str = Form(default=api_key),
    n: int = Form(5)
):
    """Given summary JSON and persona, return goals."""
    try:
        goals = generate_goals(summary_json, persona, gemini_api_key, n=n)
        return {"goals": goals}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# To run:
# uvicorn <this_filename>:app --reload

