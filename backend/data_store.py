import json
import os
import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from db.user_db import (
    db_get_user_profile,
    db_update_user_profile,
    db_add_favorite,
    db_remove_favorite,
    db_set_favorites,
    db_append_order_to_history,
    db_set_usual_order,
)

STORE_FILE = os.path.join(os.path.dirname(__file__), "runtime_store.json")
_LOCK = threading.Lock()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _default_store() -> Dict[str, Any]:
    return {
        "users": {},
        "promotions": {},
        "orders": {},
        "reservations": {},

    }


def _load_store() -> Dict[str, Any]:
    if not os.path.exists(STORE_FILE):
        return _default_store()
    try:
        with open(STORE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return _default_store()
        return {**_default_store(), **data}
    except Exception:
        return _default_store()


def _save_store(store: Dict[str, Any]) -> None:
    with open(STORE_FILE, "w", encoding="utf-8") as f:
        json.dump(store, f, ensure_ascii=False, indent=2)


def _with_lock(fn):
    def wrapper(*args, **kwargs):
        with _LOCK:
            return fn(*args, **kwargs)

    return wrapper


def get_user_profile(user_id: str) -> Dict[str, Any]:
    return db_get_user_profile(user_id)


def update_user_profile(user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    return db_update_user_profile(user_id, payload)


def set_favorites(user_id: str, favorites: List[str]) -> List[str]:
    return db_set_favorites(user_id, favorites)


def add_favorite(user_id: str, item_id: str) -> List[str]:
    return db_add_favorite(user_id, item_id)


def remove_favorite(user_id: str, item_id: str) -> List[str]:
    return db_remove_favorite(user_id, item_id)


@_with_lock
def get_promotions() -> List[Dict[str, Any]]:
    store = _load_store()
    promotions = list[Any](store["promotions"].values())
    if not promotions:
        seed_promotions()
        store = _load_store()
        promotions = list[Any](store["promotions"].values())
    now = _now_iso()
    active = [p for p in promotions if p.get("isActive", True) and p.get("startAt", now) <= now <= p.get("endAt", now)]
    active.sort(key=lambda x: x.get("priority", 100))
    return active


@_with_lock
def seed_promotions() -> None:
    store = _load_store()
    if store["promotions"]:
        return
    now = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    end = now.replace(hour=23, minute=59, second=59, microsecond=0).isoformat()
    promos = [
        {
            "promoId": "breakfast-combo",
            "title": "Breakfast Combo",
            "description": "Add coffee with any manaeesh and save 15%.",
            "startAt": start,
            "endAt": end,
            "applicableCategories": ["manaeesh", "coffee_tea"],
            "applicableItems": [],
            "priority": 1,
            "isActive": True,
        },
        {
            "promoId": "weekend-dessert",
            "title": "Weekend Dessert Offer",
            "description": "Get 10% off desserts after 6pm.",
            "startAt": start,
            "endAt": end,
            "applicableCategories": ["sweets"],
            "applicableItems": [],
            "priority": 2,
            "isActive": True,
        },
    ]
    for p in promos:
        store["promotions"][p["promoId"]] = p
    _save_store(store)


@_with_lock
def create_order(order_payload: Dict[str, Any]) -> Dict[str, Any]:
    store = _load_store()
    order_id = f"ord_{uuid.uuid4().hex[:10]}"
    order = {
        "orderId": order_id,
        "userId": order_payload.get("userId", "guest"),
        "items": order_payload.get("items", []),
        "status": order_payload.get("status", "received"),
        "source": order_payload.get("source", "cart"),
        "reservationId": order_payload.get("reservationId"),
        "paymentMethod": order_payload.get("paymentMethod", "card"),
        "deliveryMethod": order_payload.get("deliveryMethod", "pickup"),
        "deliveryAddress": order_payload.get("deliveryAddress"),
        "promoCode": order_payload.get("promoCode"),
        "subtotal": order_payload.get("subtotal", 0.0),
        "tax": order_payload.get("tax", 0.0),
        "tip": order_payload.get("tip", 0.0),
        "total": order_payload.get("total", 0.0),
        "createdAt": _now_iso(),
        "updatedAt": _now_iso(),
    }
    store["orders"][order_id] = order
    _save_store(store)
    db_append_order_to_history(order["userId"], order_id)
    return order


@_with_lock
def get_order(order_id: str) -> Optional[Dict[str, Any]]:
    store = _load_store()
    return store["orders"].get(order_id)


@_with_lock
def update_order_status(order_id: str, status: str) -> Optional[Dict[str, Any]]:
    store = _load_store()
    order = store["orders"].get(order_id)
    if not order:
        return None
    order["status"] = status
    order["updatedAt"] = _now_iso()
    store["orders"][order_id] = order
    _save_store(store)
    return order


@_with_lock
def get_order_history(user_id: str) -> List[Dict[str, Any]]:
    store = _load_store()
    return sorted(
        [o for o in store["orders"].values() if o.get("userId") == user_id],
        key=lambda x: x.get("createdAt", ""),
        reverse=True,
    )


@_with_lock
def create_reservation(payload: Dict[str, Any]) -> Dict[str, Any]:
    store = _load_store()
    reservation_id = f"res_{uuid.uuid4().hex[:10]}"
    reservation = {
        "reservationId": reservation_id,
        "userId": payload.get("userId", "guest"),
        "dateTime": payload.get("dateTime"),
        "partySize": payload.get("partySize", 2),
        "contact": payload.get("contact", {}),
        "preorderItems": payload.get("preorderItems", []),
        "status": payload.get("status", "confirmed"),
        "createdAt": _now_iso(),
        "updatedAt": _now_iso(),
    }
    store["reservations"][reservation_id] = reservation
    _save_store(store)
    return reservation


def set_usual_order(user_id: str, usual_items: List[Dict[str, Any]]) -> Dict[str, Any]:
    return db_set_usual_order(user_id, usual_items)
