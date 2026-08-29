import { cn } from "@/lib/utils";

const TAG_STYLES: Record<string, string> = {
  vegan: "tag-vegan",
  vegetarian: "tag-vegetarian",
  halal: "tag-halal",
  "gluten-free": "tag-gluten-free",
  "no-nuts": "tag-no-nuts",
  "no-dairy": "tag-no-dairy",
};

const TAG_LABELS: Record<string, string> = {
  vegan: "Vegan",
  vegetarian: "Vegetarian",
  halal: "Halal",
  "gluten-free": "Gluten Free",
  "no-nuts": "No Nuts",
  "no-dairy": "No Dairy",
};

interface DietBadgeProps {
  tag: string;
  className?: string;
}

export function DietBadge({ tag, className }: DietBadgeProps) {
  const style = TAG_STYLES[tag] ?? "bg-muted text-muted-foreground border-border";
  const label = TAG_LABELS[tag] ?? tag;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-1.5 py-px text-[11px] font-medium leading-none",
        style,
        className
      )}
    >
      {label}
    </span>
  );
}
