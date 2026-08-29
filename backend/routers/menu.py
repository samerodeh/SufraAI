# fastapi imports
from fastapi import APIRouter, HTTPException
# other imports
from agents.agent_utilities import get_menu_items

router = APIRouter(prefix="/menu", tags=["menu"])


def _with_availability(item: dict) -> dict:
    enriched = dict(item)
    enriched["isAvailable"] = bool(item.get("available", True))
    return enriched


def _availability_row(item: dict) -> dict:
    return {
        "id": item["id"],
        "name_en": item["name_en"],
        "name_ar": item["name_ar"],
        "available": bool(item.get("available", True)),
        "isAvailable": bool(item.get("available", True)),
        "alternativeItemIds": item.get("alternativeItemIds", []),
    }


@router.get("/")
def get_menu():
    """Return the full menu."""
    return [_with_availability(item) for item in get_menu_items()]


# Declared before /{category} so the literal path wins the match.
@router.get("/availability")
def get_menu_availability():
    return [_availability_row(item) for item in get_menu_items()]


@router.get("/categories")
def get_categories():
    return sorted({item["category"] for item in get_menu_items()})


@router.get("/{category}")
def get_menu_by_category(category: str):
    """Return every item in one category."""
    items = [
        _with_availability(item)
        for item in get_menu_items()
        if item["category"].lower() == category.lower()
    ]
    if not items:
        raise HTTPException(status_code=404, detail=f"No items in category '{category}'")
    return items
