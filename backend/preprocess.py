import pandas as pd
import numpy as np
import logging
from typing import Dict, Any, Optional, Tuple, List

logger = logging.getLogger("chart_preprocess")
logging.basicConfig(level=logging.INFO)

class ChartDataPreprocessor:
    """Preprocesses a DataFrame according to a chart spec JSON from LLM."""
    def __init__(self, df: pd.DataFrame):
        self.df = df.copy()
        self.columns = self.df.columns.tolist()

    def process_for_chart(self, chart_spec: Dict[str, Any]) -> Tuple[Optional[pd.DataFrame], Optional[str]]:
        x_col = chart_spec.get("x")
        y_col = chart_spec.get("y")
        agg_method = chart_spec.get("agg")
        sort_by = chart_spec.get("sort_by")
        sort_order = chart_spec.get("sort_order", "asc")
        columns_only = chart_spec.get("columns_only")

        sort_by_col = sort_by[0] if isinstance(sort_by, list) and sort_by else sort_by

        processed_df = self.df.copy()

        # Apply column filtering if specified
        if columns_only:
            if sort_by_col and sort_by_col not in columns_only:
                columns_only.append(sort_by_col)
            valid_columns = [col for col in columns_only if col in self.columns]
            if valid_columns:
                processed_df = processed_df[valid_columns]
            else:
                return None, f"None of the requested columns {columns_only} exist in the dataset"

        # Remove rows with missing values in required columns
        required_cols = [col for col in [x_col, y_col] if col is not None]
        if required_cols:
            processed_df = processed_df.dropna(subset=required_cols)

        # Apply aggregation if specified
        if agg_method and x_col and y_col:
            processed_df = self._apply_aggregation(processed_df, x_col, y_col, agg_method)

        # Apply sorting if specified
        if sort_by_col:
            if sort_by_col in processed_df.columns:
                ascending = sort_order.lower() == "asc"
                processed_df = processed_df.sort_values(by=sort_by_col, ascending=ascending)
                logger.info(f"Applied sorting by {sort_by_col} ({sort_order})")
            else:
                logger.warning(f"Sort column '{sort_by_col}' not found in processed dataframe")

        # Apply limit if specified
        limit = chart_spec.get("limit")
        if limit is not None:
            try:
                limit = int(limit)
                processed_df = processed_df.head(limit)
                logger.info(f"Applied row limit: {limit}")
            except Exception as e:
                logger.warning(f"Invalid limit value: {chart_spec.get('limit')}")

        return processed_df, None

    def _apply_aggregation(self, df: pd.DataFrame, x_col: str, y_col: str, agg_method: str) -> pd.DataFrame:
        try:
            if agg_method == "count":
                result = df.groupby(x_col).size().reset_index(name=y_col)
            else:
                agg_func = {
                    "mean": "mean",
                    "sum": "sum",
                    "median": "median",
                    "max": "max",
                    "min": "min"
                }.get(agg_method, "mean")
                result = df.groupby(x_col)[y_col].agg(agg_func).reset_index()
            logger.info(f"Applied {agg_method} aggregation: {len(result)} groups")
            return result
        except Exception as e:
            logger.error(f"Aggregation failed: {str(e)}")
            return df

# Utility function to preprocess data given a dataset path and chart_spec

def preprocess_dataset_with_chart_spec(dataset_path: str, chart_spec: dict, encoding: str = 'utf-8'):
    """
    Reads a dataset from file, preprocesses it according to the chart_spec, and returns the processed DataFrame and error (if any).
    Usage: Call this from your API or orchestrator after generating chart_spec.
    """
    import pandas as pd
    df = pd.read_csv(dataset_path, encoding=encoding)
    preprocessor = ChartDataPreprocessor(df)
    return preprocessor.process_for_chart(chart_spec)
