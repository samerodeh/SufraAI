from .agent_utilities import llm, llm_json, get_menu_items, apply_dietary_and_availability
from recomender import get_recommendations, get_popular_items


class RecommendationAgent:

    def __init__(self):
        pass

    def get_agent_response(self, message: str, history: list = [], user_id: str = "guest") -> str:
        menu = get_menu_items()
        menu_map = {item["id"]: item for item in menu}
        name_to_id = {item["name_en"].lower(): item["id"] for item in menu}
        categories = list({item["category"] for item in menu})

        classification = llm_json(
            system_prompt=f"""You are a recommendation classifier for Sufra, a Lebanese restaurant.
Classify the user's request into one of these types:

1. apriori - user mentions specific items they like or want to pair with
2. popular - general request like "what's good?" or "what do you recommend?"
3. popular_by_category - user asks for recommendations in a specific category (e.g. "recommend me a coffee")

Available categories: {', '.join(categories)}
Available items: {', '.join([item['name_en'] for item in menu])}

Respond with JSON only:
{{
    "recommendation_type": "apriori" or "popular" or "popular_by_category",
    "parameters": list of item names for apriori, list of one category for popular_by_category, or empty list
}}""",
            user=message,
            history=history,
            fallback={"recommendation_type": "popular", "parameters": []}
        )

        rec_type = classification.get("recommendation_type", "popular")
        params = classification.get("parameters", [])

        if rec_type == "apriori" and params:
            item_ids = [name_to_id[p.lower()] for p in params if p.lower() in name_to_id]
            rec_ids = get_recommendations(item_ids) if item_ids else get_popular_items()
        elif rec_type == "popular_by_category" and params:
            rec_ids = get_popular_items(category=params[0])
        else:
            rec_ids = get_popular_items()

        rec_items = apply_dietary_and_availability(
            [menu_map[rid] for rid in rec_ids if rid in menu_map],
            user_id
        )

        if not rec_items:
            rec_items = [menu_map[rid] for rid in get_popular_items() if rid in menu_map]

        rec_context = "\n".join([
            f"- {item['name_en']} ({item['category']}) — {item.get('price', '')} AED: {item.get('description_en', '')}"
            for item in rec_items
        ])

        basis = f"based on: {', '.join(params)}" if params else "based on popularity"

        return llm(
            system_prompt=f"""You are Sufra's friendly recommendation assistant for a Lebanese restaurant.
The customer asked for recommendations {basis}.
Suggest the following items naturally and enthusiastically. Mention why they pair well or are popular.
Keep it short (2-4 sentences).
Recommended items:
{rec_context}""",
            user=message,
            history=history
        )


def recommendation_agent(message: str, history: list = [], user_id: str = "guest") -> str:
    return RecommendationAgent().get_agent_response(message, history, user_id)
