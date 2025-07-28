import json
import logging
import google.generativeai as genai
import os
import sys
from summarizer import summarize_json_and_sentence
import pandas as pd
logger = logging.getLogger("data_summarizer")
logging.basicConfig(level=logging.INFO)

system_prompt = """
You are an experienced data analyst who can take a dataset summary and generate a list of n personas (e.g., ceo or accountant for finance related data, economist for population or gdp related data, doctors for health data, or just users) that might be critical stakeholders in exploring some data and describe rationale for why they are critical. The personas should be prioritized based on their relevance to the data. Think step by step.
Your response should be perfect JSON in the following format:
[{"persona": "persona1", "rationale": "..."},{"persona": "persona2", "rationale": "..."}]
"""

def generate_personas(summary: dict, gemini_api_key: str, n: int = 5) -> list:
    """
    Generate personas given a summary of data using Gemini LLM.
    """
    genai.configure(api_key=gemini_api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")
    user_prompt = f"""
    The number of PERSONAs to generate is {n}. Generate {n} personas in the right format given the data summary below.
    {json.dumps(summary, default=str)}
    """
    prompt = f"{system_prompt}\n{user_prompt}"
    response = model.generate_content(prompt)
    raw_text = response.text.strip()

    if raw_text.startswith('```json'):
        raw_text = raw_text[7:]
    if raw_text.startswith('```'):
        raw_text = raw_text[3:]
    raw_text = raw_text.strip('`').strip()
    try:
        personas = json.loads(raw_text)
        if isinstance(personas, dict):
            personas = [personas]
    except Exception as e:
        logger.error(f"Gemini did not return valid JSON: {response.text}")
        raise ValueError(f"Gemini did not return valid JSON: {response.text}")
    return personas


if __name__ == "__main__":
    pass  # Output is now handled in manager.py
