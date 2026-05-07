from groq import Groq
from dotenv import load_dotenv
import os
import json
from data_store import get_user_profile

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def llm(system: str, user: str, history: list = []) -> str:
    messages = [{"role": "system", "content": system}]
    messages += history
    messages.append({"role": "user", "content": user})
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=messages
    )
    return response.choices[0].message.content


def detect_language(text: str) -> str:
    for ch in text:
        if "\u0600" <= ch <= "\u06FF":
            return "ar"
    return "en"


def localize(text_en: str, text_ar: str, lang: str) -> str:
    return text_ar if lang == "ar" else text_en


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

    