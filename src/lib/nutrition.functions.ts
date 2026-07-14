import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MealSchema = z.object({
  slot: z.string(), // Breakfast, Morning Snack, Lunch, Evening Snack, Dinner, Bedtime Snack
  name: z.string(),
  description: z.string().optional().default(""),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  ingredients: z.array(z.string()).default([]),
});

const DaySchema = z.object({
  day: z.string(), // Monday, Tuesday...
  meals: z.array(MealSchema),
  total_calories: z.number().optional(),
});

const GrocerySchema = z.object({
  category: z.string(),
  items: z.array(z.string()),
});

const PlanSchema = z.object({
  title: z.string(),
  country: z.string(),
  goal: z.string(),
  daily_calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  water_l: z.number(),
  days: z.array(DaySchema).length(7),
  grocery: z.array(GrocerySchema),
  tips: z.array(z.string()).default([]),
});

export type MealPlan = z.infer<typeof PlanSchema>;

const InputSchema = z.object({
  regenerate: z.boolean().optional().default(false),
  dayIndex: z.number().int().min(0).max(6).optional(),
  mealIndex: z.number().int().min(0).optional(),
});

const SYSTEM = `You are a certified nutritionist AI creating personalized, culturally-appropriate meal plans.
Rules:
- Never generate crash diets, starvation, or extreme low-calorie plans (min 1200 kcal women / 1500 kcal men unless the user is very small).
- Meals must reflect the user's country, cuisine, budget, cooking skill, allergies, and dislikes.
- Use local food names & realistic portions.
- Balanced macros aligned with the user's goal.
Respond ONLY with valid JSON matching the provided schema.`;

const SCHEMA_HINT = `{
  "title": "string", "country": "string", "goal": "string",
  "daily_calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "water_l": number,
  "days": [ { "day": "Monday", "total_calories": number, "meals": [
    { "slot": "Breakfast|Morning Snack|Lunch|Evening Snack|Dinner|Bedtime Snack",
      "name": "string", "description": "string",
      "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number,
      "ingredients": ["string"] }
  ] } ],
  "grocery": [ { "category": "Vegetables|Fruits|Grains|Protein|Dairy|Spices|Snacks|Other", "items": ["string"] } ],
  "tips": ["short tip"]
}`;

function buildProfilePrompt(p: any) {
  return `USER PROFILE:
- Country: ${p.country ?? "Unknown"} ${p.region ? `(${p.region})` : ""}
- Language: ${p.language ?? "English"}
- Age: ${p.age ?? "?"}, Gender: ${p.gender ?? "?"}
- Height: ${p.height_cm ?? "?"} cm, Current: ${p.weight_kg ?? "?"} kg, Target: ${p.target_weight_kg ?? "?"} kg
- Activity: ${p.activity_level ?? "moderate"}, Metabolism: ${p.metabolism_profile ?? "average"}
- Health goal: ${p.health_goal ?? "maintain"}
- Diet preference: ${p.diet_preference ?? "non_veg"}
- Allergies: ${p.allergies ?? "none"}
- Medical conditions: ${p.medical_conditions ?? "none"}
- Budget: ${p.budget ?? "medium"}
- Cooking skill: ${p.cooking_skill ?? "intermediate"}, Time: ${p.cooking_time_min ?? 30} min/meal
- Likes: ${p.foods_liked ?? "—"}
- Dislikes: ${p.foods_disliked ?? "—"}
- Daily calorie goal: ${p.daily_calorie_goal ?? 2000}`;
}

async function callAI(apiKey: string, prompt: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM + "\nSchema: " + SCHEMA_HINT },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
    throw new Error(`AI error: ${res.status} ${t.slice(0, 200)}`);
  }
  const body = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  const raw = body.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(raw);
}

export const generateMealPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input ?? {}))
  .handler(async ({ context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
    const { data: profile } = await context.supabase
      .from("profiles").select("*").eq("id", context.userId).maybeSingle();
    if (!profile) throw new Error("Complete your profile first");

    const prompt = `${buildProfilePrompt(profile)}

Task: Generate a complete 7-day meal plan (Monday to Sunday) tailored to this user's country and goals.
Include 5-6 meal slots per day (Breakfast, Morning Snack, Lunch, Evening Snack, Dinner, optional Bedtime Snack).
Provide a grocery list grouped by category and 3-5 daily tips.
Return ONLY the JSON.`;

    const parsed = await callAI(apiKey, prompt);
    const plan = PlanSchema.parse(parsed);

    // deactivate previous plans
    await context.supabase.from("meal_plans").update({ is_active: false }).eq("user_id", context.userId);

    const { data: inserted, error } = await context.supabase
      .from("meal_plans").insert({
        user_id: context.userId,
        title: plan.title,
        country: plan.country,
        goal: plan.goal,
        daily_calories: plan.daily_calories,
        protein_g: plan.protein_g,
        carbs_g: plan.carbs_g,
        fat_g: plan.fat_g,
        water_l: plan.water_l,
        days: plan.days,
        grocery: plan.grocery,
        tips: plan.tips,
        is_active: true,
      }).select("*").single();
    if (error) throw new Error(error.message);
    return inserted;
  });

const RefreshInput = z.object({
  planId: z.string().uuid(),
  dayIndex: z.number().int().min(0).max(6),
  mealIndex: z.number().int().min(0).optional(),
});

export const refreshMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => RefreshInput.parse(i))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
    const { data: plan } = await context.supabase.from("meal_plans")
      .select("*").eq("id", data.planId).eq("user_id", context.userId).maybeSingle();
    if (!plan) throw new Error("Plan not found");
    const { data: profile } = await context.supabase
      .from("profiles").select("*").eq("id", context.userId).maybeSingle();

    const days = plan.days as any[];
    const day = days[data.dayIndex];
    const isSingleMeal = typeof data.mealIndex === "number";

    const prompt = `${buildProfilePrompt(profile ?? {})}

Task: ${isSingleMeal
      ? `Replace ONLY the "${day.meals[data.mealIndex!]?.slot}" meal for ${day.day} with a healthy alternative fitting the same slot and roughly the same calories. Return the full weekly plan JSON with only that one meal changed.`
      : `Regenerate ALL meals for ${day.day} with fresh variety fitting the same daily targets. Return the full weekly plan JSON with only ${day.day} changed.`}

Current plan (for context): ${JSON.stringify({ days, daily_calories: plan.daily_calories }).slice(0, 6000)}

Return ONLY the JSON.`;

    const parsed = await callAI(apiKey, prompt);
    const next = PlanSchema.parse(parsed);
    const { data: updated, error } = await context.supabase.from("meal_plans")
      .update({ days: next.days, grocery: next.grocery, tips: next.tips })
      .eq("id", plan.id).select("*").single();
    if (error) throw new Error(error.message);
    return updated;
  });

const CheatInput = z.object({ description: z.string().min(2).max(400) });

export const estimateCheatMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CheatInput.parse(i))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You estimate calories for cheat meals. Respond ONLY JSON: {calories:number, steps_needed:number, suggestions:[string]}" },
          { role: "user", content: `Cheat meal: ${data.description}. Estimate calories, walking steps (calories*20), and 3 healthier suggestions for the next meals.` },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI error ${res.status}`);
    const body = await res.json() as any;
    const parsed = JSON.parse(body.choices?.[0]?.message?.content ?? "{}");
    return z.object({
      calories: z.number(),
      steps_needed: z.number(),
      suggestions: z.array(z.string()).default([]),
    }).parse(parsed);
  });
