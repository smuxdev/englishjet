import { todayStr } from "./words";

const ACTIVITY_KEY = "vocabulary_activity";

export interface DayActivity {
  reviewed: number;
  correct: number;
}

export type ActivityMap = Record<string, DayActivity>; // clave YYYY-MM-DD

export function readActivity(): ActivityMap {
  try {
    const stored = localStorage.getItem(ACTIVITY_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const map: ActivityMap = {};
    for (const [date, value] of Object.entries(parsed)) {
      const day = value as Partial<DayActivity>;
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && typeof day?.reviewed === "number") {
        map[date] = { reviewed: day.reviewed, correct: typeof day.correct === "number" ? day.correct : 0 };
      }
    }
    return map;
  } catch (error) {
    console.error("Error reading activity from localStorage:", error);
    return {};
  }
}

// La persistencia (localStorage o API) la decide el DeckStore; estas dos
// transiciones son puras para poder compartirlas entre ambos modos.
export function writeActivity(activity: ActivityMap): void {
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
  } catch (error) {
    console.error("Error saving activity to localStorage:", error);
  }
}

export function applyReview(activity: ActivityMap, correct: boolean): ActivityMap {
  const today = todayStr();
  const day = activity[today] ?? { reviewed: 0, correct: 0 };
  return {
    ...activity,
    [today]: { reviewed: day.reviewed + 1, correct: day.correct + (correct ? 1 : 0) },
  };
}

// Reverso de applyReview, para el deshacer de la sesión. Clampa a 0: si el log
// original cayó ayer (medianoche a mitad de sesión), no dejamos negativos.
export function applyUnreview(activity: ActivityMap, correct: boolean): ActivityMap {
  const today = todayStr();
  const day = activity[today];
  if (!day) return activity;
  return {
    ...activity,
    [today]: {
      reviewed: Math.max(0, day.reviewed - 1),
      correct: Math.max(0, day.correct - (correct ? 1 : 0)),
    },
  };
}

// Días consecutivos con actividad, anclados en hoy — o en ayer si hoy aún no
// se ha estudiado (la racha no se rompe a medianoche antes de la sesión).
export function computeStreak(activity: ActivityMap): number {
  let offset = activity[todayStr()] ? 0 : -1;
  let streak = 0;
  while (activity[todayStr(offset)]) {
    streak++;
    offset--;
  }
  return streak;
}
