import { requireUser } from "@/lib/session";
import { env } from "@/lib/env";
import { PhotoImportForm } from "./photo-import-form";

export default async function PhotoImportPage() {
  await requireUser();
  const configured = Boolean(env.anthropicApiKey);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Import from screenshots</h1>
        <p className="mt-1 text-sm text-neutral-500">
          For captions you can&apos;t select or copy in an app (Instagram especially) — screenshot
          it instead. A screenshot always works, since it&apos;s just a picture of whatever&apos;s on
          screen, regardless of what the app allows you to select. If the caption is long, take
          several screenshots scrolling down and upload them all at once — nothing gets missed to
          a single screen&apos;s worth of text.
        </p>
      </div>

      {!configured ? (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Not set up yet — add <code>ANTHROPIC_API_KEY</code> to your <code>.env</code> and redeploy
          to enable this.
        </div>
      ) : (
        <PhotoImportForm />
      )}
    </div>
  );
}
