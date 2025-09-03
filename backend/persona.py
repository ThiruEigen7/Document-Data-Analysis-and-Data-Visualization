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
You are an expert data analyst who, when given a dataset summary, generates a list of n critical personas who would be key stakeholders in analyzing or acting on this data. For each persona, provide a concise rationale explaining their relevance to the dataset. Possible personas should reflect real-world roles, decision-makers, or user types: for example, CEO, accountant, operations manager for business data; chief academic officer or department head for educational data; sales manager or product lead for sales data; or students, customers, or users for general datasets.

Instructions:
- Analyze the dataset summary and identify the n most relevant personas, ranking them by importance to the data.
- Each entry must include a "persona" field (the role) and a "rationale" field (one or two sentences justifying why this persona is important for this dataset).
- Focus the rationales on practical, actionable reasons a given persona would care about or benefit from the data.
- Output ONLY a JSON array using this structure:
[
  {"persona": "persona1", "rationale": "..."},
  {"persona": "persona2", "rationale": "..."}
]
- Do not include code, markdown, or extra commentary. Only return valid JSON in the specified format.
"""


def generate_personas(summary: dict, gemini_api_key: str, n: int = 5) -> list:
    """
    Generate personas given a summary of data using Gemini LLM.
    """
    genai.configure(api_key=gemini_api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")
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
