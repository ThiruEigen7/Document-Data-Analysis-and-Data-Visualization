# DataViz-Agent Project Documentation

## Project Overview
DataViz-Agent is an AI-powered data visualization platform designed to automate the process of analyzing tabular datasets and generating insightful charts. It leverages Large Language Models (LLMs) to summarize data, identify key personas, generate analytical goals, and produce chart specifications, all accessible via a modern web interface. The project is suitable for business intelligence, analytics, and decision support scenarios.

## Tech Stack

### Frontend
- **Framework:** React (TypeScript)
- **UI Libraries:** Tailwind CSS, Lucide Icons
- **Charting:** Plotly.js (via `react-plotly.js`), Matplotlib (images from backend)
- **Build Tool:** Vite

### Backend
- **Framework:** FastAPI (Python)
- **AI/LLM:** Google Gemini (via LangChain, Google Generative AI SDK)
- **Data Processing:** Pandas, NumPy
- **Charting:** Plotly, Matplotlib

## Workflow & Architecture

### 1. File Upload & Data Ingestion
- Users upload CSV datasets via the frontend.
- The file is sent to the backend, where it is read and processed using Pandas.

### 2. Data Summarization
- The backend uses Gemini LLM to generate both a JSON and textual summary of the dataset (`summarizer.py`).
- Summaries are used to inform subsequent steps.

### 3. Persona & Goal Generation
- **Persona:** Gemini LLM generates a ranked list of personas (stakeholders) relevant to the dataset (`persona.py`).
- **Goals:** For each persona, Gemini LLM generates analytical goals/questions and suggests chart types (`goal.py`).

### 4. Chart Specification & Generation
- For each goal, the LLM produces a chart specification (type, axes, aggregation, etc.) (`chart_spec.py`).
- The backend preprocesses the data as per the spec (`preprocess.py`).
- Charts are generated using Plotly (interactive) and Matplotlib (static image fallback) (`chart_generator.py`).
- Errors and results from both libraries are returned for robust visualization.

### 5. Frontend Visualization
- The frontend displays summaries, personas, goals, and generated charts.
- Interactive charts use Plotly; static images use Matplotlib.
- Users can download processed data and charts.

## Key Modules & Their Roles

### Backend
- `app.py`: Main FastAPI app, defines LLM-powered tools for summarization, persona, and goal generation.
- `summarizer.py`: Summarizes datasets using Gemini.
- `persona.py`: Generates personas using Gemini.
- `goal.py`: Generates analytical goals using Gemini.
- `chart_spec.py`: Produces chart specifications from goals.
- `preprocess.py`: Preprocesses data for charting (filtering, aggregation, sorting).
- `chart_generator.py`: Generates charts using Plotly and Matplotlib, handles errors and fallbacks.
- `helper.py`: Cleans column names and assists with data hygiene.

### Frontend
- `App.tsx`: Main app shell, manages state and layout.
- `MainContent.tsx`: Handles file upload, chat, and main workflow.
- `UnifiedChartDisplay.tsx`: Displays charts (Plotly or Matplotlib image) and handles errors.
- Other components: Sidebar, Header, DataTable, FileUploader, etc.

## API Endpoints & Data Flow
- File upload: `/upload` (backend receives CSV)
- Summarization: `/summarize` (LLM summary)
- Persona: `/persona` (LLM personas)
- Goals: `/goals` (LLM goals)
- Chart spec: `/chart_spec` (LLM chart instructions)
- Chart generation: `/generate_chart` (returns chart data/images)

## Deployment & Environment
- **Backend:** Python 3.10+, install dependencies from `requirements.txt`. Requires Gemini API key (Google Generative AI).
- **Frontend:** Node.js 18+, install dependencies via `npm install`. Build and run with Vite.
- **Environment:** .env file for API keys and config.

## End-to-End Flow (Interview Talking Points)
1. **User uploads a dataset** via the web UI.
2. **Backend summarizes the data** using Gemini LLM.
3. **Personas and goals are generated** for targeted analysis.
4. **Chart specs are created** for each goal.
5. **Data is preprocessed** and charts are generated (Plotly/Matplotlib).
6. **Frontend displays results**: summaries, personas, goals, and charts.
7. **User can interact, download, and explore** insights.

