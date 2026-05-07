"""
Runtime database layer for orders.
"""
import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

DB_FILE = os.path.join(os.path.dirname(__file__), "..", "db_files", "orders.db")


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_orders_db() -> None:
    with _get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                order_id        TEXT PRIMARY KEY,
                user_id         TEXT NOT NULL DEFAULT 'guest',
                items           TEXT NOT NULL DEFAULT '[]',
                status          TEXT NOT NULL DEFAULT 'received',
                source          TEXT NOT NULL DEFAULT 'chatbot',
                reservation_id  TEXT,
                created_at      TEXT NOT NULL,
                updated_at      TEXT NOT NULL
            )
        """)
        conn.commit()


def add_order_to_db(user_id: str, items: List[Dict[str, Any]]) -> Dict[str, Any]:
    order_id = f"ord_{uuid.uuid4().hex[:10]}"
    now = _now_iso()
    with _get_conn() as conn:
        conn.execute(
            """INSERT INTO orders
               (order_id, user_id, items, status, source, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (order_id, user_id, json.dumps(items), "received", "chatbot", now, now),
        )
        conn.commit()
    return {"orderId": order_id, "userId": user_id, "items": items, "status": "received"}
