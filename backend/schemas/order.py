from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class ReorderBody(BaseModel):
    userId: str = "guest"
    orderId: str


class UpdateOrderStatusBody(BaseModel):
    status: str


class CreateOrderBody(BaseModel):
    userId: str = "guest"
    items: List[Dict[str, Any]] = Field(default_factory=list)
    source: str = "cart"
    reservationId: Optional[str] = None
    paymentMethod: str = "card"
    deliveryMethod: str = "pickup"
    deliveryAddress: Optional[str] = None
    promoCode: Optional[str] = None
    subtotal: float = 0.0
    tax: float = 0.0
    tip: float = 0.0
    total: float = 0.0
