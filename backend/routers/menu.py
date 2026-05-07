# fastapi imports
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
# other imports
import json

router = APIRouter(prefix="/menu", tags=["menu"])

@router.get("/")
def get_menu():
    """Return the full menu from menu.json."""
    with open("data/menu.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    for item in data:
        item["isAvailable"] = bool(item.get("available", True))
    return data

@router.get("/availability")
def get_menu_availability():
    with open("data/menu.json", "r", encoding="utf-8") as f:
        items = json.load(f)
    return [
        {
            "id": item["id"],
            "name_en": item["name_en"],
            "name_ar": item["name_ar"],
            "available": bool(item.get("available", True)),
            "isAvailable": bool(item.get("available", True)),
            "alternativeItemIds": item.get("alternativeItemIds", []),
        }
        for item in items
    ]

@router.get("/{category}")
def get_menu_availability():
    with open("data/menu.json", "r", encoding="utf-8") as f:
        items = json.load(f)
    return [
        {
            "id": item["id"],
            "name_en": item["name_en"],
            "name_ar": item["name_ar"],
            "available": bool(item.get("available", True)),
            "isAvailable": bool(item.get("available", True)),
            "alternativeItemIds": item.get("alternativeItemIds", []),
        }
        for item in items
    ]
