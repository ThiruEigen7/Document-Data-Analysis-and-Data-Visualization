import json
import logging
import google.generativeai as genai
import os
import sys
from persona import generate_personas
from summarizer import summarize_json_and_sentence
import pandas as pd

logger = logging.getLogger("goal_agent")
logging.basicConfig(level=logging.INFO)

SYSTEM_INSTRUCTIONS = """
You are an experienced data analyst who can generate a given number of insightful GOALS about data, when given a summary of the data, and a specified persona. The VISUALIZATIONS YOU RECOMMEND MUST FOLLOW VISUALIZATION BEST PRACTICES (e.g., must use bar charts instead of pie charts for comparing quantities) AND BE MEANINGFUL (e.g., plot longitude and latitude on maps where appropriate). They must also be relevant to the specified persona. Each goal must include a question, a visualization (THE VISUALIZATION MUST REFERENCE THE EXACT COLUMN FIELDS FROM THE SUMMARY), and a rationale (JUSTIFICATION FOR WHICH dataset FIELDS ARE USED and what we will learn from the visualization). Each goal MUST mention the exact fields from the dataset summary above.
"""

FORMAT_INSTRUCTIONS = """
THE OUTPUT MUST BE A VALID LIST OF JSON OBJECTS. IT MUST USE THE FOLLOWING FORMAT:
[
    { "index": 0,  "question": "What is the distribution of X", "visualization": "histogram of X", "rationale": "This tells about ..."},
    ...
]
THE OUTPUT SHOULD ONLY USE THE JSON FORMAT ABOVE.
"""

def generate_goals(summary: dict, persona: dict, gemini_api_key: str, n: int = 5) -> list:
    """
    Generate goals given a summary of data and a persona using Gemini LLM.
    """
    genai.configure(api_key=gemini_api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")
    user_prompt = f"""
    The number of GOALS to generate is {n}. The goals should be based on the data summary below.
    {json.dumps(summary, default=str)}

    The generated goals SHOULD BE FOCUSED ON THE INTERESTS AND PERSPECTIVE of a '{persona['persona']}' persona, who is interested in complex, insightful goals about the data.
    """
    prompt = f"{SYSTEM_INSTRUCTIONS}\n{user_prompt}\n{FORMAT_INSTRUCTIONS}"
    response = model.generate_content(prompt)
    raw_text = response.text.strip()
    if raw_text.startswith('```json'):
        raw_text = raw_text[7:]
    if raw_text.startswith('```'):
        raw_text = raw_text[3:]
    raw_text = raw_text.strip('`').strip()
    try:
        goals = json.loads(raw_text)
        if isinstance(goals, dict):
            goals = [goals]
    except Exception as e:
        logger.error(f"Gemini did not return valid JSON: {response.text}")
        raise ValueError(f"Gemini did not return valid JSON: {response.text}")
    return goals

if __name__ == "__main__":
    pass  # Output is now handled in manager.py