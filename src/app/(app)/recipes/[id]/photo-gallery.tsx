"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePhotoAction, setHeroPhotoAction } from "../actions";
import { PhotoUploader } from "./photo-uploader";

type Photo = { id: string; url: string; caption: string | null; isHero: boolean };

export function PhotoGallery({ recipeId, photos }: { recipeId: string; photos: Photo[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function setHero(id: string) {
    startTransition(async () => {
      await setHeroPhotoAction(recipeId, id);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deletePhotoAction(recipeId, id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {photos.length > 0 ? (
        <div className={`grid gap-2 ${pending ? "opacity-60" : ""}`} style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}>
          {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900">
              {/* eslint-disable-next-line @next/next/no-img-element -- remote/user-uploaded photos, not build-time optimizable */}
              <img src={photo.url} alt={photo.caption ?? ""} className="size-full object-cover" />
              {photo.isHero ? (
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Hero
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setHero(photo.id)}
                  className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100"
                >
                  Set as hero
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(photo.id)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <PhotoUploader recipeId={recipeId} />
    </div>
  );
}
