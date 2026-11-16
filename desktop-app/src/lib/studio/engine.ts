import { ANGLES, BANKS, CHANNELS } from "@/lib/studio/banks";
import type {
  Channel,
  Episode,
  Idea,
  LogLine,
  Shot,
  StudioState,
  Thumb,
} from "@/lib/studio/types";

export const DEFAULT_SHOT: Shot = { aspect: "16:9", duration: 12, resolution: "1080p" };

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export function scriptOf(ch: Channel, idea: Pick<Idea, "open" | "hook" | "beats" | "end">): string {
  return [
    "ХОЛОДНОЕ ОТКРЫТИЕ",
    idea.open,
    "",
    "ОБЕЩАНИЕ",
    idea.hook,
    "",
    "БЛОК 1",
    idea.beats[0],
    "",
    "БЛОК 2",
    idea.beats[1],
    "",
    "БЛОК 3",
    idea.beats[2],
    "",
    "ВЫХОД",
    idea.end,
    "",
    `Голос «${ch.name}»: ${ch.voice}`,
    "На экране нет текста, чужих логотипов и крика «подпишись» в первые полминуты.",
  ].join("\n");
}

function describe(ch: Channel, hook: string): string {
  return `${hook}\n\n${ch.name} — ${ch.niche}\n\nТаймкоды ставим после монтажа. Открытие выпуска снимается отдельным роликом.`;
}

export function nextSlot(ch: Channel, after: number): number {
  const days = ch.days.length ? ch.days : [1];
  const start = new Date(after);
  for (let i = 0; i < 28; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    d.setHours(ch.hour, 0, 0, 0);
    if (d.getTime() <= after) continue;
    if (days.includes(d.getDay())) return d.getTime();
  }
  return after + 86_400_000;
}

function pastSlots(ch: Channel, before: number, count: number): number[] {
  const days = ch.days.length ? ch.days : [1];
  const out: number[] = [];
  for (let i = 0; i < 90 && out.length < count; i++) {
    const d = new Date(before);
    d.setDate(d.getDate() - i);
    d.setHours(ch.hour, 0, 0, 0);
    if (d.getTime() < before && days.includes(d.getDay())) out.push(d.getTime());
  }
  return out.reverse();
}

function statsFor(ch: Channel, title: string, salt: number) {
  const h = hash01(`${ch.id}:${title}:${salt}`);
  const views = Math.round(ch.subscribers * (0.08 + h * 0.42) + 800);
  return {
    views,
    ctr: Math.round((3.2 + h * 6.4) * 10) / 10,
    avgPct: Math.round(34 + h * 32),
    likes: Math.round(views * (0.028 + (1 - h) * 0.04)),
  };
}

function episodeFromIdea(
  ch: Channel,
  idea: Idea,
  extra: Partial<Episode> & Pick<Episode, "id" | "stage">,
): Episode {
  return {
    channelId: ch.id,
    title: idea.title,
    pillar: idea.pillar,
    hook: idea.hook,
    script: scriptOf(ch, idea),
    description: describe(ch, idea.hook),
    tags: idea.tags,
    thumb: { headline: idea.thumb, composition: idea.composition },
    visual: idea.visual,
    durationMin: idea.minutes,
    scheduledAt: null,
    publishedAt: null,
    needsApproval: false,
    stats: null,
    ...extra,
  };
}

function synthetic(ch: Channel, n: number): Idea {
  const angle = ANGLES[n % ANGLES.length] ?? ANGLES[0];
  const pillar = ch.pillars[n % Math.max(ch.pillars.length, 1)] ?? ch.niche;
  const title = `${pillar}: ${angle}`;
  return {
    title,
    pillar,
    hook: `${ch.name} берёт тему «${pillar}» и смотрит на неё так: ${angle}.`,
    open: `Начинаем без разогрева. Тема уже в кадре: ${pillar}.`,
    visual: `Cinematic photoreal continuous shot, no text, no logos, no watermark. Channel look: ${ch.look}. Subject: ${title}. Natural imperfect detail, motivated camera move, diegetic sound only.`,
    beats: [
      `Первый заход: показать ${pillar} так, как это есть, без украшения.`,
      `Второй: где обычно врут или торопятся. Мы остаёмся на этом месте дольше.`,
      `Третий: один конкретный вывод, который можно унести без списка из десяти пунктов.`,
    ],
    end: "Выходим на том же кадре, с которого начали, только тише.",
    thumb: pillar,
    composition: "Один предмет, много воздуха, никакого текста.",
    tags: [ch.handle.replace("@", ""), "выпуск"],
    minutes: 12,
  };
}

