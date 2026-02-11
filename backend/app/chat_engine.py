import os
import requests
from typing import List, Dict, Any, Optional
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class ChatEngine:
    def __init__(self):
        self.mode = os.getenv("MODE", "LOCAL") # LOCAL, CLOUD, or OPENROUTER
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY")) if os.getenv("OPENAI_API_KEY") else None
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        self.openrouter_model = os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-exp:free")
        self.local_base_url = os.getenv("LOCAL_MODEL_BASE_URL", "http://localhost:11434/v1")
        self.local_model = "llama3" # Default local model

    async def generate_response(self, query: str, context: str) -> str:
        prompt = f"""
        You are an AI assistant for MCP-LiteLabs. Use the provided context to answer the user's question accurately.
        If the context doesn't contain the answer, say you don't know based on the documents.
        
        Context:
        {context}
        
        User Question:
        {query}
        
        Response:
        """
        
        if self.mode == "CLOUD" and self.openai_client:
            response = self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7
            )
            return response.choices[0].message.content
        elif self.mode == "OPENROUTER" and self.openrouter_api_key:
            try:
                response = requests.post(
                    url="https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openrouter_api_key}",
                        "HTTP-Referer": "https://mcp-litelabs.local", # Optional
                        "X-Title": "MCP-LiteLabs", # Optional
                    },
                    json={
                        "model": self.openrouter_model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.7
                    }
                )
                if response.status_code == 200:
                    return response.json()["choices"][0]["message"]["content"]
                else:
                    return f"Error from OpenRouter: {response.text}"
            except Exception as e:
                return f"Error connecting to OpenRouter: {e}"
        else:
            # Local Ollama or similar using OpenAI-compatible API
            try:
                response = requests.post(
                    f"{self.local_base_url}/chat/completions",
                    json={
                        "model": self.local_model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.7
                    }
                )
                if response.status_code == 200:
                    return response.json()["choices"][0]["message"]["content"]
                else:
                    return f"Error from local model: {response.text}"
            except Exception as e:
                return f"Could not connect to local model at {self.local_base_url}. Is Ollama running? Error: {e}"

    def set_mode(self, mode: str):
        if mode in ["LOCAL", "CLOUD"]:
            self.mode = mode
