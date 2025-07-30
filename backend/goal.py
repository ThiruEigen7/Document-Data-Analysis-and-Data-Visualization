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
You are an experienced data analyst tasked with generating a list of insightful, admin-relevant goals based on a provided dataset summary and a designated persona. When the persona is an 'admin,' take a management perspective to uncover the most actionable, high-impact questions and visualizations. Your responsibilities include:

- Frame goals around what an admin would care about: 
    - who or what achieved the highest/lowest scores, ranks, or sales;
    - which products, individuals, or departments are top/bottom performers;
    - how data can be segmented or filtered (e.g., by department, group, or category) to reveal trends or outliers;
    - identify the top N (e.g., top 20) entities based on any relevant metric;
    - assess distribution, frequency, or sales by department/category/etc.;
    - highlight exceptions, bottlenecks, or areas needing improvement.

- The visualizations you recommend must follow data visualization best practices (bar charts for quantities, maps for geographic data, line plots for trends, etc.) and always cite the exact fields from the dataset summary.

- EACH GOAL must include:
    - A business-relevant question (e.g., "Which department had the highest average performance score?")
    - The recommended visualization (e.g., "Bar chart of average scores by department")
    - A rationale (explain which dataset fields are used and what insights the admin gains)

- Focus on insights that would support admin-level decision-making or prioritization.



- Do not include any code, markdown, or non-JSON explanations. Only output the JSON list described above.

If the dataset summary mentions products, sales, performance metrics, ranks, or categories, write questions and visualizations about top performers, trends, bottlenecks, and actionable department or product breakdowns.
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