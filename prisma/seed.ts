import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { SEED_TAXONOMY } from "../src/lib/taxonomy";
import type { TagFacet } from "../src/generated/prisma/enums";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SEED_USER_EMAIL = (process.env.SEED_USER_EMAIL ?? "you@example.com").toLowerCase();
const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD ?? "changeme123";

async function seedUser() {
  const passwordHash = await bcrypt.hash(SEED_USER_PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email: SEED_USER_EMAIL },
    update: {},
    create: {
      email: SEED_USER_EMAIL,
      name: "Steven",
      passwordHash,
    },
  });
  console.log(`User ready: ${user.email}`);
  if (!process.env.SEED_USER_PASSWORD) {
    console.log(`  (using default password "${SEED_USER_PASSWORD}" — set SEED_USER_PASSWORD to change it, then sign in and update it)`);
  }
  return user;
}

async function seedTags(userId: string) {
  const tagIds = new Map<string, string>(); // "FACET:name" -> id

  for (const facet of Object.keys(SEED_TAXONOMY) as (keyof typeof SEED_TAXONOMY)[]) {
    for (const { name } of SEED_TAXONOMY[facet]) {
      const tag = await prisma.tag.upsert({
        where: { userId_facet_name: { userId, facet, name } },
        update: { isSystem: true },
        create: { userId, facet, name, isSystem: true },
      });
      tagIds.set(`${facet}:${name}`, tag.id);
    }
  }

  console.log(`Seeded ${tagIds.size} system tags.`);
  return tagIds;
}

type SeedIngredient = {
  section?: string;
  rawText: string;
  quantity?: number;
  quantityMax?: number;
  unit?: string;
  item?: string;
  preparation?: string;
  isOptional?: boolean;
};

type SeedStep = { section?: string; text: string; timerSeconds?: number };

type SeedRecipe = {
  title: string;
  description: string;
  servingsYield: number;
  servingsUnit: string;
  prepMinutes: number;
  cookMinutes: number;
  totalMinutes: number;
  sourceType: "MANUAL";
  rating?: number;
  notes?: string;
  tags: { facet: TagFacet; name: string }[];
  ingredients: SeedIngredient[];
  steps: SeedStep[];
  cookLog?: { cookedOn: string; notes?: string }[];
};

