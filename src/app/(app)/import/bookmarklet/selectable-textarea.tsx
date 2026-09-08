"use client";

export function SelectableTextarea({ value }: { value: string }) {
  return (
    <textarea
      readOnly
      value={value}
      rows={4}
      onFocus={(e) => e.currentTarget.select()}
      className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300"
    />
  );
}
