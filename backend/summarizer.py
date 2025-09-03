import json
import logging
import pandas as pd
import numpy as np
import warnings
import re
from typing import Union
import google.generativeai as genai
import sys
import os
from helper import clean_column_names

sys.path.append(os.path.dirname(os.path.abspath(__file__)))



logger = logging.getLogger("data_summarizer")
logging.basicConfig(level=logging.INFO)

system_prompt = """
You are an experienced data analyst that can annotate datasets. Your instructions are as follows:
i) ALWAYS generate the name of the dataset and the dataset_description
ii) ALWAYS generate a field description.
iii.) ALWAYS generate a semantic_type (a single word) for each field given its values e.g. company, city, number, supplier, location, gender, longitude, latitude, url, ip address, zip code, email, etc
You must return an updated JSON dictionary without any preamble or explanation.
"""

def read_dataframe(file_location: str, encoding: str = 'utf-8') -> pd.DataFrame:
    """Read a data file into a cleaned pandas DataFrame with sampling if large."""
    file_extension = file_location.split('.')[-1].lower()

    read_funcs = {
        'json': lambda: pd.read_json(file_location, orient='records', encoding=encoding),
        'csv': lambda: pd.read_csv(file_location, encoding=encoding),
        'xls': lambda: pd.read_excel(file_location, encoding=encoding),
        'xlsx': lambda: pd.read_excel(file_location, encoding=encoding),
        'parquet': pd.read_parquet,
        'feather': pd.read_feather,
        'tsv': lambda: pd.read_csv(file_location, sep="\t", encoding=encoding)
    }

    if file_extension not in read_funcs:
        raise ValueError(f"Unsupported file type: {file_extension}")

    df = read_funcs[file_extension]() # Read the file into a DataFrame by calling the appropriate function
    cleaned_df = clean_column_names(df) # Clean the column names

    if len(cleaned_df) > 4500:
        logger.info("Dataframe > 4500 rows, sampling 4500 rows")
        cleaned_df = cleaned_df.sample(4500, random_state=42)

    return cleaned_df


# Check and convert data types
def check_type(dtype: str, value):
    if "float" in str(dtype):
        return float(value)
    elif "int" in str(dtype):
        return int(value)
    else:
        return value


def get_column_properties(df: pd.DataFrame, n_samples: int = 3) -> list:
    properties_list = []
    for column in df.columns:
        dtype = df[column].dtype
        properties = {}

        # Determine semantic dtype and stats
        if pd.api.types.is_numeric_dtype(dtype):
            properties["dtype"] = "number"
            properties["std"] = check_type(dtype, df[column].std())
            properties["min"] = check_type(dtype, df[column].min())
            properties["max"] = check_type(dtype, df[column].max())


        elif pd.api.types.is_bool_dtype(dtype):
            properties["dtype"] = "boolean"

        elif pd.api.types.is_datetime64_any_dtype(dtype):
            properties["dtype"] = "date"
            properties["min"] = df[column].min()
            properties["max"] = df[column].max()


        elif pd.api.types.is_categorical_dtype(dtype):
            properties["dtype"] = "category"

        
        else:
            # Could be string or object
            try:
                pd.to_datetime(df[column], errors='raise')
                properties["dtype"] = "date"
            except:
                if df[column].nunique() / len(df[column]) < 0.5:
                    properties["dtype"] = "category"
                else:
                    properties["dtype"] = "string"

        
        non_null_values = df[column][df[column].notnull()].unique()
        sample_count = min(n_samples, len(non_null_values))
        samples = pd.Series(non_null_values).sample(sample_count, random_state=42).tolist()

        properties.update({
            "samples": samples,
            "num_unique_values": df[column].nunique(),
            "semantic_type": "",    
            "description": ""       
        })

        properties_list.append({"column": column, "properties": properties})


    return properties_list





