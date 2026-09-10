"use client";

import { useMemo, useState } from "react";
import {
  SERVICE_TYPE_LABELS,
  type GalleryProject,
  type ServiceType,
} from "@/lib/gallery";
import { CategoryFilter, type CategoryFilterValue } from "./CategoryFilter";
import { GalleryCard } from "./GalleryCard";

const FILTER_ORDER: ServiceType[] = [
  "fdm_print",
  "resin_print",
  "custom_parts",
  "prototypes",
  "design_3d",
  "other",
];

/**
 * Client-side interactive layer of the gallery page: category chips + grid.
 * The data is fetched server-side (getPublishedProjects) and passed in.
 */
export function GalleryView({ projects }: { projects: GalleryProject[] }) {
  const [activeCategory, setActiveCategory] =
    useState<CategoryFilterValue>("all");

  // Chips: "Tutti" first, then the categories actually present, in a fixed
  // brand order (not the DB insertion order).
  const filterOptions = useMemo(() => {
    const present = new Set(
      projects
        .map((project) => project.serviceType)
        .filter((type): type is ServiceType => type !== null),
    );
    const options: { value: CategoryFilterValue; label: string }[] = [
      { value: "all", label: "Tutti" },
    ];
    for (const type of FILTER_ORDER) {
      if (present.has(type)) {
        options.push({ value: type, label: SERVICE_TYPE_LABELS[type] });
      }
    }
    return options;
  }, [projects]);

  const visibleProjects =
    activeCategory === "all"
      ? projects
      : projects.filter(
          (project) => project.serviceType === activeCategory,
        );

  return (
    <div className="flex flex-col gap-8">
      <CategoryFilter
        options={filterOptions}
        active={activeCategory}
        onChange={setActiveCategory}
      />

      {visibleProjects.length === 0 ? (
        <div className="bg-grid border border-dashed border-border px-6 py-14 text-center">
          <p className="text-sm leading-relaxed text-muted">
            <span className="font-semibold text-foreground">
              Nessun progetto in questa categoria.
            </span>{" "}
            Prova a selezionarne un&apos;altra.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProjects.map((project) => (
            <GalleryCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}