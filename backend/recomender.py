# backend/recommender.py
import json
import os

_BASE = os.path.dirname(__file__)

def _load(filename):
    path = os.path.join(_BASE, filename)
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_recommendations(cart_item_ids: list, top_n: int = 3) -> list:
    """
    Given items currently in the cart, return the top N recommended itemIds.
    Uses Apriori rules, falls back to popularity if no rules found.
    """
    rules = _load("data/trained_recomendations_data/apriori_recommendations.json")
    scores = {}

    for item_id in cart_item_ids:
        matches = rules.get(item_id, [])
        for match in matches:
            for rec_id in match["itemIds"]:
                if rec_id not in cart_item_ids:  # don't recommend what's already in cart
                    # accumulate confidence scores for items recommended by multiple rules
                    scores[rec_id] = scores.get(rec_id, 0) + match["confidence"]

    if scores:
        sorted_recs = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return [item_id for item_id, _ in sorted_recs[:top_n]]

    # fallback: return most popular items not already in cart
    return get_popular_items(exclude=cart_item_ids, top_n=top_n)


def get_popular_items(category: str = None, exclude: list = None, top_n: int = 5) -> list:
    """
    Returns the most popular itemIds.
    Optionally filter by category, and exclude already-carted items.
    """
    popularity = _load("data/trained_recomendations_data/popularity_recommendations.json")
    exclude = exclude or []

    filtered = [
        p for p in popularity
        if p["itemId"] not in exclude
        and (category is None or p.get("category") == category)
    ]

    return [p["itemId"] for p in filtered[:top_n]]
