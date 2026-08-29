"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useMemo, Suspense } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { fetchMenu } from "@/lib/api";
import { CATEGORIES, MEAL_PERIODS, DIET_TAGS } from "@/lib/constants";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import { CategoryFilter } from "@/components/menu/category-filter";
import { MenuItemSkeletonGrid } from "@/components/shared/skeleton-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import type { MenuItem } from "@/lib/types";

function MenuContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialCategory = searchParams.get("category") ?? "all";
  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [activeDiet, setActiveDiet] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const { data: items = [], isLoading, isError } = useQuery<MenuItem[]>({
    queryKey: ["menu"],
    queryFn: fetchMenu,
  });

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        category === "all" || item.category === category;
      const matchesPeriod =
        period === "all" ||
        item.meal_period === period ||
        item.meal_period === "all-day";
      const matchesSearch =
        !search ||
        item.name_en.toLowerCase().includes(search.toLowerCase()) ||
        item.description_en?.toLowerCase().includes(search.toLowerCase());
      const matchesDiet =
        activeDiet.length === 0 ||
        activeDiet.every((d) => item.diet_tags.includes(d));
      return matchesCategory && matchesPeriod && matchesSearch && matchesDiet;
    });
  }, [items, category, period, search, activeDiet]);

  const toggleDiet = (tag: string) => {
    setActiveDiet((prev) =>
      prev.includes(tag) ? prev.filter((d) => d !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setCategory("all");
    setPeriod("all");
    setSearch("");
    setActiveDiet([]);
  };

  const hasActiveFilters =
    category !== "all" ||
    period !== "all" ||
    search !== "" ||
    activeDiet.length > 0;

  return (
    <>
      <PageHeader
        title="Menu"
        description="Fresh Lebanese food, prepared daily."
      />

      <div className="page-container py-6">
        {/* Search + filter toggle */}
        <div className="flex gap-2 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              type="search"
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className={showFilters || hasActiveFilters ? "border-primary/40 text-primary" : ""}
          >
            <SlidersHorizontal size={14} />
            Filters
            {activeDiet.length > 0 && (
              <span className="ml-0.5 text-xs text-primary font-semibold">
                ({activeDiet.length})
              </span>
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>

        {/* Category tabs */}
        <CategoryFilter
          value={category}
          onChange={setCategory}
          className="mb-4"
        />

        {/* Expanded filters */}
        {showFilters && (
          <div className="mb-5 rounded-lg border border-border bg-card p-4 space-y-4">
            {/* Meal period */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Meal Period
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MEAL_PERIODS.map((mp) => (
                  <button
                    key={mp.value}
                    onClick={() => setPeriod(mp.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      period === mp.value
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dietary */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Dietary
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DIET_TAGS.map((tag) => (
                  <button
                    key={tag.value}
                    onClick={() => toggleDiet(tag.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      activeDiet.includes(tag.value)
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-4">
          {isLoading
            ? "Loading…"
            : `${filtered.length} ${filtered.length === 1 ? "item" : "items"}`}
        </p>

        {/* Grid */}
        {isLoading ? (
          <MenuItemSkeletonGrid count={12} />
        ) : isError ? (
          <EmptyState
            title="Couldn't load menu"
            description="Check that the backend is running, then refresh."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No items found"
            description="Try adjusting your search or filters."
            action={
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function MenuPage() {
  return (
    <Suspense>
      <MenuContent />
    </Suspense>
  );
}