export function nextIdea(ch: Channel, used: Set<string>, n: number): Idea {
  const bank = BANKS[ch.id] ?? [];
  const fresh = bank.find((idea) => !used.has(idea.title));
  if (fresh) return fresh;
  const base = bank.length ? bank[n % bank.length]! : synthetic(ch, n);
  if (!used.has(base.title)) return base;
  return { ...base, title: `${base.title} · ${n + 1}` };
}

function pushLog(state: StudioState, channelId: string, text: string, at: number): StudioState {
  const line: LogLine = { id: uid("log"), at, channelId, text };
  return { ...state, log: [line, ...state.log].slice(0, 60) };
}

function withEpisode(state: StudioState, ep: Episode): StudioState {
  const exists = state.episodes.some((item) => item.id === ep.id);
  return {
    ...state,
    episodes: exists ? state.episodes.map((item) => (item.id === ep.id ? ep : item)) : [ep, ...state.episodes],
  };
}

function bumpSubs(state: StudioState, channelId: string, views: number): StudioState {
  return {
    ...state,
    channels: state.channels.map((ch) =>
      ch.id === channelId ? { ...ch, subscribers: ch.subscribers + Math.max(1, Math.round(views * 0.004)) } : ch,
    ),
  };
}

function publish(state: StudioState, ep: Episode, ch: Channel, now: number): StudioState {
  const stats = statsFor(ch, ep.title, now % 997);
  const next: Episode = { ...ep, stage: "live", needsApproval: false, publishedAt: now, stats };
  let s = withEpisode(state, next);
  s = bumpSubs(s, ch.id, stats.views);
  return pushLog(s, ch.id, `Выпустила «${ep.title}».`, now);
}

function queueIt(state: StudioState, ep: Episode, ch: Channel, now: number): StudioState {
  const scheduledAt = nextSlot(ch, now);
  const next: Episode = { ...ep, stage: "queued", needsApproval: false, scheduledAt };
  return pushLog(withEpisode(state, next), ch.id, `Поставила в очередь «${ep.title}».`, now);
}

function markApproval(state: StudioState, ep: Episode, ch: Channel, now: number): StudioState {
  const next: Episode = { ...ep, stage: "package", needsApproval: true };
  return pushLog(withEpisode(state, next), ch.id, `Ждёт утверждения: «${ep.title}».`, now);
}

function toScript(state: StudioState, ep: Episode, ch: Channel, now: number): StudioState {
  const next: Episode = {
    ...ep,
    stage: "script",
    script: ep.script || scriptOf(ch, { open: ep.hook, hook: ep.hook, beats: [ep.hook, ep.hook, ep.hook], end: ep.hook }),
  };
  return pushLog(withEpisode(state, next), ch.id, `Написала текст «${ep.title}».`, now);
}

function maybeAutoShoot(state: StudioState, ep: Episode, ch: Channel): StudioState {
  if (!ch.autoShoot) return state;
  if (ep.video?.status === "pending" || ep.video?.status === "done") return state;
  if (state.shootQueue.includes(ep.id)) return state;
  const shot = ep.shot ?? DEFAULT_SHOT;
  return {
    ...state,
    shootQueue: [...state.shootQueue, ep.id],
    episodes: state.episodes.map((item) => (item.id === ep.id ? { ...item, shot } : item)),
  };
}

function toPackage(state: StudioState, ep: Episode, ch: Channel, now: number): StudioState {
  const next: Episode = { ...ep, stage: "package", needsApproval: false };
  let s = pushLog(withEpisode(state, next), ch.id, `Упаковала «${ep.title}»: заголовок, текст, кадр.`, now);
  s = maybeAutoShoot(s, next, ch);
  if (ch.autoShoot) s = pushLog(s, ch.id, `Заказала съёмку открытия «${ep.title}».`, now);
  return s;
}

