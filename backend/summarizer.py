import json
import logging
import pandas as pd
import numpy as np
import warnings
import re
from typing import Union

# file import
from backend.helper import clean_column_names



# logging setup
logger = logging.getLogger("data_summarizer")
logging.basicConfig(level=logging.INFO)





#  read various file types convert into pandas DataFrame
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

        #If it has fewer unique values → "category"
        #Else → "string"
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

        # Add sample values and uniqueness count
        non_null_values = df[column][df[column].notnull()].unique()
        sample_count = min(n_samples, len(non_null_values))
        samples = pd.Series(non_null_values).sample(sample_count, random_state=42).tolist()

        properties.update({
            "samples": samples,
            "num_unique_values": df[column].nunique(),
            "semantic_type": "",    # Placeholder for LLM enrichment
            "description": ""       # Placeholder for LLM enrichment
        })

        properties_list.append({"column": column, "properties": properties})


    return properties_list




def enrich_with_llm(base_summary: dict) -> dict:
    """
    Simulated LLM enrichment.
    Replace this function with your LLM API call to enrich descriptions and semantic types.
    """
    logger.info("Simulating LLM enrichment of summary")
    for field in base_summary.get("fields", []):
        col = field["column"]
        # Dummy semantic types and descriptions (for demonstration)
        field["properties"]["semantic_type"] = "string" if field["properties"]["dtype"] == "string" else "number"
        field["properties"]["description"] = f"This is a simulated description for column '{col}'."
    base_summary["dataset_description"] = "Simulated dataset description by LLM."
    return base_summary


def summarize(self, data: Union[pd.DataFrame, str], 
                  summary_method: str = "default",
                  n_samples: int = 3,
                  encoding: str = 'utf-8') -> dict:
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
            enriched = self.enrich_with_llm(base_summary)
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
    # Example: create a simple DataFrame to test
    data = pd.DataFrame({
        "Name": ["Alice", "Bob", "Charlie", "David"],
        "Age": [25, 32, 37, 29],
        "Sales": [100.5, 200.0, 150.75, 300.3],
        "JoinDate": pd.to_datetime(["2020-01-01","2019-05-15","2018-07-23","2021-02-10"]),
        "Active": [True, False, True, True]
    })

    summarizer = Summarizer()

    # Basic summary without LLM enrichment
    summary_default = summarizer.summarize(data)
    print("Default Summary (no LLM enrichment):")
    print(json.dumps(summary_default, indent=2, default=str), "\n")

    # Summary with simulated LLM enrichment
    summary_llm = summarizer.summarize(data, summary_method="llm")
    print("LLM Enriched Summary (simulated):")
    print(json.dumps(summary_llm, indent=2, default=str), "\n")

    # Summary with just column names
    summary_columns = summarizer.summarize(data, summary_method="columns")
    print("Summary with Column Names Only:")
    print(json.dumps(summary_columns, indent=2, default=str), "\n")