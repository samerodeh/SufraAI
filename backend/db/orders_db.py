"""SQLite persistence for orders.

This is the single source of truth for orders — the chatbot, the cart checkout
and the reservation preorder flow all land in the same table, so
`/orders/history` and the order-history agent always agree.
"""
import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "db_files")
DB_FILE = os.path.join(DB_DIR, "orders.db")


def _get_conn() -> sqlite3.Connection:
    os.makedirs(DB_DIR, exist_ok=True)
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
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id, created_at DESC)"
        )
        conn.commit()


def _row_to_order(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "orderId": row["order_id"],
        "userId": row["user_id"],
        "items": json.loads(row["items"]),
        "status": row["status"],
        "source": row["source"],
        "reservationId": row["reservation_id"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def db_create_order(
    user_id: str,
    items: List[Dict[str, Any]],
    status: str = "received",
    source: str = "chatbot",
    reservation_id: Optional[str] = None,
) -> Dict[str, Any]:
    order_id = f"ord_{uuid.uuid4().hex[:10]}"
    now = _now_iso()
    with _get_conn() as conn:
        conn.execute(
            """INSERT INTO orders
               (order_id, user_id, items, status, source, reservation_id, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (order_id, user_id, json.dumps(items, ensure_ascii=False), status,
             source, reservation_id, now, now),
        )
        conn.commit()
    return {
        "orderId": order_id,
        "userId": user_id,
        "items": items,
        "status": status,
        "source": source,
        "reservationId": reservation_id,
        "createdAt": now,
        "updatedAt": now,
    }


def db_get_order(order_id: str) -> Optional[Dict[str, Any]]:
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM orders WHERE order_id = ?", (order_id,)
        ).fetchone()
    return _row_to_order(row) if row else None


def db_update_order_status(order_id: str, status: str) -> Optional[Dict[str, Any]]:
    with _get_conn() as conn:
        cursor = conn.execute(
            "UPDATE orders SET status = ?, updated_at = ? WHERE order_id = ?",
            (status, _now_iso(), order_id),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return None
    return db_get_order(order_id)


def db_get_order_history(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    return [_row_to_order(row) for row in rows]


def add_order_to_db(user_id: str, items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Kept for the chatbot order flow."""
    return db_create_order(user_id, items, source="chatbot")
