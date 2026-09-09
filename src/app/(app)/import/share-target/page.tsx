import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { runShareTargetImport } from "@/lib/import/paste-import";

/**
 * Receives the OS share sheet (manifest.json's share_target — Android /
 * Chrome only; iOS Safari doesn't implement the Web Share Target API, so
 * on iPhone /import/paste stays the only path in). A GET share_target
 * delivers the shared fields as query params on a full navigation.
 */
export default async function ShareTargetPage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; text?: string; url?: string }>;
}) {
  const user = await requireUser();
  const shared = await searchParams;

  if (!shared.title && !shared.text && !shared.url) {
    redirect("/import/paste");
  }

  const outcome = await runShareTargetImport(user.id, shared);
  redirect(`/import/${outcome.jobId}/review`);
}
