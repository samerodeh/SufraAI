# fastapi imports
from fastapi import APIRouter, HTTPException
# other imports
from schemas.order import CreateOrderBody, ReorderBody, UpdateOrderStatusBody
from data_store import create_order, get_order, update_order_status, get_order_history

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/")
def post_order(body: CreateOrderBody):
    return create_order(body.model_dump())


# Literal paths must be declared before /{order_id}, otherwise "history" and
# "reorder" get captured as an order id.
@router.get("/history")
def get_orders_history(user_id: str = "guest"):
    return {"userId": user_id, "orders": get_order_history(user_id)}


@router.post("/reorder")
def post_reorder(body: ReorderBody):
    order = get_order(body.orderId)
    if not order:
        raise HTTPException(status_code=404, detail="Original order not found")
    return create_order(
        {
            "userId": body.userId,
            "items": order.get("items", []),
            "source": "reorder",
        }
    )


@router.get("/{order_id}")
def get_order_by_id(order_id: str):
    order = get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.patch("/{order_id}/status")
def patch_order_status(order_id: str, body: UpdateOrderStatusBody):
    order = update_order_status(order_id, body.status)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order
