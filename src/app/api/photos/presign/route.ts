import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { presignPhotoUpload } from "@/lib/s3";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const recipeId = typeof body?.recipeId === "string" ? body.recipeId : null;
  const contentType = typeof body?.contentType === "string" ? body.contentType : null;

  if (!recipeId || !contentType || !ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, userId: session.user.id },
    select: { id: true },
  });
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const ext = contentType.split("/")[1] ?? "jpg";
  const key = `recipes/${session.user.id}/${recipeId}/${randomUUID()}.${ext}`;

  const { uploadUrl, publicUrl } = await presignPhotoUpload(key, contentType);
  return NextResponse.json({ uploadUrl, publicUrl });
}
