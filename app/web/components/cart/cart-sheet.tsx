"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Minus, Plus, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useCartStore, selectSubtotal, selectItemCount } from "@/store/cart-store";
import { formatPrice, calculateTax } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DietBadge } from "@/components/shared/diet-badge";

interface CartSheetProps {
  open: boolean;
  onClose: () => void;
}

export function CartSheet({ open, onClose }: CartSheetProps) {
  const { items, updateQuantity, removeItem } = useCartStore();
  const subtotal = useCartStore(selectSubtotal);
  const itemCount = useCartStore(selectItemCount);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const tax = calculateTax(subtotal);
  const total = subtotal + tax;

  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={overlayRef}
            key="cart-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/30"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="cart-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-card shadow-2xl"
            role="dialog"
            aria-label="Shopping cart"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium">
                  Cart
                  {itemCount > 0 && (
                    <span className="ml-1.5 text-muted-foreground font-normal">
                      ({itemCount} {itemCount === 1 ? "item" : "items"})
                    </span>
                  )}
                </span>
              </div>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Close cart"
              >
                <X size={16} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <ShoppingBag size={20} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Your cart is empty
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Browse the menu to add items
                    </p>
                  </div>
                  <Link href="/menu" onClick={onClose}>
                    <Button variant="outline" size="sm" className="mt-1">
                      Browse Menu
                    </Button>
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((item) => (
                    <motion.li
                      key={`${item.id}::${item.variant ?? ""}`}
                      layout
                      exit={{ opacity: 0, height: 0 }}
                      className="flex gap-3 px-5 py-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.name_en}
                        </p>
                        {item.variant && (
                          <p className="text-xs text-muted-foreground capitalize">
                            {item.variant}
                          </p>
                        )}
                        {item.modifications && item.modifications.length > 0 && (
                          <p className="text-xs text-muted-foreground truncate">
                            + {item.modifications.join(", ")}
                          </p>
                        )}
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>

                      {/* Quantity control + remove */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          onClick={() =>
                            removeItem(item.id, item.variant)
                          }
                          className="text-muted-foreground transition-colors hover:text-destructive"
                          aria-label={`Remove ${item.name_en}`}
                        >
                          <Trash2 size={13} />
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                item.quantity - 1,
                                item.variant
                              )
                            }
                            className="flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="w-5 text-center text-sm tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                item.quantity + 1,
                                item.variant
                              )
                            }
                            className="flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            aria-label="Increase quantity"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>

            {/* Summary + checkout */}
            {items.length > 0 && (
              <div className="border-t border-border px-5 py-4 space-y-3">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax (QST + GST)</span>
                    <span>{formatPrice(tax)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-foreground pt-1 border-t border-border">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
                <Link href="/cart" onClick={onClose} className="block">
                  <Button className="w-full" size="lg">
                    Proceed to Checkout
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
