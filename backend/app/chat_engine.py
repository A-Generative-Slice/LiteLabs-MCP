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
        self.gemini_key = os.getenv("GEMINI_API_KEY")
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
        elif self.mode == "GEMINI" and self.gemini_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.gemini_key)
                
                # Try models in order of popularity/availability
                models_to_try = [
                    'gemini-1.5-flash',
                    'gemini-1.5-flash-latest',
                    'gemini-2.0-flash-exp',
                    'gemini-pro'
                ]
                
                last_error = ""
                for model_name in models_to_try:
                    try:
                        model = genai.GenerativeModel(model_name)
                        response = model.generate_content(prompt)
                        return response.text
                    except Exception as e:
                        last_error = str(e)
                        continue
                
                return f"Error from Gemini: {last_error}. None of the attempted models ({', '.join(models_to_try)}) were available for this key."
            except Exception as e:
                return f"Error configuring Gemini: {e}. Please ensure your API key is correct."
        elif self.mode == "OPENROUTER" and self.openrouter_api_key:
            try:
                # Auto-correct common outdated free model IDs
                model_mapping = {
                    "qwen/qwen-2.5-72b-instruct:free": "qwen/qwen-2-72b-instruct:free",
                    "meta-llama/llama-3.1-405b-instruct:free": "meta-llama/llama-3.1-70b-instruct:free",
                    "google/gemini-pro:free": "google/gemini-2.0-flash-exp:free"
                }
                current_model = model_mapping.get(self.openrouter_model, self.openrouter_model)

                response = requests.post(
                    url="https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openrouter_api_key}",
                        "HTTP-Referer": "https://mcp-litelabs.local",
                        "X-Title": "MCP-LiteLabs",
                    },
                    json={
                        "model": current_model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.7
                    }
                )
                if response.status_code == 200:
                    return response.json()["choices"][0]["message"]["content"]
                elif response.status_code == 404:
                    # Final fallback if the preset failed
                    fallback_model = "google/gemini-2.0-flash-exp:free"
                    if current_model != fallback_model:
                        response = requests.post(
                            url="https://openrouter.ai/api/v1/chat/completions",
                            headers={"Authorization": f"Bearer {self.openrouter_api_key}"},
                            json={
                                "model": fallback_model,
                                "messages": [{"role": "user", "content": prompt}],
                                "temperature": 0.7
                            }
                        )
                        if response.status_code == 200:
                            return response.json()["choices"][0]["message"]["content"]
                    
                    return f"OpenRouter Error: The model '{current_model}' could not be found. This usually means the model ID has changed. Try selecting a different 'Free Model Preset' in Settings."
                else:
                    error_data = response.json() if response.headers.get('content-type') == 'application/json' else response.text
                    return f"OpenRouter Error: {error_data}. Tip: Check if your API key has enough credits or if the service is down."
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
        if mode in ["LOCAL", "CLOUD", "OPENROUTER", "GEMINI"]:
            self.mode = mode
