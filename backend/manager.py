import json
import logging
import google.generativeai as genai
import os
import pandas as pd
from summarizer import summarize_json_and_sentence
from persona import generate_personas
from goal import generate_goals

logger = logging.getLogger("manager_agent")
logging.basicConfig(level=logging.INFO)

class Manager:
    def __init__(self, gemini_api_key: str):
        self.gemini_api_key = gemini_api_key
        self.data = None
        self.summary_json = None
        self.summary_text = None
        self.personas = None
        self.goals = None

    def run(self, data_path: str, n_personas: int = 5, n_goals: int = 5):
        # Load data
        self.data = pd.read_csv(data_path, encoding='latin1')

        
        self.summary_json, self.summary_text = summarize_json_and_sentence(self.data, self.gemini_api_key)
        print("\n==================== LLM Enriched JSON Summary ====================\n")
        print(json.dumps(self.summary_json, indent=2, default=str))

        print("\n==================== LLM Text Summary ====================\n")
        print(self.summary_text)

        # Personas
        self.personas = generate_personas(self.summary_json, self.gemini_api_key, n=n_personas)
        print("\n==================== Generated Personas ====================\n")
        for i, persona in enumerate(self.personas, 1):
            print(f"{i}. Persona: {persona['persona']}\n   Rationale: {persona['rationale']}\n")

        # Goals for first persona
        print("\n==================== Goals for Persona: {} ====================\n".format(self.personas[0]['persona']))
        self.goals = generate_goals(self.summary_json, self.personas[0], self.gemini_api_key, n=n_goals)
        for goal in self.goals:
            print(f"Goal {goal.get('index', '')}:\n  Question: {goal['question']}\n  Visualization: {goal['visualization']}\n  Rationale: {goal['rationale']}\n")


if __name__ == "__main__":
    # Example usage
    gemini_api_key = ""  # Replace with your actual Gemini API key
    data_path = '/home/thiru/dataviz/DataViz-/backend/data/leetcode.csv'
    manager = Manager(gemini_api_key)
    manager.run(data_path)
