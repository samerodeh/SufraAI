"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  useCartStore,
  selectSubtotal,
  selectItemCount,
} from "@/store/cart-store";
import { useAuthStore } from "@/store/auth-store";
import { createOrder } from "@/lib/api";
import { formatPrice, calculateTax } from "@/lib/utils";
import { TIP_OPTIONS, TAX_RATE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart } = useCartStore();
  const subtotal = useCartStore(selectSubtotal);
  const itemCount = useCartStore(selectItemCount);
  const { userId, isAuthenticated } = useAuthStore();

  const [tipPct, setTipPct] = useState<number>(0);
  const [placing, setPlacing] = useState(false);
  const [promoCode, setPromoCode] = useState("");

  const tax = calculateTax(subtotal);
  const tip = subtotal * (tipPct / 100);
  const total = subtotal + tax + tip;

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      router.push("/auth?redirect=/cart");
      return;
    }

    setPlacing(true);
    try {
      const order = await createOrder({
        userId: userId!,
        items: items.map((i) => ({
          id: i.id,
          name_en: i.name_en,
          price: i.price,
          quantity: i.quantity,
          variant: i.variant,
          modifications: i.modifications,
        })),
        source: "cart",
      });
      clearCart();
      router.push(`/orders/${order.id}`);
    } catch {
      toast.error("Couldn't place your order", {
        description: "Please try again or contact us.",
      });
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <>
        <PageHeader title="Cart" />
        <div className="page-container">
          <EmptyState
            title="Your cart is empty"
            description="Head back to the menu and pick something delicious."
            icon={<ShoppingBag size={22} />}
            action={
              <Button asChild>
                <Link href="/menu">Browse Menu</Link>
              </Button>
            }
            className="py-24"
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Cart"
        description={`${itemCount} ${itemCount === 1 ? "item" : "items"}`}
      />

      <div className="page-container py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                Your Order
              </h2>
              <button
                onClick={clearCart}
                className="text-xs text-muted-foreground transition-colors hover:text-destructive"
              >
                Clear all
              </button>
            </div>

            <ul className="divide-y divide-border rounded-lg border border-border">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.li
                    key={`${item.id}::${item.variant ?? ""}`}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-4 overflow-hidden px-5 py-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
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
                    </div>

                    {/* Quantity stepper */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            item.quantity - 1,
                            item.variant
                          )
                        }
                        className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        aria-label="Decrease"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="w-6 text-center text-sm tabular-nums">
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
                        className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        aria-label="Increase"
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    <span className="w-16 text-right text-sm font-medium tabular-nums">
                      {formatPrice(item.price * item.quantity)}
                    </span>

                    <button
                      onClick={() => removeItem(item.id, item.variant)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      aria-label={`Remove ${item.name_en}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            {/* Promo code */}
            <div className="mt-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    placeholder="Promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className="pl-8 text-sm uppercase"
                  />
                </div>
                <Button variant="outline" size="sm" className="shrink-0">
                  Apply
                </Button>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div>
            <div className="sticky top-20 rounded-lg border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold">Order Summary</h2>

              {/* Tip */}
              <div>
                <p className="mb-2 text-xs text-muted-foreground">
                  Add a tip
                </p>
                <div className="flex gap-1.5">
                  {TIP_OPTIONS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTipPct(t)}
                      className={`flex-1 rounded-md border py-1.5 text-xs font-medium transition-colors ${
                        tipPct === t
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t === 0 ? "None" : `${t}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2 text-sm border-t border-border pt-3">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({(TAX_RATE * 100).toFixed(3)}%)</span>
                  <span className="tabular-nums">{formatPrice(tax)}</span>
                </div>
                {tip > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tip ({tipPct}%)</span>
                    <span className="tabular-nums">{formatPrice(tip)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-foreground pt-1 border-t border-border">
                  <span>Total</span>
                  <span className="tabular-nums">{formatPrice(total)}</span>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                className="w-full"
                size="lg"
                disabled={placing}
              >
                {placing ? "Placing order…" : "Place Order"}
              </Button>

              {!isAuthenticated && (
                <p className="text-center text-xs text-muted-foreground">
                  You&apos;ll need to{" "}
                  <Link
                    href="/auth"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    sign in
                  </Link>{" "}
                  to place your order.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
