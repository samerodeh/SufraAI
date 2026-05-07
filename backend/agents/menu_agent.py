# --------------- imports ------------------
from .agent_utilities import llm, get_menu_items, apply_dietary_and_availability
import json
from rag import query_menu, query_faq
from data_store import get_user_profile


class MenuAgent:

    def __init__(self):
        pass

    def _is_full_menu_request(self, message: str) -> bool:
        normalized = (message or "").strip().lower()
        exact_triggers = {
            "menu", "show menu", "full menu", "show the menu",
            "show the full menu", "show me the menu", "what's on the menu",
            "what is on the menu", "entire menu", "all menu items", "show all items"
        }
        if normalized in exact_triggers:
            return True
        keyword_triggers = ["full menu", "entire menu", "all menu", "show menu", "show the menu", "see the menu"]
        return any(kw in normalized for kw in keyword_triggers)

    def _format_full_menu_response(self, user_id: str) -> str:
        all_items = get_menu_items()
        visible_items = apply_dietary_and_availability(all_items, user_id)
        if not visible_items:
            return "No menu items are currently available for your profile."

        category_order = [
            "plates", "sandwiches", "manaeesh", "mezze",
            "salads", "sweets", "drinks", "coffee_tea"
        ]
        category_titles = {
            "plates": "Plates",
            "sandwiches": "Sandwiches",
            "manaeesh": "Mana'eesh",
            "mezze": "Mezze",
            "salads": "Salads",
            "sweets": "Sweets",
            "drinks": "Drinks",
            "coffee_tea": "Coffee & Tea"
        }

        grouped = {category: [] for category in category_order}
        for item in visible_items:
            category = item.get("category", "")
            if category not in grouped:
                grouped[category] = []
            grouped[category].append(item)

        lines = ["Here is our full menu by category:"]
        for category in category_order:
            items = grouped.get(category, [])
            if not items:
                continue
            lines.append(f"\n{category_titles.get(category, category)}:")
            for item in sorted(items, key=lambda row: row.get("name_en", "")):
                lines.append(f"- {item.get('name_en', '')} - ${item.get('price', '')}")

        return "\n".join(lines)

    def get_agent_response(self, message: str, history: list = None, user_id: str = "guest") -> str:
        if history is None:
            history = []
        menu_results = query_menu(message)
        faq_results = query_faq(message)
        profile = get_user_profile(user_id)
        if self._is_full_menu_request(message):
            return self._format_full_menu_response(user_id)
        dietary = profile.get("dietaryProfile", {})
        context = "\n".join([*menu_results, *faq_results])
        return llm(
            system_prompt=f"""You are Sufra's menu expert. Answer using ONLY this data.
User dietary profile: {json.dumps(dietary, ensure_ascii=False)}
If requested item is unavailable, suggest alternatives.
Data:
{context}
Be concise and friendly. Don't make up items or prices.""",
            user=message,
            history=history
        )


def menu_agent(message: str, history: list = None, user_id: str = "guest") -> str:
    return MenuAgent().get_agent_response(message, history, user_id)
