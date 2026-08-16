import { prisma } from "@/lib/prisma";
import type { TagFacet } from "@/generated/prisma/enums";

export async function listTagsForUser(userId: string) {
  return prisma.tag.findMany({
    where: { userId },
    orderBy: [{ facet: "asc" }, { name: "asc" }],
    include: { _count: { select: { recipes: true } } },
  });
}

export async function createTag(userId: string, facet: TagFacet, name: string) {
  const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
  if (!slug) throw new Error("Tag name is required");
  return prisma.tag.upsert({
    where: { userId_facet_name: { userId, facet, name: slug } },
    update: {},
    create: { userId, facet, name: slug, isSystem: false },
  });
}

export async function deleteTag(userId: string, tagId: string) {
  await prisma.tag.deleteMany({ where: { id: tagId, userId } });
}
