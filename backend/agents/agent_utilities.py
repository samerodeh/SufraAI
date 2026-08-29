"""Shared helpers used by every SufraAI agent.

Everything here is deliberately side-effect free at import time apart from
loading the .env file, so the agents can be imported by the API, the CLI or a
test harness without spinning up a server.
"""
import json
import os
import re
from functools import lru_cache

from dotenv import load_dotenv
from groq import Groq

from data_store import get_user_profile

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
MENU_FILE = os.path.join(DATA_DIR, "menu.json")
FAQ_FILE = os.path.join(DATA_DIR, "faq.json")

MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

_JSON_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL)
_JSON_OBJECT = re.compile(r"\{.*\}", re.DOTALL)


class LLMUnavailable(RuntimeError):
    """Raised when no Groq key is configured or the call fails."""


def offline_mode() -> bool:
    """Set SUFRA_OFFLINE=1 to force every agent onto its non-LLM fallback.

    Checked at call time rather than import time, because load_dotenv() puts the
    key back into the environment as soon as this module is imported.
    """
    return os.getenv("SUFRA_OFFLINE", "").strip().lower() in ("1", "true", "yes")


@lru_cache(maxsize=1)
def _client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise LLMUnavailable("GROQ_API_KEY is not set")
    return Groq(api_key=api_key)


def llm_available() -> bool:
    """True when a Groq key is configured and offline mode is off."""
    if offline_mode():
        return False
    return bool(os.getenv("GROQ_API_KEY"))


def _clean_history(history: list) -> list:
    """Keep only well-formed chat turns — the mobile app sometimes sends extras."""
    cleaned = []
    for turn in history or []:
        if not isinstance(turn, dict):
            continue
        role, content = turn.get("role"), turn.get("content")
        if role in ("user", "assistant", "system") and isinstance(content, str):
            cleaned.append({"role": role, "content": content})
    return cleaned


def llm(system: str, user: str, history: list = None, temperature: float = 0.4) -> str:
    if offline_mode():
        raise LLMUnavailable("offline mode is on (SUFRA_OFFLINE=1)")
    messages = [{"role": "system", "content": system}]
    messages += _clean_history(history)
    messages.append({"role": "user", "content": user})
    try:
        response = _client().chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=temperature,
        )
    except LLMUnavailable:
        raise
    except Exception as exc:  # network / rate limit / bad request
        raise LLMUnavailable(str(exc)) from exc
    return response.choices[0].message.content or ""


def parse_json(raw: str, default: dict = None) -> dict:
    """Best-effort JSON extraction from an LLM reply.

    Small models like to wrap JSON in ``` fences or add a sentence around it,
    so strip both before giving up.
    """
    default = {} if default is None else default
    if not raw:
        return dict(default)

    candidates = [raw.strip()]
    fenced = _JSON_FENCE.search(raw)
    if fenced:
        candidates.append(fenced.group(1).strip())
    braced = _JSON_OBJECT.search(raw)
    if braced:
        candidates.append(braced.group(0).strip())

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except (ValueError, TypeError):
            continue
        if isinstance(parsed, dict):
            return parsed
    return dict(default)


def llm_json(system: str, user: str, history: list = None, default: dict = None) -> dict:
    """Ask the model for JSON and always hand back a dict."""
    return parse_json(llm(system, user, history, temperature=0.0), default)


def detect_language(text: str) -> str:
    for ch in text or "":
        if "\u0600" <= ch <= "\u06FF":
            return "ar"
    return "en"


def localize(text_en: str, text_ar: str, lang: str) -> str:
    return text_ar if lang == "ar" else text_en


def resolve_language(message: str, user_id: str = "guest") -> str:
    """Profile preference wins; otherwise sniff the script of the message."""
    lang = get_user_profile(user_id).get("languagePreference", "auto")
    return detect_language(message) if lang == "auto" else lang


@lru_cache(maxsize=1)
def _menu_cache() -> tuple:
    with open(MENU_FILE, "r", encoding="utf-8") as f:
        return tuple(json.load(f))


def get_menu_items() -> list:
    return [dict(item) for item in _menu_cache()]


def get_faqs() -> list:
    with open(FAQ_FILE, "r", encoding="utf-8") as f:
        return json.load(f)["faqs"]


def apply_dietary_and_availability(items: list, user_id: str) -> list:
    profile = get_user_profile(user_id)
    dietary = profile.get("dietaryProfile", {})
    allergies = set(dietary.get("allergies") or [])
    vegan = bool(dietary.get("vegan"))
    halal = bool(dietary.get("halal"))

    filtered = []
    for item in items:
        if not item.get("available", True):
            continue
        tags = set(item.get("diet_tags", []))
        allergens = set(item.get("allergens", []))
        if vegan and "vegan" not in tags:
            continue
        if halal and "halal" not in tags:
            continue
        if allergies and (allergies & allergens):
            continue
        filtered.append(item)
    return filtered
