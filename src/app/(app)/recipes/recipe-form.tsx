"use client";

import { useActionState, useId, useState } from "react";
import type { IngredientFormValues, StepFormValues } from "@/lib/validation";
import type { RecipeFormState } from "./form-schema";
import { FACET_LABELS, tagLabel } from "@/lib/taxonomy";
import type { TagFacet } from "@/generated/prisma/enums";
import { EMPTY_INGREDIENT, EMPTY_STEP, type FormTag, type RecipeFormInitialValues } from "./recipe-form-types";

export type { FormTag, RecipeFormInitialValues };

export function RecipeForm({
  action,
  initialValues,
  availableTags,
  submitLabel,
}: {
  action: (state: RecipeFormState, formData: FormData) => Promise<RecipeFormState>;
  initialValues: RecipeFormInitialValues;
  availableTags: FormTag[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [ingredients, setIngredients] = useState<IngredientFormValues[]>(initialValues.ingredients);
  const [steps, setSteps] = useState<StepFormValues[]>(initialValues.steps);
  const [tagIds, setTagIds] = useState<string[]>(initialValues.tagIds);

  const tagsByFacet = groupByFacet(availableTags);

  return (
    <form action={formAction} className="flex flex-col gap-8 pb-24">
      <input type="hidden" name="ingredientsJson" value={JSON.stringify(ingredients)} />
      <input type="hidden" name="stepsJson" value={JSON.stringify(steps)} />
      <input type="hidden" name="tagIdsJson" value={JSON.stringify(tagIds)} />

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300" role="alert">
          {state.error}
        </p>
      ) : null}

      <Section title="Basics">
        <Field label="Title" error={state.fieldErrors?.title}>
          <input name="title" defaultValue={initialValues.title} required className={inputClass} />
        </Field>
        <Field label="Description">
          <textarea name="description" defaultValue={initialValues.description} rows={2} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Servings">
            <input name="servingsYield" defaultValue={initialValues.servingsYield} inputMode="decimal" className={inputClass} />
          </Field>
          <Field label="Unit">
            <input name="servingsUnit" defaultValue={initialValues.servingsUnit} placeholder="servings" className={inputClass} />
          </Field>
          <Field label="Prep (min)">
            <input name="prepMinutes" defaultValue={initialValues.prepMinutes} inputMode="numeric" className={inputClass} />
          </Field>
          <Field label="Cook (min)">
            <input name="cookMinutes" defaultValue={initialValues.cookMinutes} inputMode="numeric" className={inputClass} />
          </Field>
        </div>
        <Field label="Total time (min)" hint="Leave blank to use prep + cook.">
          <input name="totalMinutes" defaultValue={initialValues.totalMinutes} inputMode="numeric" className={inputClass} />
        </Field>
      </Section>

      <Section title="Source">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select name="sourceType" defaultValue={initialValues.sourceType} className={inputClass}>
              <option value="MANUAL">Manual</option>
              <option value="WEB">Web</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="COOKBOOK">Cookbook</option>
            </select>
          </Field>
          <Field label="Name" hint='e.g. "Serious Eats"'>
            <input name="sourceName" defaultValue={initialValues.sourceName} className={inputClass} />
          </Field>
        </div>
        <Field label="URL">
          <input name="sourceUrl" defaultValue={initialValues.sourceUrl} type="url" className={inputClass} />
        </Field>
        <Field label="Author">
          <input name="sourceAuthor" defaultValue={initialValues.sourceAuthor} className={inputClass} />
        </Field>
      </Section>

      <Section title="Ingredients" error={state.fieldErrors?.ingredients}>
        <div className="flex flex-col gap-2">
          {ingredients.map((ing, i) => (
            <IngredientRow
              key={i}
              value={ing}
              onChange={(next) => setIngredients((rows) => rows.map((r, idx) => (idx === i ? next : r)))}
              onRemove={ingredients.length > 1 ? () => setIngredients((rows) => rows.filter((_, idx) => idx !== i)) : undefined}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setIngredients((rows) => [...rows, { ...EMPTY_INGREDIENT }])}
          className={addButtonClass}
        >
          + Add ingredient
        </button>
      </Section>

      <Section title="Steps" error={state.fieldErrors?.steps}>
        <div className="flex flex-col gap-2">
          {steps.map((step, i) => (
            <StepRow
              key={i}
              index={i}
              value={step}
              onChange={(next) => setSteps((rows) => rows.map((r, idx) => (idx === i ? next : r)))}
              onRemove={steps.length > 1 ? () => setSteps((rows) => rows.filter((_, idx) => idx !== i)) : undefined}
            />
          ))}
        </div>
        <button type="button" onClick={() => setSteps((rows) => [...rows, { ...EMPTY_STEP }])} className={addButtonClass}>
          + Add step
        </button>
      </Section>

      <Section title="Tags">
        <div className="flex flex-col gap-4">
          {(Object.keys(FACET_LABELS) as TagFacet[])
            .filter((facet) => tagsByFacet[facet]?.length)
            .map((facet) => (
              <div key={facet}>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {FACET_LABELS[facet]}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(tagsByFacet[facet] ?? []).map((tag) => {
                    const active = tagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() =>
                          setTagIds((ids) => (active ? ids.filter((id) => id !== tag.id) : [...ids, tag.id]))
                        }
                        className={`rounded-full border px-3 py-1.5 text-sm transition ${
                          active
                            ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                            : "border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
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
      </Section>

      <Section title="Notes">
        <textarea name="notes" defaultValue={initialValues.notes} rows={3} placeholder="Your own tweaks..." className={inputClass} />
      </Section>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none dark:border-neutral-800 dark:bg-neutral-950/95">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-neutral-900 px-4 py-3 text-base font-medium text-white transition active:scale-[0.98] disabled:opacity-60 sm:w-auto dark:bg-neutral-100 dark:text-neutral-900"
        >
          {pending ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function IngredientRow({
  value,
  onChange,
  onRemove,
}: {
  value: IngredientFormValues;
  onChange: (v: IngredientFormValues) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-neutral-200 p-2.5 dark:border-neutral-800">
      <div className="flex-1 flex flex-col gap-1.5">
        <input
          value={value.rawText}
          onChange={(e) => onChange({ ...value, rawText: e.target.value })}
          placeholder='"2 cloves garlic, minced"'
          className={inputClass}
        />
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5 text-neutral-500">
            <input
              type="checkbox"
              checked={value.isOptional}
              onChange={(e) => onChange({ ...value, isOptional: e.target.checked })}
            />
            optional
          </label>
          <input
            value={value.section ?? ""}
            onChange={(e) => onChange({ ...value, section: e.target.value || undefined })}
            placeholder="section (optional)"
            className="flex-1 rounded border border-neutral-200 px-2 py-1 dark:border-neutral-800 dark:bg-neutral-950"
          />
        </div>
      </div>
      {onRemove ? (
        <button type="button" onClick={onRemove} aria-label="Remove ingredient" className={removeButtonClass}>
          ×
        </button>
      ) : null}
    </div>
  );
}

function StepRow({
  index,
  value,
  onChange,
  onRemove,
}: {
  index: number;
  value: StepFormValues;
  onChange: (v: StepFormValues) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-neutral-200 p-2.5 dark:border-neutral-800">
      <span className="mt-2 w-5 shrink-0 text-sm font-medium text-neutral-400">{index + 1}</span>
      <div className="flex-1 flex flex-col gap-1.5">
        <textarea
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          rows={2}
          placeholder="What to do in this step..."
          className={inputClass}
        />
        <input
          value={value.section ?? ""}
          onChange={(e) => onChange({ ...value, section: e.target.value || undefined })}
          placeholder="section (optional)"
          className="rounded border border-neutral-200 px-2 py-1 text-xs dark:border-neutral-800 dark:bg-neutral-950"
        />
      </div>
      {onRemove ? (
        <button type="button" onClick={onRemove} aria-label="Remove step" className={removeButtonClass}>
          ×
        </button>
      ) : null}
    </div>
  );
}

function Section({ title, error, children }: { title: string; error?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{title}</h2>
      {children}
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-neutral-400">{hint}</p> : null}
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}

function groupByFacet(tags: FormTag[]) {
  const out: Partial<Record<TagFacet, FormTag[]>> = {};
  for (const tag of tags) {
    (out[tag.facet] ??= []).push(tag);
  }
  return out;
}

const inputClass =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-base outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-100";
const addButtonClass =
  "self-start rounded-lg border border-dashed border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-400";
const removeButtonClass =
  "mt-1 flex size-7 shrink-0 items-center justify-center rounded-full text-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800";
