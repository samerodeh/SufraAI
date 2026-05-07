# --------------- imports ------------------
from .agent_utilities import llm
from rag import query_menu
import json
from data_store import get_user_profile


class DietaryAgent:

    def __init__(self):
        pass

    def get_agent_response(self, message: str, history: list = [], user_id: str = "guest") -> str:
        menu_results = query_menu(message)
        profile = get_user_profile(user_id)
        dietary = profile.get("dietaryProfile", {})
        context = "\n".join(menu_results)
        return llm(
            system_prompt=f"""You are Sufra's dietary advisor.
                Help customers with allergies, dietary restrictions, and food preferences.
                Current user profile constraints: {json.dumps(dietary, ensure_ascii=False)}
                Use ONLY this menu data:
                {context}
                Be clear about allergens and diet tags. Always recommend consulting staff for severe allergies.""",
            user=message,
            history=history
        )


def dietary_agent(message: str, history: list = [], user_id: str = "guest") -> str:
    return DietaryAgent().get_agent_response(message, history, user_id)
