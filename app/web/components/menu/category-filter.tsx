"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";

interface CategoryFilterProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function CategoryFilter({
  value,
  onChange,
  className,
}: CategoryFilterProps) {
  return (
    <div className={cn("scroll-row", className)}>
      {CATEGORIES.map((cat) => {
        const active = value === cat.value;
        return (
          <button
            key={cat.value}
            onClick={() => onChange(cat.value)}
            className={cn(
              "relative shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="category-pill"
                className="absolute inset-0 rounded-full bg-primary/10 border border-primary/20"
                transition={{ type: "spring", bounce: 0.25, duration: 0.35 }}
              />
            )}
            <span className="relative">{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}
