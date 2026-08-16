"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRatingAction } from "../actions";

export function RatingWidget({ recipeId, rating }: { recipeId: string; rating: number | null }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function set(value: number) {
    startTransition(async () => {
      await setRatingAction(recipeId, rating === value ? null : value);
      router.refresh();
    });
  }

  return (
    <div className={`flex gap-0.5 ${pending ? "opacity-60" : ""}`} role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => set(value)}
          aria-label={`${value} star${value === 1 ? "" : "s"}`}
          className="p-0.5 text-2xl leading-none"
        >
          <span className={value <= (rating ?? 0) ? "text-amber-400" : "text-neutral-300 dark:text-neutral-700"}>
            ★
          </span>
        </button>
      ))}
    </div>
  );
}
