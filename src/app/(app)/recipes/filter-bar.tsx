"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FACET_LABELS, tagLabel } from "@/lib/taxonomy";
import type { TagFacet } from "@/generated/prisma/enums";
import type { RecipeSort, RecipeView } from "@/lib/recipes";

export type FilterTag = { id: string; facet: TagFacet; name: string };

const SORTS: { value: RecipeSort; label: string }[] = [
  { value: "recent", label: "Recently added" },
  { value: "rating", label: "Rating" },
  { value: "lastCooked", label: "Last cooked" },
  { value: "alpha", label: "Alphabetical" },
];

const PRESETS = [
  { label: "Quick dinners", params: { facet_MEAL: ["dinner"], facet_EFFORT: ["weeknight"] } },
  { label: "Never made", params: { never: ["1"] } },
  { label: "Haven't made in 3 months", params: { stale: ["1"] } },
  { label: "Top rated", params: { sort: ["rating"] } },
];

export function FilterBar({ tags }: { tags: FilterTag[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tagsByFacet = groupByFacet(tags);
  const facets = Object.keys(FACET_LABELS) as TagFacet[];

  function currentValues(key: string) {
    return searchParams.getAll(key);
  }

  function updateParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    router.push(`/recipes?${params.toString()}`, { scroll: false });
  }

  function toggleFacetValue(facet: TagFacet, name: string) {
    updateParams((params) => {
      const key = `facet_${facet}`;
      const existing = params.getAll(key);
      params.delete(key);
      const next = existing.includes(name) ? existing.filter((v) => v !== name) : [...existing, name];
      next.forEach((v) => params.append(key, v));
    });
  }

  function applyPreset(preset: (typeof PRESETS)[number]) {
    updateParams((params) => {
      // Presets replace filters/sort but keep the search term.
      const q = params.get("q");
      for (const key of Array.from(params.keys())) params.delete(key);
      if (q) params.set("q", q);
      for (const [key, values] of Object.entries(preset.params)) {
        for (const v of values) params.append(key, v);
      }
    });
  }

  const activeFacetCount = facets.reduce((sum, f) => sum + currentValues(`facet_${f}`).length, 0);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        defaultValue={searchParams.get("q") ?? ""}
        placeholder="Search recipes, ingredients, notes..."
        onChange={(e) => {
          const value = e.target.value;
          updateParams((params) => {
            if (value) params.set("q", value);
            else params.delete("q");
          });
        }}
        className="w-full min-w-0 rounded-lg border border-neutral-300 px-3 py-2 text-base outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-100"
      />
      <div className="flex gap-2">
        <select
          value={searchParams.get("sort") ?? "recent"}
          onChange={(e) => updateParams((params) => params.set("sort", e.target.value))}
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <ViewToggle
          value={(searchParams.get("view") as RecipeView) ?? "grid"}
          onChange={(v) => updateParams((params) => params.set("view", v))}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyPreset(preset)}
            className="shrink-0 rounded-full border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <details className="rounded-lg border border-neutral-200 dark:border-neutral-800">
        <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Filters{activeFacetCount > 0 ? ` (${activeFacetCount})` : ""}
        </summary>
        <div className="flex flex-col gap-4 border-t border-neutral-200 p-3 dark:border-neutral-800">
          {facets
            .filter((f) => tagsByFacet[f]?.length)
            .map((facet) => (
              <div key={facet}>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {FACET_LABELS[facet]}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(tagsByFacet[facet] ?? []).map((tag) => {
                    const active = currentValues(`facet_${facet}`).includes(tag.name);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleFacetValue(facet, tag.name)}
                        className={`rounded-full border px-2.5 py-1 text-xs transition ${
                          active
                            ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                            : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
                        }`}
                      >
                        {tagLabel(facet, tag.name)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </details>
    </div>
  );
}

function ViewToggle({ value, onChange }: { value: RecipeView; onChange: (v: RecipeView) => void }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-700">
      {(["grid", "list"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-label={`${v} view`}
          className={`px-2.5 py-2 text-xs ${
            value === v
              ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
              : "text-neutral-500"
          }`}
        >
          {v === "grid" ? "▦" : "☰"}
        </button>
      ))}
    </div>
  );
}

function groupByFacet(tags: FilterTag[]) {
  const out: Partial<Record<TagFacet, FilterTag[]>> = {};
  for (const tag of tags) {
    (out[tag.facet] ??= []).push(tag);
  }
  return out;
}
