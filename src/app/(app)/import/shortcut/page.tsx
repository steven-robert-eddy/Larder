import Link from "next/link";
import { requireUser } from "@/lib/session";
import { env } from "@/lib/env";
import { SelectableTextarea } from "../bookmarklet/selectable-textarea";

export default async function ShortcutPage() {
  await requireUser();
  const configured = Boolean(env.clipToken);
  const endpoint = `${env.baseUrl}/api/import/share`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Share from Instagram (iPhone)</h1>
        <p className="mt-1 text-sm text-neutral-500">
          iOS Safari doesn&apos;t support the web share-target API that Android uses (that&apos;s{" "}
          <span className="italic">/import/share-target</span>, Android/Chrome only), so on iPhone
          the equivalent is a one-time Shortcut you build yourself in Apple&apos;s Shortcuts app —
          no App Store, no developer account, just a few minutes of setup below. Once it&apos;s
          made, it shows up right in the native share sheet.
        </p>
      </div>

      {!configured ? (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Not set up yet — add <code>CLIP_TOKEN</code> to your <code>.env</code> (any random
          string, e.g. <code>openssl rand -hex 24</code>) and redeploy to enable this. This is the
          same token the clip bookmarklet uses, if you&apos;ve already set that up.
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              1. Create the Shortcut
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-neutral-600 dark:text-neutral-400">
              <li>
                Open the <span className="font-medium">Shortcuts</span> app (built into iOS) and
                tap <span className="font-medium">+</span> to create a new shortcut.
              </li>
              <li>
                Tap the settings icon (⋯) at the top, turn on{" "}
                <span className="font-medium">Show in Share Sheet</span>, then tap{" "}
                <span className="font-medium">Share Sheet Types</span> and enable both{" "}
                <span className="font-medium">URLs</span> and{" "}
                <span className="font-medium">Text</span> — Instagram sometimes shares one,
                sometimes the other.
              </li>
              <li>
                Rename the shortcut (tap its name at the top) to{" "}
                <span className="font-medium">Clip to Larder</span>.
              </li>
            </ol>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              2. Add a &quot;Get Contents of URL&quot; action
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-neutral-600 dark:text-neutral-400">
              <li>
                Search for and add the <span className="font-medium">Get Contents of URL</span>{" "}
                action.
              </li>
              <li>
                Set the URL to the address below, tap{" "}
                <span className="font-medium">Show More</span>, and set{" "}
                <span className="font-medium">Method</span> to <span className="font-medium">POST</span>.
              </li>
              <li>
                Under <span className="font-medium">Headers</span>, add two:{" "}
                <span className="font-medium">Authorization</span> = <span className="font-medium">Bearer</span>{" "}
                followed by the token below (one space, no line break), and{" "}
                <span className="font-medium">Content-Type</span> ={" "}
                <span className="font-medium">application/json</span>.
              </li>
              <li>
                Set <span className="font-medium">Request Body</span> to{" "}
                <span className="font-medium">JSON</span>, then add two fields — both set to the{" "}
                <span className="font-medium">Shortcut Input</span> magic variable (tap the field,
                pick it from the variable list): a field named{" "}
                <span className="font-medium">text</span> and a field named{" "}
                <span className="font-medium">url</span>. It&apos;s fine that both point to the
                same value — the server sorts out which one is actually a link.
              </li>
            </ol>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              3. Confirm it ran
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-neutral-600 dark:text-neutral-400">
              <li>
                Add a <span className="font-medium">Show Notification</span> action (or{" "}
                <span className="font-medium">Show Alert</span>) with the text{" "}
                <span className="font-medium">Saved to Larder</span>. Done — save the shortcut.
              </li>
            </ol>
            <p className="text-xs text-neutral-400">
              That&apos;s it — no need to parse the response or open a URL. The import already
              happened server-side by the time this runs; this step is just a confirmation so you
              know it fired. Check{" "}
              <Link href="/import" className="underline">
                Larder&apos;s import page
              </Link>{" "}
              afterward — anything waiting for review shows up right at the top.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Values for the steps above
            </h2>
            <p className="text-xs text-neutral-400">Endpoint URL:</p>
            <SelectableTextarea value={endpoint} />
            <p className="mt-2 text-xs text-neutral-400">
              Bearer token (goes after &quot;Bearer &quot; in the Authorization header):
            </p>
            <SelectableTextarea value={env.clipToken} />
            <p className="text-xs text-neutral-400">
              This token is a secret — don&apos;t share it or post it anywhere public.
            </p>
          </section>

          <section className="rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              To use it: open a Reel or post in Instagram, tap Share, scroll the app row and tap{" "}
              <span className="font-medium">Clip to Larder</span> (tap{" "}
              <span className="font-medium">More</span> first if it&apos;s not visible — you can
              pin it from there), then open Larder&apos;s import page to review what came through.
              Instagram&apos;s share sheet often only hands over the post link, not the caption —
              if that happens you&apos;ll land on a review screen with a &quot;paste the
              caption&quot; box instead of a filled-in recipe. That&apos;s expected, not a bug;
              paste the caption in and it&apos;ll extract from that instead. If nothing shows up
              on the import page at all after a share, that means the request itself failed
              (wrong token, wrong URL, etc.) — worth double-checking the values below against
              what you entered.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
