from groq import Groq
from dotenv import load_dotenv
import os
import json
import time
from data_store import get_user_profile

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def llm(system_prompt: str, user: str, history: list = []) -> str:
    messages = [{"role": "system", "content": system_prompt}]
    messages += history
    messages.append({"role": "user", "content": user})
    for attempt in range(2):
        try:
            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages
            )
            return response.choices[0].message.content
        except Exception:
            if attempt == 0:
                time.sleep(1)
                continue
            return "I'm getting too many requests right now. Please try again in a moment."


def llm_json(system_prompt: str, user: str, history: list = [], fallback: dict = {}) -> dict:
    messages = [{"role": "system", "content": system_prompt}]
    messages += history
    messages.append({"role": "user", "content": user})
    response = None
    for attempt in range(2):
        try:
            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages,
                response_format={"type": "json_object"}
            )
            break
        except Exception:
            if attempt == 0:
                time.sleep(1)
                continue
            return fallback
    try:
        return json.loads(response.choices[0].message.content)
    except:
        return fallback


def detect_language(text: str) -> str:
    return "en"


def localize(text_en: str, text_ar: str, lang: str) -> str:
    return text_en


def get_menu_items() -> list:
    with open("data/menu.json", "r", encoding="utf-8") as f:
        return json.load(f)


def apply_dietary_and_availability(items: list, user_id: str) -> list:
    profile = get_user_profile(user_id)
    dietary = profile.get("dietaryProfile", {})
    allergies = set((dietary.get("allergies") or []))
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

    