from langchain.tools import tool
from langgraph.prebuilt import create_react_agent
import json
from summarizer import summarize_json_and_sentence
from persona import generate_personas
from goal import generate_goals
from prompts.prompt import system_prompts
import google.generativeai as genai
from dotenv import load_dotenv
import os
from langchain.chat_models import init_chat_model
import getpass
import pandas as pd

load_dotenv()  
gemini_api_key = "AIzaSyCBXSe8pxIimui8POudzQ6wicw2-qQjrVI" 



#model = init_chat_model("gemini-2.5-flash", model_provider="google_genai")
#llm = genai.GenerativeModel("gemini-1.5-flash")
llm = init_chat_model("gemini-1.5-flash",model_provider= "google_genai")

@tool
def summarize_data(dataset_path: str, gemini_api_key: str) -> str:
    """
    Summarize the data using Gemini LLM.
    """
    dataset = pd.read_csv(dataset_path, encoding='latin1')
    summary_json, summary_text = summarize_json_and_sentence(dataset, gemini_api_key)
    # Return both JSON and text summary as a tuple string
    return json.dumps({
        "json_summary": summary_json,
        "text_summary": summary_text
    }, indent=2)

@tool
def persona(data_summary_json: str, gemini_api_key: str, n: int = 5) -> str:
    """
    Generate personas based on the data summary.
    """
    summary = json.loads(data_summary_json)
    # If wrapped in {"json_summary": ..., "text_summary": ...}, extract json_summary
    if "json_summary" in summary:
        summary = summary["json_summary"]
    personas = generate_personas(summary, gemini_api_key, n=n)
    output = []
    for i, persona in enumerate(personas, 1):
        output.append(f"{i}. Persona: {persona['persona']}\n   Rationale: {persona['rationale']}\n")
    return "\n".join(output)

@tool
def goals(data_summary_json: str, persona: str, gemini_api_key: str, n: int = 5) -> str:
    """
    Generate goals based on the data summary and persona.
    """
    summary = json.loads(data_summary_json)
    # If wrapped in {"json_summary": ..., "text_summary": ...}, extract json_summary
    if "json_summary" in summary:
        summary = summary["json_summary"]
    persona_dict = {"persona": persona, "rationale": ""}
    goals = generate_goals(summary, persona_dict, gemini_api_key, n=n)
    output = []
    for goal in goals:
        output.append(f"Goal {goal.get('index', '')}:\n  Question: {goal['question']}\n  Visualization: {goal['visualization']}\n  Rationale: {goal['rationale']}\n")
    return "\n".join(output)

tools = [summarize_data, persona, goals]
agent = create_react_agent(
    model=llm,
    tools=tools,
    prompt=system_prompts,
)

def run_agent(dataset_path: str):
    with open(dataset_path, "r", encoding="latin1") as f:
        csv_content = f.read()
    question = (
        "Analyze the following dataset and provide a summary, personas, and goals.\n"
        "DATASET_CSV:\n"
        f"{csv_content}"
    )
    inputs = {"messages": [("user", question)]}
    for step in agent.stream(inputs, stream_mode="values"):
        msg = step['messages'][-1]
        msg.pretty_print()

# Example usage
if __name__ == "__main__":
    # Replace with your actual dataset path
    dataset_path = "/home/thiru/dataviz/DataViz-/backend/data/dataset.csv"
    run_agent(dataset_path)