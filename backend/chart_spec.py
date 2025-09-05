import json
import logging
from typing import List, Dict, Any, Optional
import google.generativeai as genai

logger = logging.getLogger("chart_spec")
logging.basicConfig(level=logging.INFO)

class GeminiChartSpecClient:
    """Client for generating and validating chart specifications using Gemini LLM."""
    def __init__(self, gemini_api_key: str):
        self.api_key = gemini_api_key
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel("gemini-2.5-flash")

    @staticmethod
    def get_columns_from_summary(summary: Dict[str, Any]) -> List[str]:
        if 'field_names' in summary:
            return summary['field_names']
        elif 'fields' in summary:
            return [f['column'] for f in summary['fields'] if 'column' in f]
        else:
            raise ValueError("No columns found in summary.")

    def generate_chart_spec(self, columns: list, goal_question: str) -> Dict[str, Any]:
        columns_str = ", ".join(columns)
        prompt = f"""
You are a data visualization expert. Given the following dataset columns:
{columns_str}

And the following user goal:
"{goal_question}"

Your task:
- Determine the best chart type (choose from: bar, scatter, histogram, line, pie, box, violin, area, heatmap).
- Determine which columns should be used as x-axis and y-axis.
- If the goal requires aggregation (e.g., average, sum), include that in the output.
- If the goal mentions sorting (e.g., 'sorted by', 'order by'), include the sort column and direction.
- If the goal asks for specific columns only (e.g., 'show brand only'), specify which columns to display.
- Always respond in valid JSON format, with no additional text, following this structure:
{{
  "chart": "bar",
  "x": "brand",
  "y": "price",
  "agg": "mean",
  "sort_by": "engine_size",
  "sort_order": "desc",
  "columns_only": ["brand"]
}}

Important data type rules:
- "chart", "x", "y", "agg", "sort_by", "sort_order" must be strings (not arrays)
- "columns_only" must be an array of strings
- Use null for optional fields, not empty strings
- Only use column names that exist in the dataset: {columns_str}
- "agg" can be: mean, sum, count, median, or null if not needed.
- "sort_by" should be a column name, "sort_order" can be "asc" or "desc".
- For histogram charts, only specify "x" column, "y" should be null.
- For scatter plots, both "x" and "y" are required.
- If the goal is unclear or cannot be fulfilled, respond with:
{{"error": "Cannot determine appropriate chart type or columns for this data goal"}}

Respond with JSON only."""
        response = self.model.generate_content(prompt)
        raw_text = response.text.strip()
        if raw_text.startswith('```json'):
            raw_text = raw_text[7:]
        if raw_text.startswith('```'):
            raw_text = raw_text[3:]
        raw_text = raw_text.strip('`').strip()
        try:
            chart_spec = json.loads(raw_text)
        except Exception:
            logger.error(f"Gemini did not return valid JSON: {raw_text}")
            raise ValueError(f"Gemini did not return valid JSON: {raw_text}")
        return chart_spec

    @staticmethod
    def validate_chart_spec(chart_spec: Dict[str, Any], columns: List[str]) -> Dict[str, Any]:
        """
        Validate the chart spec from Gemini.
        Returns the validated result or an error dict.
        """
        if "error" in chart_spec:
            return chart_spec

        # Convert arrays to strings for single-value fields
        for field in ["chart", "x", "y", "agg", "sort_by", "sort_order"]:
            if field in chart_spec and isinstance(chart_spec[field], list):
                if len(chart_spec[field]) > 0:
                    chart_spec[field] = chart_spec[field][0]
                else:
                    chart_spec[field] = None

        # Ensure columns_only is always an array
        if "columns_only" in chart_spec and isinstance(chart_spec["columns_only"], str):
            chart_spec["columns_only"] = [chart_spec["columns_only"]]

        # Validate required fields
        if "chart" not in chart_spec:
            return {"error": "Missing chart type in response"}

        valid_charts = ["bar", "scatter", "histogram", "line", "pie", "box", "violin", "area", "heatmap"]
        if chart_spec["chart"] not in valid_charts:
            return {"error": f"Invalid chart type: {chart_spec['chart']}"}

        # Validate columns exist in dataset
        if "x" in chart_spec and chart_spec["x"] and chart_spec["x"] not in columns:
            return {"error": f"Column '{chart_spec['x']}' not found in dataset"}

        if "y" in chart_spec and chart_spec["y"] and chart_spec["y"] not in columns:
            return {"error": f"Column '{chart_spec['y']}' not found in dataset"}

        # Validate aggregation method
        if "agg" in chart_spec and chart_spec["agg"]:
            valid_agg = ["mean", "sum", "count", "median", "max", "min"]
            if chart_spec["agg"] not in valid_agg:
                return {"error": f"Invalid aggregation method: {chart_spec['agg']}"}

        # Validate sort column
        if "sort_by" in chart_spec and chart_spec["sort_by"]:
            sort_col = chart_spec["sort_by"]
            if isinstance(sort_col, list):
                if sort_col:
                    chart_spec["sort_by"] = sort_col[0]
                    sort_col = sort_col[0]
                else:
                    chart_spec["sort_by"] = None
                    sort_col = None
            if sort_col and sort_col not in columns:
                return {"error": f"Sort column '{sort_col}' not found in dataset"}

        # Validate sort order
        if "sort_order" in chart_spec and chart_spec["sort_order"]:
            valid_orders = ["asc", "desc", "ascending", "descending"]
            if chart_spec["sort_order"].lower() not in valid_orders:
                chart_spec["sort_order"] = "asc"

        # Validate columns_only
        if "columns_only" in chart_spec and chart_spec["columns_only"]:
            if not isinstance(chart_spec["columns_only"], list):
                return {"error": "columns_only must be a list"}
            invalid_cols = [col for col in chart_spec["columns_only"] if col not in columns]
            if invalid_cols:
                return {"error": f"Columns not found: {invalid_cols}"}

        return chart_spec

    def generate_chart_specs_for_goals(self, goals: list, columns: list) -> list:
        """
        For a list of goals, generate and validate chart specs for each goal's question.
        Returns a list of dicts: {**goal, 'chart_spec': chart_spec}
        """
        results = []
        for goal in goals:
            question = goal.get("question")
            if not question:
                results.append({**goal, "chart_spec": {"error": "No question in goal"}})
                continue
            try:
                chart_spec = self.generate_chart_spec(columns, question)
                validated = self.validate_chart_spec(chart_spec, columns)
                results.append({**goal, "chart_spec": validated})
            except Exception as e:
                results.append({**goal, "chart_spec": {"error": str(e)}})
        return results