# Gemini LLM enrichment
def enrich_with_llm(base_summary: dict, gemini_api_key: str) -> dict:
    """
    Enrich the data summary using Gemini API.
    """
    genai.configure(api_key=gemini_api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")
    prompt = f"""{system_prompt}\nAnnotate the dictionary below. Only return a JSON object.\n{json.dumps(base_summary, default=str)}\nRespond in compact JSON, no markdown, no code block, no explanation, and keep the response to 10 lines minimum."""
    response = model.generate_content(prompt)
    enriched_summary = base_summary
    # Remove markdown/code block if present
    raw_text = response.text.strip()
    if raw_text.startswith('```json'):
        raw_text = raw_text[7:]
    if raw_text.startswith('```'):
        raw_text = raw_text[3:]
    raw_text = raw_text.strip('`').strip()
    try:
        enriched_summary = json.loads(raw_text)
    except Exception as e:
        error_msg = f"Gemini did not return valid JSON: {response.text}"
        logger.error(error_msg)
        raise ValueError(error_msg)
    return enriched_summary

def summarize_json_and_sentence(data: Union[pd.DataFrame, str], gemini_api_key: str, n_samples: int = 3, encoding: str = 'utf-8'):
    # If string, assume file path
    if isinstance(data, str):
        df = read_dataframe(data, encoding=encoding)
        file_name = data.split("/")[-1]
    elif isinstance(data, pd.DataFrame):
        df = data.copy()
        file_name = "DataFrame"
    else:
        raise ValueError("`data` must be a pandas DataFrame or a file path string")

    fields_properties = get_column_properties(df, n_samples)
    base_summary = {
        "name": file_name,
        "file_name": file_name,
        "dataset_description": "",
        "fields": fields_properties,
        "field_names": df.columns.tolist()
    }
    # Get enriched JSON summary
    enriched_json = enrich_with_llm(base_summary, gemini_api_key)

    # Generate sentence summary using LLM and the enriched JSON
    genai.configure(api_key=gemini_api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")
    summary_prompt = f"""
    You are a senior business analyst. Your goal is to help a team set actionable goals based on the dataset. Given the following JSON summary, write a detailed, insightful summary in 5 distinct lines. Each line should:
    1. State a key fact or insight about the dataset.
    2. Suggest a possible business goal, action, or recommendation based on that insight.
    3. Avoid repeating information; make each line unique and relevant.
    Only output the summary, no code, no markdown, no JSON.
    JSON:
    {json.dumps(enriched_json, default=str)}
    """
    summary_response = model.generate_content(summary_prompt)
    summary_text = summary_response.text.strip()
    return enriched_json, summary_text



def summarize(self, data: Union[pd.DataFrame, str], 
                  summary_method: str = "default",
                  n_samples: int = 3,
                  encoding: str = 'utf-8',
                  gemini_api_key: str = None) -> dict:
        # If string, assume file path
        if isinstance(data, str):
            df = read_dataframe(data, encoding=encoding)
            file_name = data.split("/")[-1]
        elif isinstance(data, pd.DataFrame):
            df = data.copy()
            file_name = "DataFrame"
        else:
            raise ValueError("`data` must be a pandas DataFrame or a file path string")

        # Get columns properties
        fields_properties = self.get_column_properties(df, n_samples)

        base_summary = {
            "name": file_name,
            "file_name": file_name,
            "dataset_description": "",
            "fields": fields_properties,
            "field_names": df.columns.tolist()
        }

        if summary_method == "llm":
            if not gemini_api_key:
                raise ValueError("Gemini API key must be provided for LLM enrichment.")
            enriched = enrich_with_llm(base_summary, gemini_api_key)
            return enriched
        elif summary_method == "columns":
            # Return very basic summary with just columns
            return {
                "name": file_name,
                "file_name": file_name,
                "dataset_description": "",
                "field_names": df.columns.tolist()
            }
        else:
            # default summary includes column metadata without enrichment
            return base_summary


# --- Example Test Code ---

if __name__ == "__main__":
    pass  # Output is now handled in manager.py