export type MetabolismProfile = "slow" | "average" | "fast";

// 6 statements: +1 index means "agree = fast metabolism", -1 means "agree = slow"
export const METABOLISM_QUESTIONS: Array<{ id: string; text: string; direction: 1 | -1 }> = [
  { id: "q1", text: "I gain weight very easily.", direction: -1 },
  { id: "q2", text: "I can eat a lot without gaining weight.", direction: 1 },
  { id: "q3", text: "I often feel hungry.", direction: 1 },
  { id: "q4", text: "I lose weight easily.", direction: 1 },
  { id: "q5", text: "My body stores fat quickly.", direction: -1 },
  { id: "q6", text: "My energy level stays high throughout the day.", direction: 1 },
];

// answers: 1 (strongly disagree) .. 5 (strongly agree)
export function estimateMetabolism(answers: Record<string, number>): MetabolismProfile {
  let score = 0;
  for (const q of METABOLISM_QUESTIONS) {
    const a = answers[q.id];
    if (typeof a !== "number") continue;
    // center around 3, weight by direction
    score += (a - 3) * q.direction;
  }
  if (score <= -3) return "slow";
  if (score >= 3) return "fast";
  return "average";
}

export function bmi(weightKg: number | null | undefined, heightCm: number | null | undefined): number | null {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  if (m <= 0) return null;
  return weightKg / (m * m);
}

export function bmiCategory(b: number | null): string {
  if (b == null) return "—";
  if (b < 18.5) return "Underweight";
  if (b < 25) return "Normal";
  if (b < 30) return "Overweight";
  return "Obese";
}

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / 86_400_000);
}

export function goalProgress(start: number | null, current: number | null, target: number | null): number | null {
  if (start == null || current == null || target == null) return null;
  if (start === target) return 100;
  const total = start - target;
  const done = start - current;
  if (total === 0) return 100;
  const p = (done / total) * 100;
  return Math.max(0, Math.min(100, p));
}

export const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary (little/no exercise)" },
  { value: "light", label: "Lightly active (1-3 days/wk)" },
  { value: "moderate", label: "Moderately active (3-5 days/wk)" },
  { value: "very", label: "Very active (6-7 days/wk)" },
  { value: "athlete", label: "Athlete (2x/day, intense)" },
];

export const DIET_PREFS = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "eggetarian", label: "Eggetarian" },
  { value: "non_veg", label: "Non-vegetarian" },
];

export const HEALTH_GOALS = [
  { value: "lose", label: "Lose weight" },
  { value: "gain", label: "Gain weight" },
  { value: "maintain", label: "Maintain weight" },
  { value: "muscle", label: "Build muscle" },
  { value: "fitness", label: "Improve fitness" },
];

export const SMOKING_OPTS = [
  { value: "never", label: "Never" },
  { value: "sometimes", label: "Occasionally" },
  { value: "regular", label: "Regularly" },
];

export const ALCOHOL_OPTS = [
  { value: "never", label: "Never" },
  { value: "sometimes", label: "Occasionally" },
  { value: "regular", label: "Regularly" },
];

export const EXERCISE_FREQ = [
  { value: "0", label: "Rarely" },
  { value: "1-2", label: "1-2 days/wk" },
  { value: "3-4", label: "3-4 days/wk" },
  { value: "5-6", label: "5-6 days/wk" },
  { value: "daily", label: "Daily" },
];
