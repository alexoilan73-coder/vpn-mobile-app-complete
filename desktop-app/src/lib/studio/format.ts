import { format, formatDistanceToNowStrict } from "date-fns";
import { ru } from "date-fns/locale";
import type { Autonomy, Stage } from "@/lib/studio/types";

export const STAGE_LABEL: Record<Stage, string> = {
  idea: "Идея",
  script: "Текст",
  package: "Пакет",
  queued: "В очереди",
  live: "В эфире",
};

export const AUTO_LABEL: Record<Autonomy, string> = {
  auto: "Сам ведёт",
  approve: "На утверждение",
  draft: "Только черновики",
};

const DAY = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function num(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n));
}

export function when(ts: number): string {
  return format(ts, "d MMM, HH:mm", { locale: ru });
}

export function clock(ts: number): string {
  return format(ts, "HH:mm");
}

export function longDate(ts: number): string {
  return format(ts, "EEEE, d MMMM", { locale: ru });
}

export function ago(ts: number): string {
  return formatDistanceToNowStrict(ts, { addSuffix: true, locale: ru });
}

export function dayName(index: number): string {
  return DAY[index] ?? "";
}

export function viewsOf(
  episodes: { channelId: string; stats: { views: number } | null }[],
  channelId: string,
): number {
  return episodes.reduce((sum, ep) => (ep.channelId === channelId && ep.stats ? sum + ep.stats.views : sum), 0);
}
