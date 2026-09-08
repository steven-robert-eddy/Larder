"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function loginAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const passphrase = formData.get("passphrase");
  const callbackUrl = formData.get("callbackUrl");

  try {
    await signIn("credentials", {
      passphrase,
      redirectTo: typeof callbackUrl === "string" && callbackUrl ? callbackUrl : "/recipes",
    });
    return { error: null };
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Wrong passphrase." };
    }
    throw err;
  }
}