function spawn(state: StudioState, ch: Channel, now: number): StudioState {
  const used = new Set(state.episodes.filter((ep) => ep.channelId === ch.id).map((ep) => ep.title));
  const n = used.size;
  const idea = nextIdea(ch, used, n);
  const ep = episodeFromIdea(ch, idea, { id: uid(`ep-${ch.id}`), stage: "idea" });
  return pushLog(withEpisode(state, ep), ch.id, `Нашла тему: «${idea.title}».`, now);
}

function applyMove(state: StudioState, ch: Channel, now: number): StudioState {
  const eps = state.episodes.filter((ep) => ep.channelId === ch.id);
  const due = eps.find((ep) => ep.stage === "queued" && ep.scheduledAt !== null && ep.scheduledAt <= now && !ep.needsApproval);
  if (due) return publish(state, due, ch, now);

  const packageEp = eps.find((ep) => ep.stage === "package" && !ep.needsApproval);
  if (packageEp && ch.autonomy === "auto") return queueIt(state, packageEp, ch, now);
  if (packageEp && ch.autonomy === "approve") return markApproval(state, packageEp, ch, now);

  const scriptEp = eps.find((ep) => ep.stage === "script" && !ep.needsApproval);
  if (scriptEp) return toPackage(state, scriptEp, ch, now);

  const ideaEp = eps.find((ep) => ep.stage === "idea");
  if (ideaEp) return toScript(state, ideaEp, ch, now);

  const active = eps.filter((ep) => ep.stage !== "live").length;
  if (active < 4) return spawn(state, ch, now);
  return pushLog(state, ch.id, "Держит ритм: очередь полная, новых тем пока не берёт.", now);
}

export function tickOne(state: StudioState, now: number): StudioState {
  const n = state.channels.length;
  if (!n) return { ...state, lastBeatAt: now };
  let chosen: Channel | null = null;
  let nextCursor = state.cursor % n;
  for (let i = 0; i < n; i++) {
    const ch = state.channels[(state.cursor + i) % n];
    if (ch && !ch.paused) {
      chosen = ch;
      nextCursor = (state.cursor + i + 1) % n;
      break;
    }
  }
  if (!chosen) return { ...state, lastBeatAt: now };
  const moved = applyMove(state, chosen, now);
  return { ...moved, cursor: nextCursor, lastBeatAt: now };
}

export function runShift(state: StudioState, now: number): StudioState {
  let s = state;
  const steps = Math.max(1, s.channels.filter((ch) => !ch.paused).length);
  for (let i = 0; i < steps; i++) s = tickOne(s, now);
  return s;
}

export function catchUp(state: StudioState, now: number): StudioState {
  const elapsed = Math.max(0, now - state.lastBeatAt);
  const moves = Math.min(12, Math.floor(elapsed / (12 * 60 * 1000)));
  let s = state;
  for (let i = 0; i < moves; i++) s = tickOne(s, now);
  return { ...s, lastBeatAt: now };
}

