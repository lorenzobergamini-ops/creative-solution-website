"use client";

import type { ServiceType } from "@/lib/gallery";

export type CategoryFilterValue = ServiceType | "all";

/**
 * Category filter chips (client component) for the gallery page.
 * Filters by service_type; "Tutti" resets the filter.
 */
export function CategoryFilter({
  options,
  active,
  onChange,
}: {
  options: { value: CategoryFilterValue; label: string }[];
  active: CategoryFilterValue;
  onChange: (value: CategoryFilterValue) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Filtra i progetti per categoria"
      className="flex flex-wrap gap-2"
    >
      {options.map((option) => {
        const selected = option.value === active;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`border px-4 py-2 font-display text-xs font-semibold uppercase tracking-[0.15em] transition-colors ${
              selected
                ? "border-accent bg-accent text-background"
                : "border-border bg-surface text-muted hover:border-accent hover:text-accent"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}