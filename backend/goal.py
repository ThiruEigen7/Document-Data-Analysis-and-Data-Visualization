import json
import logging
import google.generativeai as genai
import os
import sys

logger = logging.getLogger("goal_agent")
logging.basicConfig(level=logging.INFO)


SYSTEM_INSTRUCTIONS = """
You are a data analysis assistant that STRICTLY generates simple, two-column visualization goals.

Your single most important rule is that EVERY goal you create MUST use EXACTLY TWO columns from the dataset: one NUMERIC column and one CATEGORICAL column. Your purpose is to help an admin make quick, clear comparisons between categories.

---
**RULES:**

1.  **Strictly Two Columns:** Every goal must use exactly two columns. NO EXCEPTIONS.
    -   GOOD: "Bar chart of average ContestRating by Department" (Uses 'ContestRating' and 'Department').
    -   BAD: "Bar chart of ContestRating and Total by Department" (This uses three columns and is too complex).

2.  **One Numeric, One Categorical:** You must pair one column with numbers (like 'ContestRating', 'Total', 'Sales', 'Score') with one column that has categories or groups (like 'Department', 'Year', 'ProductType', 'Section').

3.  **Simple Visualizations:** Only suggest basic chart types.
    -   Use 'bar' for comparing quantities across categories.
    -   Use 'box' for showing distribution across categories.
    -   Use 'pie' for showing parts of a whole.
    -   Do NOT suggest complex charts like stacked bars, grouped bars, multi-axis charts, or 3D charts.

4.  **Fill the `chart_spec`:** For each goal, you must create a `chart_spec` object with the two chosen columns, the simple chart type, and the aggregation ('mean', 'sum', 'count', or null).

---
**EACH GOAL MUST INCLUDE:**
- A business-relevant question (e.g., "Which department has the highest average performance score?")
- The recommended visualization (e.g., "Bar chart of average scores by department")
- A rationale (explain which two fields are used and what the admin learns)
- A structured `chart_spec` object (as described in the rules).

Do not include any code, markdown, or non-JSON explanations. Only output the final JSON list.
"""

# ==============================================================================
#  END OF MODIFIED PROMPT
# ==============================================================================

FORMAT_INSTRUCTIONS = """
THE OUTPUT MUST BE A VALID LIST OF JSON OBJECTS. IT MUST USE THE FOLLOWING FORMAT:
[
    {
      "index": 0,
      "question": "Which department has the highest average ContestRating?",
      "visualization": "Bar chart of average 'ContestRating' by 'Department'",
      "rationale": "Uses the 'ContestRating' and 'Department' fields to find the top-performing department based on average rating.",
      "chart_spec": {
        "chart_type": "bar",
        "columns": ["ContestRating", "Department"],
        "aggregation": "mean"
      }
    },
    ...
]
THE OUTPUT SHOULD ONLY USE THE JSON FORMAT ABOVE.
"""

def generate_goals(summary: dict, persona: dict, gemini_api_key: str, n: int = 5) -> list:
    """
    Generate goals given a summary of data and a persona using Gemini LLM.
    """
    genai.configure(api_key=gemini_api_key)
    model = genai.GenerativeModel("gemini-pro") # Using gemini-pro can sometimes yield better compliance
    
    # --- MODIFICATION: Removed the word "complex" from the user prompt ---
    user_prompt = f"""
    The number of GOALS to generate is {n}. The goals should be based on the data summary below.
    {json.dumps(summary, default=str)}

    The generated goals SHOULD BE FOCUSED ON THE PERSPECTIVE of a '{persona['persona']}' persona, who needs clear and simple insights about the data.
    """
    
    prompt = f"{SYSTEM_INSTRUCTIONS}\n{user_prompt}\n{FORMAT_INSTRUCTIONS}"
    
    try:
        response = model.generate_content(prompt)
        raw_text = response.text.strip()
    except Exception as e:
        logger.error(f"Error calling Gemini API: {e}")
        # Fallback to a simpler model if the main one fails
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            raw_text = response.text.strip()
        except Exception as fallback_e:
            logger.error(f"Fallback Gemini model also failed: {fallback_e}")
            raise ValueError(f"Both Gemini models failed. Last error: {fallback_e}")


    # Clean the response text to extract only the JSON
    if '```json' in raw_text:
        raw_text = raw_text.split('```json')[1]
    if '```' in raw_text:
        raw_text = raw_text.split('```')[0]
    raw_text = raw_text.strip()

    try:
        goals = json.loads(raw_text)
        if isinstance(goals, dict): # Handle cases where it returns a single object instead of a list
            goals = [goals]
    except json.JSONDecodeError as e:
        logger.error(f"Gemini did not return valid JSON. Error: {e}\nRaw Text:\n{raw_text}")
        raise ValueError(f"Gemini did not return valid JSON. Full response text: {response.text}")

    # Post-process: filter only valid goals with chart_spec and exactly 2 columns
    valid_goals = []
    for goal in goals:
        chart_spec = goal.get("chart_spec")
        if not chart_spec or not isinstance(chart_spec, dict):
            continue
        
        columns = chart_spec.get("columns", [])
        if isinstance(columns, list) and len(columns) == 2:
            valid_goals.append(goal)

    if not valid_goals:
        logger.error(f"Gemini did not return any valid goals with chart_spec and 2 columns. Full response: {response.text}")
        raise ValueError(f"Gemini did not return any valid goals with chart_spec and 2 columns. Full response: {response.text}")

    return valid_goals

if __name__ == "__main__":
    # You can add test code here if needed
    pass