const SAMPLE_RECIPES: SeedRecipe[] = [
  {
    title: "Weeknight Chicken Stir-Fry",
    description: "Fast, high-heat stir-fry with whatever vegetables are in the fridge.",
    servingsYield: 4,
    servingsUnit: "servings",
    prepMinutes: 15,
    cookMinutes: 10,
    totalMinutes: 25,
    sourceType: "MANUAL",
    rating: 4,
    notes: "Double the sauce next time — it always runs out before the rice is gone.",
    tags: [
      { facet: "MAIN", name: "chicken" },
      { facet: "METHOD", name: "stovetop" },
      { facet: "MEAL", name: "dinner" },
      { facet: "CUISINE", name: "chinese" },
      { facet: "EFFORT", name: "weeknight" },
    ],
    ingredients: [
      { rawText: "1.5 lbs boneless chicken thighs, cut into bite-size pieces", quantity: 1.5, unit: "lbs", item: "boneless chicken thighs", preparation: "cut into bite-size pieces" },
      { rawText: "3 tbsp soy sauce", quantity: 3, unit: "tbsp", item: "soy sauce" },
      { rawText: "1 tbsp cornstarch", quantity: 1, unit: "tbsp", item: "cornstarch" },
      { rawText: "2 tbsp vegetable oil, divided", quantity: 2, unit: "tbsp", item: "vegetable oil", preparation: "divided" },
      { rawText: "1 red bell pepper, sliced", quantity: 1, item: "red bell pepper", preparation: "sliced" },
      { rawText: "2-3 cloves garlic, minced", quantity: 2, quantityMax: 3, unit: "cloves", item: "garlic", preparation: "minced" },
      { rawText: "1 tsp fresh ginger, grated", quantity: 1, unit: "tsp", item: "fresh ginger", preparation: "grated" },
      { rawText: "2 green onions, sliced, for garnish", quantity: 2, item: "green onions", preparation: "sliced", isOptional: true },
      { section: "Sauce", rawText: "1/4 cup soy sauce", quantity: 0.25, unit: "cup", item: "soy sauce" },
      { section: "Sauce", rawText: "2 tbsp oyster sauce", quantity: 2, unit: "tbsp", item: "oyster sauce" },
      { section: "Sauce", rawText: "1 tbsp honey", quantity: 1, unit: "tbsp", item: "honey" },
    ],
    steps: [
      { text: "Toss chicken with soy sauce and cornstarch; let sit 10 minutes." },
      { text: "Heat 1 tbsp oil in a wok or large skillet over high heat. Sear chicken until browned, about 5 minutes. Remove.", timerSeconds: 300 },
      { text: "Add remaining oil, then bell pepper, garlic, and ginger. Stir-fry 2 minutes.", timerSeconds: 120 },
      { text: "Return chicken to the pan, add sauce ingredients, and toss until glossy and heated through, about 2 minutes.", timerSeconds: 120 },
      { text: "Garnish with green onions and serve over rice." },
    ],
    cookLog: [
      { cookedOn: "2026-06-02", notes: "Used chicken breast instead — a little drier, thighs are better." },
      { cookedOn: "2026-07-14" },
    ],
  },
  {
    title: "Slow Cooker Beef Chili",
    description: "Set-it-and-forget-it chili for a cold day. Freezes well in portions.",
    servingsYield: 8,
    servingsUnit: "servings",
    prepMinutes: 20,
    cookMinutes: 360,
    totalMinutes: 380,
    sourceType: "MANUAL",
    rating: 5,
    tags: [
      { facet: "MAIN", name: "beef" },
      { facet: "METHOD", name: "crockpot" },
      { facet: "MEAL", name: "dinner" },
      { facet: "EFFORT", name: "freezer-friendly" },
      { facet: "SEASON", name: "winter" },
    ],
    ingredients: [
      { rawText: "2 lbs ground beef", quantity: 2, unit: "lbs", item: "ground beef" },
      { rawText: "1 large onion, diced", quantity: 1, item: "onion", preparation: "diced" },
      { rawText: "2 (15 oz) cans kidney beans, drained", quantity: 2, unit: "cans", item: "kidney beans", preparation: "drained" },
      { rawText: "1 (28 oz) can crushed tomatoes", quantity: 1, unit: "can", item: "crushed tomatoes" },
      { rawText: "2 tbsp chili powder", quantity: 2, unit: "tbsp", item: "chili powder" },
      { rawText: "1 tsp cumin", quantity: 1, unit: "tsp", item: "cumin" },
      { rawText: "salt and pepper, to taste", item: "salt and pepper", isOptional: true },
      { rawText: "shredded cheddar and sour cream, for serving", item: "shredded cheddar and sour cream", isOptional: true },
    ],
    steps: [
      { text: "Brown the ground beef with the onion in a skillet; drain excess fat." },
      { text: "Transfer to the slow cooker with beans, tomatoes, chili powder, and cumin. Stir to combine." },
      { text: "Cook on low for 6 hours, or high for 3.", timerSeconds: 21600 },
      { text: "Season to taste and serve with cheddar and sour cream." },
    ],
    cookLog: [{ cookedOn: "2026-01-18", notes: "A hit at game night — made a double batch." }],
  },
  {
    title: "Classic Margherita Pizza",
    description: "Simple, high-heat oven pizza with fresh mozzarella and basil.",
    servingsYield: 2,
    servingsUnit: "pizzas",
    prepMinutes: 20,
    cookMinutes: 12,
    totalMinutes: 92,
    sourceType: "MANUAL",
    notes: "Needs a pizza stone preheated at least 45 min for the crust to crisp properly — that's most of the total time.",
    tags: [
      { facet: "MAIN", name: "cheese" },
      { facet: "METHOD", name: "oven" },
      { facet: "MEAL", name: "dinner" },
      { facet: "CUISINE", name: "italian" },
    ],
    ingredients: [
      { rawText: "1 lb pizza dough, room temperature", quantity: 1, unit: "lb", item: "pizza dough", preparation: "room temperature" },
      { rawText: "1/2 cup crushed San Marzano tomatoes", quantity: 0.5, unit: "cup", item: "crushed San Marzano tomatoes" },
      { rawText: "8 oz fresh mozzarella, torn", quantity: 8, unit: "oz", item: "fresh mozzarella", preparation: "torn" },
      { rawText: "fresh basil leaves", item: "fresh basil leaves" },
      { rawText: "2 tbsp olive oil, plus more for drizzling", quantity: 2, unit: "tbsp", item: "olive oil", preparation: "plus more for drizzling" },
      { rawText: "flaky salt, to taste", item: "flaky salt", isOptional: true },
    ],
    steps: [
      { section: "Prep", text: "Place a pizza stone in the oven and preheat to 500°F (260°C) for at least 45 minutes.", timerSeconds: 2700 },
      { section: "Assemble", text: "Stretch the dough into a 12-inch round on a floured peel." },
      { section: "Assemble", text: "Spread crushed tomatoes, leaving a 1-inch border. Scatter mozzarella." },
      { section: "Bake", text: "Slide onto the stone and bake until the crust is blistered and golden, 10-12 minutes.", timerSeconds: 660 },
      { section: "Finish", text: "Top with basil, a drizzle of olive oil, and flaky salt." },
    ],
  },
  {
    title: "Sheet Pan Salmon with Vegetables",
    description: "One pan, one rack, dinner in under half an hour.",
    servingsYield: 4,
    servingsUnit: "servings",
    prepMinutes: 10,
    cookMinutes: 18,
    totalMinutes: 28,
    sourceType: "MANUAL",
    rating: 4,
    tags: [
      { facet: "MAIN", name: "fish" },
      { facet: "METHOD", name: "sheet-pan" },
      { facet: "MEAL", name: "dinner" },
      { facet: "EFFORT", name: "weeknight" },
      { facet: "EFFORT", name: "minimal-cleanup" },
    ],
    ingredients: [
      { rawText: "4 (6 oz) salmon fillets", quantity: 4, unit: "fillets", item: "salmon" },
      { rawText: "1 lb baby potatoes, halved", quantity: 1, unit: "lb", item: "baby potatoes", preparation: "halved" },
      { rawText: "1 bunch asparagus, trimmed", quantity: 1, unit: "bunch", item: "asparagus", preparation: "trimmed" },
      { rawText: "3 tbsp olive oil, divided", quantity: 3, unit: "tbsp", item: "olive oil", preparation: "divided" },
      { rawText: "1 lemon, sliced", quantity: 1, item: "lemon", preparation: "sliced" },
      { rawText: "salt and pepper, to taste", item: "salt and pepper", isOptional: true },
    ],
    steps: [
      { text: "Preheat oven to 425°F (220°C)." },
      { text: "Toss potatoes with 2 tbsp olive oil, salt, and pepper on a sheet pan. Roast 12 minutes.", timerSeconds: 720 },
      { text: "Push potatoes aside, add salmon and asparagus, drizzle with remaining oil, top salmon with lemon slices." },
      { text: "Roast until salmon flakes easily, about 10-12 more minutes.", timerSeconds: 660 },
    ],
    cookLog: [{ cookedOn: "2026-08-05" }],
  },
  {
    title: "Sunday Morning Pancakes",
    description: "Fluffy buttermilk pancakes, worth the extra bowl to wash.",
    servingsYield: 12,
    servingsUnit: "pancakes",
    prepMinutes: 10,
    cookMinutes: 15,
    totalMinutes: 25,
    sourceType: "MANUAL",
    rating: 5,
    tags: [
      { facet: "MAIN", name: "eggs" },
      { facet: "METHOD", name: "stovetop" },
      { facet: "MEAL", name: "breakfast" },
      { facet: "EFFORT", name: "weeknight" },
    ],
    ingredients: [
      { rawText: "2 cups all-purpose flour", quantity: 2, unit: "cups", item: "all-purpose flour" },
      { rawText: "2 tbsp sugar", quantity: 2, unit: "tbsp", item: "sugar" },
      { rawText: "2 tsp baking powder", quantity: 2, unit: "tsp", item: "baking powder" },
      { rawText: "1/2 tsp baking soda", quantity: 0.5, unit: "tsp", item: "baking soda" },
      { rawText: "1/2 tsp salt", quantity: 0.5, unit: "tsp", item: "salt" },
      { rawText: "2 cups buttermilk", quantity: 2, unit: "cups", item: "buttermilk" },
      { rawText: "2 large eggs", quantity: 2, unit: "large", item: "eggs" },
      { rawText: "1/4 cup unsalted butter, melted, plus more for the pan", quantity: 0.25, unit: "cup", item: "unsalted butter", preparation: "melted, plus more for the pan" },
    ],
    steps: [
      { text: "Whisk flour, sugar, baking powder, baking soda, and salt in a large bowl." },
      { text: "In a separate bowl, whisk buttermilk, eggs, and melted butter." },
      { text: "Pour wet ingredients into dry and stir until just combined — a few lumps are fine." },
      { text: "Cook 1/4-cup scoops on a buttered griddle over medium heat until bubbles form, then flip.", timerSeconds: 180 },
    ],
    cookLog: [
      { cookedOn: "2026-05-11" },
      { cookedOn: "2026-06-15" },
      { cookedOn: "2026-08-10", notes: "Added blueberries — great addition." },
    ],
  },
];