## ServiceNow Interview Summary
- Demonstrates full-stack AI integration: React frontend, FastAPI backend, LLM-powered analytics.
- Robust charting: interactive (Plotly) and static (Matplotlib) with error handling.
- Modular, extensible codebase: clear separation of concerns, easy to add new chart types or LLM models.
- Real-world workflow: file upload, persona-driven analysis, automated charting, and user-friendly UI.
- Ready for deployment in analytics, BI, or decision support environments.

## Detailed Backend-Frontend Workflow & Agent Architecture

### Agent Workflow (LangGraph React Agent)
- The backend is architected as an agent workflow using LangGraph's React Agent pattern.
- Each step (summarization, persona generation, goal creation, chart spec, preprocessing, chart generation) is modular and can be invoked as a tool in the agent graph.
- This enables flexible orchestration, error handling, and chaining of LLM-powered tasks, making the system extensible and robust for future automation.

### Backend to Frontend Data Flow
1. **File Upload:**
   - User uploads a CSV file via the React frontend.
   - The file is sent to the FastAPI backend, where it is read into a Pandas DataFrame.

2. **Summarization & Persona/Goal Generation:**
   - The backend agent invokes Gemini LLM to summarize the dataset and generate personas and goals.
   - Each step is a node/tool in the LangGraph agent workflow, allowing for dynamic branching and error recovery.

3. **Chart Specification & Preprocessing:**
   - For each goal, the agent generates a chart specification (type, axes, aggregation, etc.).
   - The `preprocess.py` module processes the DataFrame according to the chart spec:
     - **Column filtering:** Only relevant columns are selected.
     - **Missing value removal:** Ensures clean data for charting.
     - **Aggregation:** Supports count, mean, sum, median, max, min (via groupby).
     - **Sorting & limiting:** Sorts data and limits rows for clarity.
   - This preprocessing ensures that the chart receives data in the exact format required for visualization, reducing errors and improving chart quality.

4. **Chart Generation (Plotly & Matplotlib):**
   - The backend attempts to generate charts using Plotly first (for interactivity). If Plotly fails, it falls back to Matplotlib (static image).
   - **Plotly:**
     - Uses `plotly.express` and `plotly.graph_objects` to create charts (bar, pie, scatter, line, box, violin, area, heatmap, etc.).
     - The chart is converted to a JSON/dict using `fig.to_dict()` or `fig.to_json()`.
     - This JSON is sent to the frontend for rendering.
   - **Matplotlib:**
     - Generates a static image (base64-encoded) for fallback or download.

5. **Frontend Visualization (React + react-plotly.js):**
   - The frontend receives the chart data from the backend.
   - If the chart data is a string (base64 image), it displays it as an `<img>`.
   - If the chart data is a Plotly JSON object, it uses the `react-plotly.js` library to render the chart interactively:
     - The `Plot` component receives `data` and `layout` from the backend's Plotly output.
     - Custom styles, colors, and interactivity are applied for a modern user experience.
   - Users can view, interact with, and download charts and processed data.

### Preprocessing Module (`preprocess.py`)
- Central to the agent workflow, this module ensures that only clean, relevant, and well-aggregated data is passed to the chart generator.
- Handles column selection, missing value removal, aggregation, sorting, and limiting.
- Reduces chart errors and improves the quality of insights.

### Plotly & Frontend Visualization
- **Plotly (Backend):**
  - Flexible, supports many chart types, highly customizable.
  - Output is JSON, making it easy to send to the frontend.
- **react-plotly.js (Frontend):**
  - Renders Plotly charts interactively in React.
  - Receives `data` and `layout` from backend, applies custom styles.
  - Enables zoom, pan, export, and other interactive features.

### Agent Architecture Benefits
- Modular, extensible, and robust.
- Each step is a tool/node in the agent graph, allowing for easy addition of new features (e.g., new chart types, new LLM models).
- Error handling and fallback logic are built-in.
- Enables end-to-end automation for data analysis and visualization.

---
This documentation provides a comprehensive overview for technical interviews, architecture reviews, and onboarding.
