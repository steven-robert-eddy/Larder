import { requireUser } from "@/lib/session";
import { env } from "@/lib/env";
import { PasteImportForm } from "./paste-import-form";

export default async function PasteImportPage() {
  await requireUser();
  const configured = Boolean(env.anthropicApiKey);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Paste in a recipe</h1>
        <p className="mt-1 text-sm text-neutral-500">
          For anything that isn&apos;t a clean web page — an Instagram caption, a note you jotted
          down, a text someone sent you. Paste the whole thing and we&apos;ll split it into
          ingredients and steps for you to review.
        </p>
      </div>

      {!configured ? (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Not set up yet — add <code>ANTHROPIC_API_KEY</code> to your <code>.env</code> and redeploy
          to enable this.
        </div>
      ) : (
        <PasteImportForm />
      )}
    </div>
  );
}
