import httpx
import json
import logging
from typing import Dict, Any, List, Optional
from app.config import settings

logger = logging.getLogger("preppilot.ai")

class OllamaAIClient:
    """Async client for interacting with the configured Ollama LLM (Qwen 3.5:27b on Kaggle ngrok or local).
    Decoupled and resilient: handles JSON formatting, custom headers, and timeouts gracefully.
    """

    def __init__(self):
        self.host = settings.OLLAMA_HOST.rstrip("/")
        self.model = settings.OLLAMA_MODEL
        self.headers = {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
            "User-Agent": "PrepPilot-AI-Backend/1.0"
        }

    @property
    def timeout(self) -> float:
        return getattr(settings, "OLLAMA_TIMEOUT_SECONDS", 120.0)

    async def generate(self, prompt: str, system: Optional[str] = None, format_json: bool = False, options: Optional[Dict[str, Any]] = None) -> str:
        url = f"{self.host}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
        }
        if system:
            payload["system"] = system
        if format_json:
            payload["format"] = "json"
        if options:
            payload["options"] = options

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=self.headers)
                if response.status_code == 200:
                    data = response.json()
                    return data.get("response", "").strip()
                else:
                    logger.error(f"Ollama returned HTTP {response.status_code}: {response.text}")
                    return self._fallback_response(prompt, format_json)
        except Exception as e:
            logger.warning(f"Error connecting to Ollama at {self.host} ({e}). Triggering fallback.")
            return self._fallback_response(prompt, format_json)

    async def chat(self, messages: List[Dict[str, str]], format_json: bool = False, options: Optional[Dict[str, Any]] = None) -> str:
        url = f"{self.host}/api/chat"
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False
        }
        if format_json:
            payload["format"] = "json"
        if options:
            payload["options"] = options

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=self.headers)
                if response.status_code == 200:
                    data = response.json()
                    msg = data.get("message", {})
                    return msg.get("content", "").strip()
                else:
                    logger.error(f"Ollama chat error HTTP {response.status_code}: {response.text}")
                    return self._fallback_response(messages[-1].get("content", ""), format_json)
        except Exception as e:
            logger.warning(f"Error in Ollama chat connection ({e}). Triggering fallback.")
            return self._fallback_response(messages[-1].get("content", ""), format_json)

    def _fallback_response(self, context: str, format_json: bool) -> str:
        """Deterministic educational fallback if external LLM tunnel encounters network latency or disconnect."""
        if format_json:
            return json.dumps({
                "correctness": "partially_correct",
                "concepts_demonstrated": ["Demonstrated basic conceptual intuition"],
                "missing_concepts": ["Deeper optimization details"],
                "misconceptions": [],
                "feedback": "Your answer demonstrates initial understanding. Let's delve deeper into how edge cases and time complexities apply here.",
                "assistance_level": "independent",
                "suggested_followup": "Can you explain how this approach performs when inputs are duplicated or empty?"
            })
        return "I'm analyzing your approach. Notice how the core logic handles the typical case, but consider what happens when boundary conditions or unexpected inputs occur. What edge cases come to mind?"

ai_client = OllamaAIClient()
