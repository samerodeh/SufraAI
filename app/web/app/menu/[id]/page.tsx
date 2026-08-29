"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Minus,
  ShoppingBag,
  MessageCircle,
  Check,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { fetchMenu } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import { DietBadge } from "@/components/shared/diet-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MenuItem } from "@/lib/types";

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [selectedMods, setSelectedMods] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const { data: items, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["menu"],
    queryFn: fetchMenu,
  });

  const item = items?.find((i) => i.id === id);

  if (isLoading) {
    return (
      <div className="page-container py-8">
        <Skeleton className="h-5 w-24 mb-6" />
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-[4/3] rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-9 w-32 mt-4" />
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="page-container py-16 text-center">
        <p className="text-sm text-muted-foreground">Item not found.</p>
        <Link href="/menu">
          <Button variant="outline" size="sm" className="mt-4">
            Back to Menu
          </Button>
        </Link>
      </div>
    );
  }

  const toggleMod = (mod: string) => {
    setSelectedMods((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const handleAddToCart = () => {
    addItem({
      id: item.id,
      name_en: item.name_en,
      name_ar: item.name_ar,
      price: item.price,
      quantity,
      variant: selectedVariant || item.variants[0] || undefined,
      modifications: selectedMods,
      image_url: item.image_url,
    });
    setAdded(true);
    toast.success(`Added ${item.name_en}`, {
      description: `${quantity}× ${formatPrice(item.price * quantity)}`,
    });
    setTimeout(() => setAdded(false), 2000);
  };

  const allMods = [
    ...(item.modifications.toppings?.map((m) => ({ label: m, group: "Toppings" })) ?? []),
    ...(item.modifications.sauces?.map((m) => ({ label: m, group: "Sauces" })) ?? []),
    ...(item.modifications.add_ons?.map((m) => ({ label: m, group: "Add-ons" })) ?? []),
    ...(item.modifications.spice_level?.map((m) => ({ label: m, group: "Spice Level" })) ?? []),
  ];

  return (
    <div className="page-container py-6 sm:py-10">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Menu
      </button>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
          <Image
            src={item.image_url}
            alt={item.name_en}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            priority
            unoptimized
          />
          {!item.available && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <span className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          {/* Name + price */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {item.name_en}
            </h1>
            {item.name_ar && (
              <p className="mt-0.5 text-base text-muted-foreground" dir="rtl">
                {item.name_ar}
              </p>
            )}
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xl font-semibold tabular-nums">
                {formatPrice(item.price)}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {item.diet_tags.map((tag) => (
                  <DietBadge key={tag} tag={tag} />
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {item.description_en}
          </p>

          {/* Allergens warning */}
          {item.allergens.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>
                Contains: {item.allergens.join(", ")}
              </span>
            </div>
          )}

          {/* Variants */}
          {item.variants.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Size</p>
              <div className="flex flex-wrap gap-2">
                {item.variants.map((v) => (
                  <button
                    key={v}
                    onClick={() => setSelectedVariant(v)}
                    className={`rounded-md border px-4 py-1.5 text-sm capitalize transition-colors ${
                      selectedVariant === v
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-transparent text-foreground hover:border-primary/40"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Modifications */}
          {allMods.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Customize</p>
              <div className="flex flex-wrap gap-2">
                {allMods.map(({ label, group }) => (
                  <button
                    key={label}
                    onClick={() => toggleMod(label)}
                    className={`rounded-md border px-3 py-1.5 text-xs capitalize transition-colors ${
                      selectedMods.includes(label)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ingredients */}
          {item.ingredients.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-medium">Ingredients</p>
              <p className="text-sm text-muted-foreground">
                {item.ingredients.join(", ")}
              </p>
            </div>
          )}

          {/* Quantity + Add to cart */}
          {item.available && (
            <div className="flex items-center gap-3 pt-2">
              {/* Quantity stepper */}
              <div className="flex items-center gap-1 rounded-md border border-border">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Decrease quantity"
                >
                  <Minus size={13} />
                </button>
                <span className="w-8 text-center text-sm font-medium tabular-nums">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Increase quantity"
                >
                  <Plus size={13} />
                </button>
              </div>

              <Button
                onClick={handleAddToCart}
                size="lg"
                className="flex-1"
                disabled={added}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {added ? (
                    <motion.span
                      key="added"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-2"
                    >
                      <Check size={15} />
                      Added!
                    </motion.span>
                  ) : (
                    <motion.span
                      key="add"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2"
                    >
                      <ShoppingBag size={15} />
                      Add to Cart · {formatPrice(item.price * quantity)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          )}

          {/* Ask the Chef */}
          <Link
            href={`/chat?item=${encodeURIComponent(item.name_en)}`}
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            <MessageCircle size={12} />
            Have questions? Ask SufraAI about this item
          </Link>
        </div>
      </div>
    </div>
  );
}
