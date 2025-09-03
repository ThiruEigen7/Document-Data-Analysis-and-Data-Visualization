import pandas as pd
import plotly.express as px
import re

import json


# Gemini now provides a structured JSON spec for the chart.
class DataVisualizer:
    def __init__(self, dataset_path: str, chart_spec_json: str):
        self.dataset_path = dataset_path
        self.chart_spec = json.loads(chart_spec_json)
        self.df = self._load_dataset()

    def _load_dataset(self) -> pd.DataFrame:
        if self.dataset_path.endswith('.csv'):
            return pd.read_csv(self.dataset_path, encoding='latin1')
        elif self.dataset_path.endswith(('.xls', '.xlsx')):
            return pd.read_excel(self.dataset_path)
        else:
            raise ValueError("Unsupported file type.")


    def create_visualization(self, title: str) -> str:
        chart_type = self.chart_spec.get('chart_type')
        columns = self.chart_spec.get('columns', [])
        aggregation = self.chart_spec.get('aggregation')

        fig = None

        if chart_type in ['grouped_bar', 'stacked_bar', 'bar']:
            if len(columns) < 2:
                raise ValueError("Bar charts require at least two columns: [numeric, category].")
            # Always treat first column as numeric (y), second as category (x)
            numeric_col = columns[0]
            category_col = columns[1]
            # Coerce numeric_col to numeric
            self.df[numeric_col] = pd.to_numeric(self.df[numeric_col], errors='coerce')
            if not pd.api.types.is_numeric_dtype(self.df[numeric_col]):
                raise ValueError(f"Column '{numeric_col}' must be numeric for bar chart y-axis.")
            # Allow category_col to be string or numeric (e.g., Year, Department)
            # Only enforce numeric_col is numeric
            # Drop rows where numeric_col is NaN after coercion
            df_valid = self.df.dropna(subset=[numeric_col])
            if aggregation:
                data_to_plot = df_valid.groupby(category_col)[numeric_col].agg(aggregation).reset_index()
            else:
                data_to_plot = df_valid[[category_col, numeric_col]]
            # For grouped/stacked bar, melt if more than one value col
            if chart_type in ['grouped_bar', 'stacked_bar'] and len(columns) > 2:
                value_cols = columns[:-1]
                # Coerce all value_cols to numeric
                for col in value_cols:
                    df_valid[col] = pd.to_numeric(df_valid[col], errors='coerce')
                    if not pd.api.types.is_numeric_dtype(df_valid[col]):
                        raise ValueError(f"Column '{col}' must be numeric for aggregation '{aggregation}'.")
                data_subset = df_valid[[category_col] + value_cols]
                data_to_plot = data_subset.groupby(category_col).agg(aggregation or 'sum').reset_index()
                melted_df = data_to_plot.melt(id_vars=category_col, value_vars=value_cols, var_name='Metric', value_name='Value')
                barmode = 'group' if chart_type == 'grouped_bar' else 'stack'
                fig = px.bar(melted_df, x=category_col, y='Value', color='Metric', barmode=barmode, title=title)
            else:
                fig = px.bar(data_to_plot, x=category_col, y=numeric_col, title=title)

        elif chart_type == 'pie':
            if len(columns) < 2:
                raise ValueError("Pie charts require at least two columns.")
            values_col, names_col = columns[0], columns[1]
            if aggregation:
                if not pd.api.types.is_numeric_dtype(self.df[values_col]):
                    raise ValueError(f"Column '{values_col}' must be numeric for aggregation '{aggregation}'.")
                data_to_plot = self.df.groupby(names_col)[values_col].agg(aggregation).reset_index()
            else:
                data_to_plot = self.df[[names_col, values_col]]
            fig = px.pie(data_to_plot, names=names_col, values=values_col, title=title)
      
        elif chart_type == 'scatter':
            if len(columns) < 2:
                raise ValueError("Scatter plots require at least two columns.")
            x_col, y_col = columns[0], columns[1]
            if not pd.api.types.is_numeric_dtype(self.df[x_col]) or not pd.api.types.is_numeric_dtype(self.df[y_col]):
                raise ValueError(f"Scatter plot columns must be numeric: '{x_col}', '{y_col}'")
            fig = px.scatter(self.df, x=x_col, y=y_col, title=title)

        elif chart_type == 'box':
            y_col = columns[0]
            x_col = columns[1] if len(columns) > 1 else None
            if not pd.api.types.is_numeric_dtype(self.df[y_col]):
                raise ValueError(f"Box plot y column must be numeric: '{y_col}'")
            fig = px.box(self.df, x=x_col, y=y_col, title=title)
        
        else:
            raise ValueError(f"Chart generation logic not implemented for: {chart_type}")        
        return fig.to_json()


def generate_chart_json(dataset_path: str, chart_spec_json: str, title: str) -> str:
    print("--- ✅ SUCCESS: Running the LATEST version of v.py with Gemini JSON spec parsing. ---")
    visualizer = DataVisualizer(dataset_path, chart_spec_json)
    return visualizer.create_visualization(title)