export function createSeed(now: number): StudioState {
  const episodes: Episode[] = [];
  for (const ch of CHANNELS) {
    const past = pastSlots(ch, now, 5);
    past.forEach((at, i) => {
      const idea = (BANKS[ch.id] ?? [])[i];
      if (!idea) return;
      const ep = episodeFromIdea(ch, idea, {
        id: `live-${ch.id}-${i}`,
        stage: "live",
        scheduledAt: at,
        publishedAt: at,
        stats: statsFor(ch, idea.title, i),
      });
      episodes.push(ep);
    });
    const bank = BANKS[ch.id] ?? [];
    const a = bank[5];
    const b = bank[6];
    const c = bank[7];
    if (ch.id === "sever" && a && b && c) {
      episodes.push(episodeFromIdea(ch, a, { id: `q-${ch.id}`, stage: "queued", scheduledAt: now - 45_000 }));
      episodes.push(episodeFromIdea(ch, b, { id: `s-${ch.id}`, stage: "script" }));
      episodes.push(episodeFromIdea(ch, c, { id: `i-${ch.id}`, stage: "idea" }));
    } else if (ch.id === "kuhnya" && a && b && c) {
      episodes.push(
        episodeFromIdea(ch, a, {
          id: `q-${ch.id}`,
          stage: "queued",
          scheduledAt: nextSlot(ch, now),
          needsApproval: false,
        }),
      );
      episodes.push(episodeFromIdea(ch, b, { id: `p-${ch.id}`, stage: "package", needsApproval: true }));
      episodes.push(episodeFromIdea(ch, c, { id: `i-${ch.id}`, stage: "idea" }));
    } else if (ch.id === "shema" && a && b && c) {
      episodes.push(episodeFromIdea(ch, a, { id: `q-${ch.id}`, stage: "queued", scheduledAt: nextSlot(ch, now) }));
      episodes.push(episodeFromIdea(ch, b, { id: `p-${ch.id}`, stage: "package" }));
      episodes.push(episodeFromIdea(ch, c, { id: `i-${ch.id}`, stage: "idea" }));
    } else if (a && b && c) {
      episodes.push(episodeFromIdea(ch, a, { id: `s-${ch.id}`, stage: "script" }));
      episodes.push(episodeFromIdea(ch, b, { id: `i-${ch.id}`, stage: "idea" }));
      episodes.push(episodeFromIdea(ch, c, { id: `p-${ch.id}`, stage: "package" }));
    }
  }

  const log: LogLine[] = [
    { id: "log-seed-1", at: now - 3_600_000, channelId: "kuhnya", text: "Упаковала ужин и ждёт вашего «можно»." },
    { id: "log-seed-2", at: now - 7_200_000, channelId: "shema", text: "Держит схему в пакете и ещё одну уже в очереди." },
    { id: "log-seed-3", at: now - 86_400_000, channelId: "razbor", text: "Пишет ночное эссе и не ставит его в эфир сама." },
    { id: "log-seed-4", at: now - 90_000_000, channelId: "sever", text: "Готовит следующий северный выпуск к своему воскресенью." },
  ];

  return {
    channels: CHANNELS.map((ch) => ({ ...ch, pillars: [...ch.pillars], days: [...ch.days] })),
    episodes,
    log,
    cursor: 0,
    lastBeatAt: now,
    shootQueue: [],
  };
}

export function addCustomChannel(state: StudioState, name: string, niche: string, voice: string, now: number): StudioState {
  const clean = name.trim();
  if (!clean) return state;
  const id = uid("ch");
  const ch: Channel = {
    id,
    name: clean,
    handle: `@stol.${state.channels.length + 1}`,
    niche: niche.trim() || "Свой канал. Стол сам находит темы из этой ниши.",
    voice: voice.trim() || "Спокойный, конкретный, без кликбейта.",
    look: `Cinematic photoreal YouTube opener, no text, no logos. Niche: ${niche.trim() || clean}. Natural light, one motivated camera move, imperfect real detail, diegetic sound.`,
    pillars: ["Главное", "Изнутри", "Практика"],
    days: [3],
    hour: 18,
    autonomy: "auto",
    paused: false,
    autoShoot: false,
    subscribers: 0,
    format: "Выпуск, 10–14 мин",
    custom: true,
  };
  let s: StudioState = { ...state, channels: [...state.channels, ch] };
  s = spawn(s, ch, now);
  return pushLog(s, ch.id, `Стол «${ch.name}» открыт и уже ищет первую тему.`, now);
}

export function customIdea(ch: Channel, title: string): Idea {
  const idea = synthetic(ch, ch.pillars.length + title.length);
  return {
    ...idea,
    title,
    hook: `Выпуск «${ch.name}» про: ${title}.`,
    open: `Начинаем сразу с сути. ${title}.`,
    visual: `Cinematic photoreal continuous shot, no on-screen text, no logos, no watermark. ${ch.look} The scene is specifically about: ${title}.`,
  };
}

export type { Thumb };