async function seedRecipes(userId: string, tagIds: Map<string, string>) {
  for (const recipe of SAMPLE_RECIPES) {
    const existing = await prisma.recipe.findFirst({
      where: { userId, title: recipe.title },
    });
    if (existing) continue;

    await prisma.recipe.create({
      data: {
        userId,
        title: recipe.title,
        description: recipe.description,
        servingsYield: recipe.servingsYield,
        servingsUnit: recipe.servingsUnit,
        prepMinutes: recipe.prepMinutes,
        cookMinutes: recipe.cookMinutes,
        totalMinutes: recipe.totalMinutes,
        sourceType: recipe.sourceType,
        rating: recipe.rating,
        notes: recipe.notes,
        ingredients: {
          create: recipe.ingredients.map((ing, i) => ({
            position: i,
            section: ing.section,
            rawText: ing.rawText,
            quantity: ing.quantity,
            quantityMax: ing.quantityMax,
            unit: ing.unit,
            item: ing.item,
            preparation: ing.preparation,
            isOptional: ing.isOptional ?? false,
          })),
        },
        steps: {
          create: recipe.steps.map((step, i) => ({
            position: i,
            section: step.section,
            text: step.text,
            timerSeconds: step.timerSeconds,
          })),
        },
        tags: {
          create: recipe.tags.map(({ facet, name }) => {
            const tagId = tagIds.get(`${facet}:${name}`);
            if (!tagId) throw new Error(`Unknown seed tag ${facet}:${name}`);
            return { tagId, appliedBy: "USER" as const };
          }),
        },
        cookLogs: recipe.cookLog
          ? { create: recipe.cookLog.map((log) => ({ cookedOn: new Date(log.cookedOn), notes: log.notes })) }
          : undefined,
      },
    });
  }

  console.log(`Seeded ${SAMPLE_RECIPES.length} sample recipes.`);
}

async function main() {
  const user = await seedUser();
  const tagIds = await seedTags(user.id);
  await seedRecipes(user.id, tagIds);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
