"use client";

import Link from "next/link";
import Image from "next/image";
import { Plus, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import { DietBadge } from "@/components/shared/diet-badge";
import type { MenuItem } from "@/lib/types";

interface MenuItemCardProps {
  item: MenuItem;
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [adding, setAdding] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!item.available) return;

    setAdding(true);
    addItem({
      id: item.id,
      name_en: item.name_en,
      name_ar: item.name_ar,
      price: item.price,
      image_url: item.image_url,
    });
    toast.success(`Added ${item.name_en}`, {
      description: formatPrice(item.price),
    });
    setTimeout(() => setAdding(false), 600);
  };

  return (
    <Link
      href={`/menu/${item.id}`}
      className={cn(
        "group block rounded-lg border border-border bg-card overflow-hidden",
        "transition-shadow duration-200 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.12)]",
        !item.available && "opacity-60 pointer-events-none"
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={item.image_url}
          alt={item.name_en}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          unoptimized
        />
        {!item.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5">
        {/* Name + diet badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-snug truncate">
              {item.name_en}
            </p>
            {item.name_ar && (
              <p className="text-xs text-muted-foreground" dir="rtl">
                {item.name_ar}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {item.description_en && (
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {item.description_en}
          </p>
        )}

        {/* Diet tags */}
        {item.diet_tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.diet_tags.slice(0, 3).map((tag) => (
              <DietBadge key={tag} tag={tag} />
            ))}
          </div>
        )}

        {/* Price + add button */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {formatPrice(item.price)}
          </span>
          {item.available && (
            <motion.button
              onClick={handleAdd}
              animate={adding ? { scale: [1, 0.9, 1.15, 1] } : {}}
              transition={{ duration: 0.4, type: "spring" }}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md",
                "bg-primary text-primary-foreground",
                "transition-colors hover:bg-primary/85 active:bg-primary/75",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              )}
              aria-label={`Add ${item.name_en} to cart`}
            >
              {adding ? (
                <ShoppingBag size={13} />
              ) : (
                <Plus size={13} strokeWidth={2.5} />
              )}
            </motion.button>
          )}
        </div>
      </div>
    </Link>
  );
}
