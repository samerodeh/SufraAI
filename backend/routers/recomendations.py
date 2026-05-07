# fastapi imports
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
# other imports
from recomender import get_recommendations, get_popular_items
import json

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.get("/")
def get_recs(user_id: str = "guest", cart_items: str = ""):
    """Return recommended itemIds based on current cart. Falls back to popularity if cart is empty."""
    cart = [x.strip() for x in cart_items.split(",") if x.strip()]
    recs = get_recommendations(cart) if cart else get_popular_items()

    with open("data/menu.json", "r", encoding="utf-8") as f:
        menu = json.load(f)
    menu_map = {item["id"]: item for item in menu}

    return {
        "userId": user_id,
        "cartItems": cart,
        "recommendations": [
            {
                "itemId": rec_id,
                "name_en": menu_map[rec_id]["name_en"],
                "name_ar": menu_map[rec_id]["name_ar"],
                "price": menu_map[rec_id]["price"],
                "category": menu_map[rec_id]["category"],
            }
            for rec_id in recs if rec_id in menu_map
        ],
    }
