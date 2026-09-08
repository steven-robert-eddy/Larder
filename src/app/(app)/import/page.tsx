import Link from "next/link";
import { requireUser } from "@/lib/session";
import { ImportUrlForm } from "./import-url-form";

export default async function ImportPage() {
  await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Import a recipe</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Paste a link and we&apos;ll try to pull out the title, ingredients, and steps automatically —
          you&apos;ll always get a chance to review before it&apos;s saved.
        </p>
      </div>

      <ImportUrlForm />

      <p className="text-sm text-neutral-400">
        Works best on sites that publish structured recipe data (most modern recipe blogs and
        publications do). If a page doesn&apos;t have any, you&apos;ll land on a blank review form
        instead of losing the attempt — or you can always{" "}
        <Link href="/recipes/new" className="underline">
          add it by hand
        </Link>
        .
      </p>
    </div>
  );
}
