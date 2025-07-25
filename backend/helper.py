
import re
import pandas as pd
import logging



# Clean a column name by replacing invalid characters with underscores
def clean_column_name(col_name: str) -> str:
    """Clean a column name by replacing invalid characters with underscores."""

    return re.sub(r'[^0-9a-zA-Z_]', '_', col_name)



def clean_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """Return a copy of dataframe with cleaned column names."""

    cleaned_df = df.copy()
    cleaned_df.columns = [clean_column_name(col) for col in df.columns]
    return cleaned_df