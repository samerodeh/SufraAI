# --------------- imports ------------------
from .agent_utilities import llm, detect_language, get_menu_items
from data_store import get_user_profile
from recomender import get_recommendations, get_popular_items
import json


class RecommendationAgent:

    def __init__(self):
        pass

    def get_agent_response(self, message: str, history: list = [], user_id: str = "guest") -> str:
        profile = get_user_profile(user_id)
        lang = profile.get("languagePreference", "auto")
        if lang == "auto":
            lang = detect_language(message)

        menu = get_menu_items()
        menu_map = {item["id"]: item for item in menu}
        name_to_id = {item["name_en"].lower(): item["id"] for item in menu}

        extraction = llm(
            system=f"""You are a menu item extractor for a Lebanese restaurant called Sufra.
Given a customer message, extract any menu item names they mentioned.
Return JSON only: {{"items": ["item name 1", "item name 2"]}}
If no items are mentioned, return {{"items": []}}
Menu items available: {', '.join([item['name_en'] for item in menu])}""",
            user=message,
            history=history
        )

        try:
            mentioned_names = json.loads(extraction).get("items", [])
        except:
            mentioned_names = []

        cart_ids = [name_to_id[name.lower()] for name in mentioned_names if name.lower() in name_to_id]
        rec_ids = get_recommendations(cart_ids) if cart_ids else get_popular_items()
        rec_items = [menu_map[rid] for rid in rec_ids if rid in menu_map]

        if not rec_items:
            rec_items = [menu_map[rid] for rid in get_popular_items() if rid in menu_map]

        rec_context = "\n".join([
            f"- {item['name_en']} ({item['category']}) — {item.get('price', '')} AED: {item.get('description_en', '')}"
            for item in rec_items
        ])

        basis = f"based on: {', '.join(mentioned_names)}" if mentioned_names else "based on popularity"

        return llm(
            system=f"""You are Sufra's friendly recommendation assistant for a Lebanese restaurant.
Language: {lang}
The customer asked for recommendations {basis}.
Suggest the following items naturally and enthusiastically. Mention why they pair well or why they are popular.
Keep it short (2-4 sentences). Always respond in language: {lang}.
Recommended items:
{rec_context}""",
            user=message,
            history=history
        )


def recommendation_agent(message: str, history: list = [], user_id: str = "guest") -> str:
    return RecommendationAgent().get_agent_response(message, history, user_id)
