import json
import logging
import google.generativeai as genai
import os
import sys
from persona import generate_personas
from summarizer import summarize_json_and_sentence
import pandas as pd
import numpy as np

logger = logging.getLogger("goal_agent")
logging.basicConfig(level=logging.INFO)


SYSTEM_INSTRUCTIONS = """
You are an experienced data analyst tasked with generating a list of simple, admin-relevant goals based on a provided dataset summary and a designated persona. When the persona is an 'admin,' take a management perspective to uncover the most actionable, high-impact questions. Your responsibilities include:

- Generate only simple or intermediate single-line goals using only 2 columns at a time, phrased as direct instructions or questions. Example: "Which department has the highest average rating?", "List top 10 students by rating", "How does contest participation vary by year?", etc.
- Use a variety of natural, concise question or instruction forms (e.g., 'Which...', 'How many...', 'List top 10...', 'Compare...', 'Find...', etc.).
- Avoid complex multi-level breakdowns, nested groupings, or verbose explanations.
- For each goal, suggest the most suitable chart type for visualization (e.g., bar, line, pie, scatter, box, histogram, violin etc.) based on the nature of the question and data. Do NOT always use bar charts; vary chart types appropriately.
- The output for each goal must include:
    - index: a unique integer for the goal
    - question: a single, direct line (see above for examples)
    - rationale: a brief explanation of what insight this goal provides
    - suggested_chart: the recommended chart type for this goal (e.g., 'bar', 'line', 'pie', 'scatter', etc.)
- Do not include any code, markdown, or non-JSON explanations. Only output the JSON list described above.
"""


FORMAT_INSTRUCTIONS = """
THE OUTPUT MUST BE A VALID LIST OF JSON OBJECTS. IT MUST USE THE FOLLOWING FORMAT:
[
    {
      "index": 0,
      "question": "Which department has the highest average rating?",
      "rationale": "Helps identify the top-performing department based on average rating.",
      "suggested_chart": "bar"
    },
    {
      "index": 1,
      "question": "List top 10 students by contest rating",
      "rationale": "Highlights the highest-achieving students in competitive programming.",
      "suggested_chart": "scatter"
    },
    {
      "index": 2,
      "question": "How does contest participation vary by year?",
      "rationale": "Shows trends in student engagement across academic years.",
      "suggested_chart": "line"
    }
]
THE OUTPUT SHOULD ONLY USE THE JSON FORMAT ABOVE.
"""

def sanitize_for_json(obj):
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(v) for v in obj]
    elif isinstance(obj, float):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return obj
    return obj

def generate_goals(summary: dict, persona: dict, gemini_api_key: str, n: int = 5) -> list:
    """
    Generate goals given a summary of data and a persona using Gemini LLM.
    """
    genai.configure(api_key=gemini_api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")
    sanitized_summary = sanitize_for_json(summary)
    user_prompt = f"""
    The number of GOALS to generate is {n}. The goals should be based on the data summary below.
    {json.dumps(sanitized_summary, default=str)}

    The generated goals SHOULD BE FOCUSED ON THE INTERESTS AND PERSPECTIVE of a '{persona['persona']}' persona, who is interested in actionable, simple goals about the data.
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

    # Post-process: filter only valid goals with index, question, rationale
    valid_goals = []
    for goal in goals:
        if all(k in goal for k in ("index", "question", "rationale")):
            valid_goals.append(goal)
    if not valid_goals:
        logger.error(f"Gemini did not return any valid goals with index, question, rationale. Full response: {response.text}")
        raise ValueError(f"Gemini did not return any valid goals with index, question, rationale. Full response: {response.text}")
    return valid_goals

if __name__ == "__main__":
    pass