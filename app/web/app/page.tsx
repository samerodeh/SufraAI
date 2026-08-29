"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MessageCircle, CalendarDays, ChefHat } from "lucide-react";
import { motion } from "framer-motion";
import { fetchMenu } from "@/lib/api";
import { CATEGORIES } from "@/lib/constants";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import { MenuItemSkeletonGrid } from "@/components/shared/skeleton-card";
import { Button } from "@/components/ui/button";
import type { MenuItem } from "@/lib/types";

// Stagger animation for grid
const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};
const itemAnim = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function HomePage() {
  const { data: allItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["menu"],
    queryFn: fetchMenu,
  });

  // Show a small featured set on home page
  const featured = allItems
    ?.filter((i) => i.available)
    .slice(0, 8) ?? [];

  return (
    <>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-card">
        <div className="page-container py-14 sm:py-20">
          <div className="max-w-xl">
            <p className="text-xs font-medium uppercase tracking-widest text-primary mb-4">
              Montreal · Lebanese Kitchen
            </p>
            <h1 className="text-display text-foreground">
              أهلاً وسهلاً —{" "}
              <span className="text-primary">Welcome</span>
            </h1>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-md">
              Authentic Lebanese recipes prepared fresh every morning. Halal,
              no alcohol, no pork — just honest food made with care.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/menu">
                  Browse Menu
                  <ArrowRight size={15} />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/reservations">
                  <CalendarDays size={15} />
                  Reserve a Table
                </Link>
              </Button>
            </div>
          </div>

          {/* Info chips */}
          <div className="mt-10 flex flex-wrap gap-2">
            {[
              "Halal Certified",
              "Fresh Daily",
              "Dine-in & Pickup",
              "AI Order Assistant",
            ].map((label) => (
              <span
                key={label}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Today's Menu ─────────────────────────────────────────────────── */}
      <section className="section">
        <div className="page-container">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Today&apos;s Menu
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                A selection of what&apos;s fresh today
              </p>
            </div>
            <Link
              href="/menu"
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              View all
              <ArrowRight size={13} />
            </Link>
          </div>

          {isLoading ? (
            <MenuItemSkeletonGrid count={8} />
          ) : featured.length > 0 ? (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            >
              {featured.map((item) => (
                <motion.div key={item.id} variants={itemAnim}>
                  <MenuItemCard item={item} />
                </motion.div>
              ))}
            </motion.div>
          ) : null}
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      <section className="section border-t border-border bg-card">
        <div className="page-container">
          <h2 className="text-xl font-semibold tracking-tight mb-6">
            Browse by Category
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {CATEGORIES.filter((c) => c.value !== "all").map((cat) => {
              const count =
                allItems?.filter(
                  (i) => i.category === cat.value && i.available
                ).length ?? 0;
              return (
                <Link
                  key={cat.value}
                  href={`/menu?category=${cat.value}`}
                  className="group flex flex-col gap-1 rounded-lg border border-border bg-background p-4 transition-all hover:border-primary/30 hover:bg-accent/50"
                >
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {cat.label}
                  </span>
                  {count > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {count} {count === 1 ? "item" : "items"}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AI Chat CTA ──────────────────────────────────────────────────── */}
      <section className="section">
        <div className="page-container">
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ChefHat size={20} />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Not sure what to order?
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Ask our AI assistant — it knows the menu, dietary info, and
                    can help you choose.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="shrink-0">
                <Link href="/chat">
                  <MessageCircle size={15} />
                  Chat with SufraAI
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
