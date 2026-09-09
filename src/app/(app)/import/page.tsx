import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ImportUrlForm } from "./import-url-form";

const KIND_LABEL: Record<string, string> = {
  WEB: "Web import",
  PASTE: "Pasted text",
  PHOTO: "Screenshots",
  INSTAGRAM: "Instagram",
};

function timeAgo(date: Date): string {
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function ImportPage() {
  const user = await requireUser();

  const pending = await prisma.importJob.findMany({
    where: { userId: user.id, status: "NEEDS_REVIEW" },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Import a recipe</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Paste a link and we&apos;ll try to pull out the title, ingredients, and steps automatically —
          you&apos;ll always get a chance to review before it&apos;s saved.
        </p>
      </div>

      {pending.length > 0 ? (
        <section className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Waiting for review
          </h2>
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-900">
            {pending.map((job) => {
              const title = (job.parsedPayload as { title?: string } | null)?.title;
              return (
                <li key={job.id}>
                  <Link
                    href={`/import/${job.id}/review`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="truncate">
                      {title ?? `${KIND_LABEL[job.kind] ?? job.kind} (needs review)`}
                    </span>
                    <span className="shrink-0 text-xs text-neutral-400">{timeAgo(job.createdAt)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <ImportUrlForm />

      <p className="text-sm text-neutral-400">
        Works best on sites that publish structured recipe data (most modern recipe blogs and
        publications do). If a page doesn&apos;t have any, AI does its best to pull out ingredients
        and steps instead of leaving you with a blank form — or you can always{" "}
        <Link href="/recipes/new" className="underline">
          add it by hand
        </Link>
        .
      </p>

      <div className="rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Got an Instagram caption, a note, or something with no URL at all?{" "}
          <Link href="/import/paste" className="font-medium underline">
            Paste it in
          </Link>{" "}
          if you can select the text. Can&apos;t select it, or it&apos;s too long for one
          screenshot? <Link href="/import/photo" className="font-medium underline">
            Upload screenshots instead
          </Link>{" "}
          — a screenshot always works, unlike copy/paste, and you can send several at once for a
          long caption. On Android, Larder also shows up right in the share sheet once installed
          as an app; on iPhone that takes a{" "}
          <Link href="/import/shortcut" className="font-medium underline">
            one-time Shortcuts setup
          </Link>{" "}
          and only helps if Instagram actually hands over the caption text (it often doesn&apos;t) —
          screenshots are the more reliable bet on iPhone.
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Getting blocked on a site like Allrecipes? Big commercial sites often refuse
          requests that don&apos;t look like a real browser.{" "}
          <Link href="/import/bookmarklet" className="font-medium underline">
            Set up the clip bookmarklet
          </Link>{" "}
          to import from inside your own browser instead.
        </p>
      </div>
    </div>
  );
}
