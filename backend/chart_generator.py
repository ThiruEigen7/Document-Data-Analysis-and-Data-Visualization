import matplotlib.pyplot as plt
import matplotlib.style as mplstyle
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, Tuple
import logging

logger = logging.getLogger("chart_generator")
logging.basicConfig(level=logging.INFO)

plt.style.use('default')

class ChartGenerator:
    def __init__(self, figure_size=(8, 5), dpi=100):
        self.figure_size = figure_size
        self.dpi = dpi

    def generate_chart(self, data: pd.DataFrame, chart_specs: Dict[str, Any], save_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Try to generate chart with Plotly first (for interactivity). If Plotly fails, fall back to Matplotlib.
        Returns a dict with both results and errors for the caller to choose.
        """
        chart_type = chart_specs.get("chart")
        x_col = chart_specs.get("x")
        y_col = chart_specs.get("y")
        result = {}
        # Try Plotly first
        try:
            fig_plotly, error_plotly = self._generate_plotly_chart(data, chart_type, x_col, y_col, save_path)
            if fig_plotly is not None and error_plotly is None:
                result["plotly"] = fig_plotly
                result["plotly_error"] = None
            else:
                result["plotly"] = None
                result["plotly_error"] = error_plotly
        except Exception as e:
            logger.error(f"Plotly chart generation failed: {str(e)}")
            result["plotly"] = None
            result["plotly_error"] = str(e)
        # If Plotly failed, try Matplotlib
        try:
            fig_matplotlib, error_matplotlib = self._generate_matplotlib_chart(data, chart_type, x_col, y_col, save_path)
            if fig_matplotlib is not None and error_matplotlib is None:
                result["matplotlib"] = fig_matplotlib
                result["matplotlib_error"] = None
            else:
                result["matplotlib"] = None
                result["matplotlib_error"] = error_matplotlib
        except Exception as e:
            logger.error(f"Matplotlib chart generation failed: {str(e)}")
            result["matplotlib"] = None
            result["matplotlib_error"] = str(e)
        return result

    def _generate_matplotlib_chart(self, data: pd.DataFrame, chart_type: str, x_col: str, y_col: Optional[str], save_path: Optional[str] = None) -> Tuple[Optional[plt.Figure], Optional[str]]:
        try:
            fig, ax = plt.subplots(figsize=self.figure_size, dpi=self.dpi)
            if chart_type == "bar":
                if y_col:
                    ax.bar(data[x_col], data[y_col])
                    ax.set_ylabel(y_col.replace("_", " ").title())
                else:
                    value_counts = data[x_col].value_counts()
                    ax.bar(value_counts.index, value_counts.values)
                    ax.set_ylabel("Count")
                ax.set_xlabel(x_col.replace("_", " ").title())
                ax.tick_params(axis='x', rotation=45)
            elif chart_type == "pie":
                if y_col:
                    pie_data = data.groupby(x_col)[y_col].sum()
                else:
                    pie_data = data[x_col].value_counts()
                wedges, texts, autotexts = ax.pie(pie_data.values, labels=pie_data.index, autopct='%1.1f%%', startangle=90)
                ax.set_aspect('equal')
            elif chart_type == "scatter":
                if not y_col:
                    return None, "Scatter plot requires both x and y columns"
                ax.scatter(data[x_col], data[y_col], alpha=0.6)
                ax.set_xlabel(x_col.replace("_", " ").title())
                ax.set_ylabel(y_col.replace("_", " ").title())
            elif chart_type == "histogram":
                ax.hist(data[x_col], bins=20, alpha=0.7, edgecolor='black')
                ax.set_xlabel(x_col.replace("_", " ").title())
                ax.set_ylabel("Frequency")
            elif chart_type == "line":
                if not y_col:
                    return None, "Line plot requires both x and y columns"
                sorted_data = data.sort_values(x_col)
                ax.plot(sorted_data[x_col], sorted_data[y_col], marker='o')
                ax.set_xlabel(x_col.replace("_", " ").title())
                ax.set_ylabel(y_col.replace("_", " ").title())
            elif chart_type == "box" or chart_type == "boxplot":
                if y_col:
                    unique_categories = data[x_col].unique()
                    box_data = [data[data[x_col] == cat][y_col].dropna() for cat in unique_categories]
                    ax.boxplot(box_data, labels=unique_categories)
                    ax.set_xlabel(x_col.replace("_", " ").title())
                    ax.set_ylabel(y_col.replace("_", " ").title())
                    ax.tick_params(axis='x', rotation=45)
                else:
                    ax.boxplot(data[x_col].dropna())
                    ax.set_ylabel(x_col.replace("_", " ").title())
                    ax.set_xticklabels([x_col.replace("_", " ").title()])
            elif chart_type == "violin":
                if y_col:
                    unique_categories = data[x_col].unique()
                    violin_data = [data[data[x_col] == cat][y_col].dropna() for cat in unique_categories]
                    parts = ax.violinplot(violin_data, positions=range(1, len(unique_categories) + 1))
                    ax.set_xticks(range(1, len(unique_categories) + 1))
                    ax.set_xticklabels(unique_categories, rotation=45)
                    ax.set_xlabel(x_col.replace("_", " ").title())
                    ax.set_ylabel(y_col.replace("_", " ").title())
                else:
                    return None, "Violin plot requires both x and y columns"
            elif chart_type == "area":
                if not y_col:
                    return None, "Area plot requires both x and y columns"
                sorted_data = data.sort_values(x_col)
                ax.fill_between(sorted_data[x_col], sorted_data[y_col], alpha=0.7)
                ax.set_xlabel(x_col.replace("_", " ").title())
                ax.set_ylabel(y_col.replace("_", " ").title())
            elif chart_type == "heatmap":
                numeric_cols = data.select_dtypes(include=[np.number]).columns
                if len(numeric_cols) < 2:
                    return None, "Heatmap requires at least 2 numeric columns"
                correlation_matrix = data[numeric_cols].corr()
                im = ax.imshow(correlation_matrix, cmap='coolwarm', aspect='auto')
                ax.set_xticks(range(len(correlation_matrix.columns)))
                ax.set_yticks(range(len(correlation_matrix.columns)))
                ax.set_xticklabels(correlation_matrix.columns, rotation=45)
                ax.set_yticklabels(correlation_matrix.columns)
                plt.colorbar(im, ax=ax)
                for i in range(len(correlation_matrix.columns)):
                    for j in range(len(correlation_matrix.columns)):
                        text = ax.text(j, i, f'{correlation_matrix.iloc[i, j]:.2f}', ha="center", va="center", color="black")
            else:
                return None, f"Unsupported chart type: {chart_type}"
            title = self._generate_chart_title(chart_type, x_col, y_col)
            ax.set_title(title, fontsize=14, fontweight='bold')
            plt.tight_layout()
            if save_path:
                plt.savefig(save_path, bbox_inches='tight', dpi=self.dpi)
                logger.info(f"Chart saved to: {save_path}")
            return fig, None
        except Exception as e:
            logger.error(f"Matplotlib chart generation failed: {str(e)}")
            return None, str(e)

    def _generate_plotly_chart(self, data: pd.DataFrame, chart_type: str, x_col: str, y_col: Optional[str], save_path: Optional[str] = None) -> Tuple[Optional[go.Figure], Optional[str]]:
        try:
            if chart_type == "bar":
                if y_col:
                    fig = px.bar(data, x=x_col, y=y_col)
                else:
                    value_counts = data[x_col].value_counts()
                    fig = px.bar(x=value_counts.index, y=value_counts.values)
                    fig.update_layout(yaxis_title="Count")
            elif chart_type == "pie":
                if y_col:
                    pie_data = data.groupby(x_col)[y_col].sum().reset_index()
                    fig = px.pie(pie_data, values=y_col, names=x_col)
                else:
                    value_counts = data[x_col].value_counts().reset_index()
                    value_counts.columns = [x_col, 'count']
                    fig = px.pie(value_counts, values='count', names=x_col)
            elif chart_type == "scatter":
                if not y_col:
                    return None, "Scatter plot requires both x and y columns"
                fig = px.scatter(data, x=x_col, y=y_col)
            elif chart_type == "histogram":
                fig = px.histogram(data, x=x_col, nbins=20)
            elif chart_type == "line":
                if not y_col:
                    return None, "Line plot requires both x and y columns"
                sorted_data = data.sort_values(x_col)
                fig = px.line(sorted_data, x=x_col, y=y_col, markers=True)
            elif chart_type == "box" or chart_type == "boxplot":
                if y_col:
                    fig = px.box(data, x=x_col, y=y_col)
                else:
                    fig = px.box(data, y=x_col)
            elif chart_type == "violin":
                if not y_col:
                    return None, "Violin plot requires both x and y columns"
                fig = px.violin(data, x=x_col, y=y_col, box=True)
            elif chart_type == "area":
                if not y_col:
                    return None, "Area plot requires both x and y columns"
                sorted_data = data.sort_values(x_col)
                fig = px.area(sorted_data, x=x_col, y=y_col)
            elif chart_type == "heatmap":
                numeric_cols = data.select_dtypes(include=[np.number]).columns
                if len(numeric_cols) < 2:
                    return None, "Heatmap requires at least 2 numeric columns"
                correlation_matrix = data[numeric_cols].corr()
                fig = px.imshow(correlation_matrix, text_auto=True, aspect="auto", color_continuous_scale='RdBu_r')
            elif chart_type == "sunburst":
                if not y_col:
                    return None, "Sunburst chart requires both x and y columns"
                fig = px.sunburst(data, path=[x_col], values=y_col)
            elif chart_type == "treemap":
                if not y_col:
                    return None, "Treemap requires both x and y columns"
                fig = px.treemap(data, path=[x_col], values=y_col)
            elif chart_type == "funnel":
                if not y_col:
                    return None, "Funnel chart requires both x and y columns"
                fig = px.funnel(data, x=y_col, y=x_col)
            elif chart_type == "density":
                if y_col:
                    fig = px.density_contour(data, x=x_col, y=y_col)
                else:
                    fig = px.histogram(data, x=x_col, marginal="rug", histnorm="density")
            else:
                return None, f"Unsupported chart type: {chart_type}"
            title = self._generate_chart_title(chart_type, x_col, y_col)
            fig.update_layout(
                title=title,
                title_font_size=16,
                xaxis_title=x_col.replace("_", " ").title(),
                yaxis_title=y_col.replace("_", " ").title() if y_col else "Count"
            )
            if save_path:
                if save_path.endswith('.html'):
                    fig.write_html(save_path)
                else:
                    fig.write_image(save_path)
                logger.info(f"Chart saved to: {save_path}")
            return fig, None
        except Exception as e:
            logger.error(f"Plotly chart generation failed: {str(e)}")
            return None, str(e)

    def _generate_chart_title(self, chart_type: str, x_col: str, y_col: Optional[str]) -> str:
        x_title = x_col.replace("_", " ").title()
        if chart_type == "histogram":
            return f"Distribution of {x_title}"
        elif chart_type == "bar":
            if y_col:
                y_title = y_col.replace("_", " ").title()
                return f"{y_title} by {x_title}"
            else:
                return f"Count by {x_title}"
        elif chart_type == "scatter":
            y_title = y_col.replace("_", " ").title() if y_col else "Y"
            return f"{y_title} vs {x_title}"
        elif chart_type == "line":
            y_title = y_col.replace("_", " ").title() if y_col else "Y"
            return f"{y_title} vs {x_title}"
        else:
            return f"{chart_type.title()} Chart"

    def display_chart(self, fig, library: str = "matplotlib"):
        try:
            if library == "matplotlib":
                plt.show()
            elif library == "plotly":
                fig.show()
        except Exception as e:
            logger.error(f"Failed to display chart: {str(e)}")

    def generate_and_display_chart_from_file(dataset_path: str, chart_spec: dict, library: str = "matplotlib", encoding: str = 'utf-8', save_path: Optional[str] = None):
        """
        Utility function to generate and display a chart from a dataset file and chart_spec.
        Reads the dataset, preprocesses it, and generates the chart using ChartGenerator.
        """
        from preprocess import ChartDataPreprocessor
        
        df = pd.read_csv(dataset_path, encoding=encoding)
        preprocessor = ChartDataPreprocessor(df)
        processed_df, error = preprocessor.process_for_chart(chart_spec)
        if error:
            return None, f"Preprocessing error: {error}"
        gen = ChartGenerator()
        fig, chart_error = gen.generate_chart(processed_df, chart_spec, library=library, save_path=save_path)
        if chart_error:
            return None, f"Chart generation error: {chart_error}"
        gen.display_chart(fig, library=library)
        return fig, None

# Global chart generator instance
chart_generator = ChartGenerator()
