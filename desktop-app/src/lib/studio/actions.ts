import { addCustomChannel, createSeed, customIdea, DEFAULT_SHOT, nextSlot, runShift, scriptOf, tickOne } from "@/lib/studio/engine";
import type { Aspect, Autonomy, Channel, Episode, Resolution, StudioState } from "@/lib/studio/types";

export type RewritePayload = {
  title: string;
  hook: string;
  script: string;
  description: string;
  tags: string[];
  thumb: string;
};

export type Action =
  | { type: "tick"; now: number }
  | { type: "shift"; now: number }
  | { type: "pause"; id: string }
  | { type: "setAutonomy"; id: string; autonomy: Autonomy }
  | { type: "setAutoShoot"; id: string; on: boolean }
  | { type: "patchChannel"; id: string; patch: Partial<Pick<Channel, "name" | "niche" | "voice" | "look" | "hour" | "format">> }
  | { type: "toggleDay"; id: string; day: number }
  | { type: "patchEpisode"; id: string; patch: Partial<Pick<Episode, "title" | "hook" | "script" | "description">> }
  | { type: "setTags"; id: string; tags: string[] }
  | { type: "approve"; id: string; now: number }
  | { type: "returnToScript"; id: string; now: number }
  | { type: "publishNow"; id: string; now: number }
  | { type: "addIdea"; channelId: string; title: string; now: number }
  | { type: "addChannel"; name: string; niche: string; voice: string; now: number }
  | { type: "removeChannel"; id: string }
  | { type: "removeEpisode"; id: string }
  | { type: "enqueue"; id: string; aspect: Aspect; duration: number; resolution: Resolution }
  | { type: "videoStarted"; id: string; requestId: string; prompt: string }
  | { type: "videoDone"; id: string; url: string }
  | { type: "videoFailed"; id: string; error: string }
  | { type: "cover"; id: string; url: string }
  | { type: "applyRewrite"; id: string; rewrite: RewritePayload }
  | { type: "reset"; now: number };

function log(state: StudioState, channelId: string, text: string, at: number): StudioState {
  return {
    ...state,
    log: [{ id: `log-${at}-${Math.random().toString(36).slice(2, 6)}`, at, channelId, text }, ...state.log].slice(0, 60),
  };
}

function mapEp(state: StudioState, id: string, fn: (ep: Episode) => Episode): StudioState {
  return { ...state, episodes: state.episodes.map((ep) => (ep.id === id ? fn(ep) : ep)) };
}

export function reduce(state: StudioState, action: Action): StudioState {
  switch (action.type) {
    case "tick":
      return tickOne(state, action.now);
    case "shift":
      return runShift(state, action.now);
    case "pause":
      return {
        ...state,
        channels: state.channels.map((ch) => (ch.id === action.id ? { ...ch, paused: !ch.paused } : ch)),
      };
    case "setAutonomy":
      return {
        ...state,
        channels: state.channels.map((ch) => (ch.id === action.id ? { ...ch, autonomy: action.autonomy } : ch)),
      };
    case "setAutoShoot":
      return {
        ...state,
        channels: state.channels.map((ch) => (ch.id === action.id ? { ...ch, autoShoot: action.on } : ch)),
      };
    case "patchChannel":
      return {
        ...state,
        channels: state.channels.map((ch) => (ch.id === action.id ? { ...ch, ...action.patch } : ch)),
      };
    case "toggleDay": {
      return {
        ...state,
        channels: state.channels.map((ch) => {
          if (ch.id !== action.id) return ch;
          const has = ch.days.includes(action.day);
          const days = has ? ch.days.filter((d) => d !== action.day) : [...ch.days, action.day];
          return { ...ch, days: days.length ? days : ch.days };
        }),
      };
    }
    case "patchEpisode":
      return mapEp(state, action.id, (ep) => ({ ...ep, ...action.patch }));
    case "setTags":
      return mapEp(state, action.id, (ep) => ({ ...ep, tags: action.tags }));
    case "approve": {
      const ep = state.episodes.find((item) => item.id === action.id);
      const ch = state.channels.find((item) => item.id === ep?.channelId);
      if (!ep || !ch) return state;
      const scheduledAt = nextSlot(ch, action.now);
      const next = log(
        mapEp(state, ep.id, (item) => ({ ...item, stage: "queued", needsApproval: false, scheduledAt })),
        ch.id,
        `Утвердили «${ep.title}». Стол поставил выпуск в очередь.`,
        action.now,
      );
      return next;
    }
    case "returnToScript": {
      const ep = state.episodes.find((item) => item.id === action.id);
      if (!ep) return state;
      return log(
        mapEp(state, ep.id, (item) => ({ ...item, stage: "script", needsApproval: false })),
        ep.channelId,
        `Вернули «${ep.title}» на текст.`,
        action.now,
      );
    }
    case "publishNow": {
      const ep = state.episodes.find((item) => item.id === action.id);
      const ch = state.channels.find((item) => item.id === ep?.channelId);
      if (!ep || !ch || ep.stage === "live") return state;
      const views = Math.max(500, Math.round(ch.subscribers * 0.15 + 1200));
      const stats = { views, ctr: 5.4, avgPct: 46, likes: Math.round(views * 0.04) };
      let next = mapEp(state, ep.id, (item) => ({
        ...item,
        stage: "live",
        needsApproval: false,
        publishedAt: action.now,
        scheduledAt: item.scheduledAt ?? action.now,
        stats,
      }));
      next = {
        ...next,
        channels: next.channels.map((item) =>
          item.id === ch.id ? { ...item, subscribers: item.subscribers + Math.max(1, Math.round(views * 0.004)) } : item,
        ),
      };
      return log(next, ch.id, `Выпустили сейчас: «${ep.title}».`, action.now);
    }
    case "addIdea": {
      const ch = state.channels.find((item) => item.id === action.channelId);
      const title = action.title.trim();
      if (!ch || !title) return state;
      const idea = customIdea(ch, title);
      const ep: Episode = {
        id: `ep-${ch.id}-${Math.random().toString(36).slice(2, 8)}`,
        channelId: ch.id,
        title: idea.title,
        pillar: idea.pillar,
        stage: "idea",
        hook: idea.hook,
        script: scriptOf(ch, idea),
        description: `${idea.hook}\n\n${ch.name} — ${ch.niche}`,
        tags: idea.tags,
        thumb: { headline: idea.thumb, composition: idea.composition },
        visual: idea.visual,
        durationMin: idea.minutes,
        scheduledAt: null,
        publishedAt: null,
        needsApproval: false,
        stats: null,
      };
      return log(
        { ...state, episodes: [ep, ...state.episodes] },
        ch.id,
        `Взяла вашу тему: «${title}».`,
        action.now,
      );
    }
    case "addChannel":
      return addCustomChannel(state, action.name, action.niche, action.voice, action.now);
    case "removeChannel": {
      const ch = state.channels.find((item) => item.id === action.id);
      if (!ch?.custom) return state;
      return {
        ...state,
        channels: state.channels.filter((item) => item.id !== action.id),
        episodes: state.episodes.filter((ep) => ep.channelId !== action.id),
        shootQueue: state.shootQueue.filter((id) => state.episodes.find((ep) => ep.id === id)?.channelId !== action.id),
      };
    }
    case "removeEpisode":
      return {
        ...state,
        episodes: state.episodes.filter((ep) => ep.id !== action.id),
        shootQueue: state.shootQueue.filter((id) => id !== action.id),
      };
    case "enqueue": {
      const ep = state.episodes.find((item) => item.id === action.id);
      if (!ep || ep.video?.status === "pending") return state;
      const takes = ep.video?.url ? [...(ep.takes ?? []), { url: ep.video.url, at: Date.now() }].slice(-8) : (ep.takes ?? []);
      return {
        ...state,
        shootQueue: state.shootQueue.includes(ep.id) ? state.shootQueue : [...state.shootQueue, ep.id],
        episodes: state.episodes.map((item) =>
          item.id === ep.id
            ? {
                ...item,
                takes,
                shot: { aspect: action.aspect, duration: action.duration, resolution: action.resolution },
                video: undefined,
              }
            : item,
        ),
      };
    }
    case "videoStarted":
      return mapEp(
        { ...state, shootQueue: state.shootQueue.filter((id) => id !== action.id) },
        action.id,
        (ep) => ({
          ...ep,
          video: {
            requestId: action.requestId,
            status: "pending",
            prompt: action.prompt,
            aspect: ep.shot?.aspect ?? DEFAULT_SHOT.aspect,
            duration: ep.shot?.duration ?? DEFAULT_SHOT.duration,
            resolution: ep.shot?.resolution ?? DEFAULT_SHOT.resolution,
            startedAt: Date.now(),
          },
        }),
      );
    case "videoDone":
      return mapEp(state, action.id, (ep) =>
        ep.video ? { ...ep, video: { ...ep.video, status: "done", url: action.url, error: undefined } } : ep,
      );
    case "videoFailed":
      return {
        ...mapEp(state, action.id, (ep) =>
          ep.video
            ? { ...ep, video: { ...ep.video, status: "failed", error: action.error } }
            : {
                ...ep,
                video: {
                  requestId: "none",
                  status: "failed",
                  error: action.error,
                  aspect: ep.shot?.aspect ?? "16:9",
                  duration: ep.shot?.duration ?? 12,
                  resolution: ep.shot?.resolution ?? "1080p",
                  startedAt: Date.now(),
                },
              },
        ),
        shootQueue: state.shootQueue.filter((id) => id !== action.id),
      };
    case "cover":
      return mapEp(state, action.id, (ep) => ({ ...ep, coverUrl: action.url }));
    case "applyRewrite":
      return mapEp(state, action.id, (ep) => ({
        ...ep,
        title: action.rewrite.title || ep.title,
        hook: action.rewrite.hook || ep.hook,
        script: action.rewrite.script || ep.script,
        description: action.rewrite.description || ep.description,
        tags: action.rewrite.tags.length ? action.rewrite.tags : ep.tags,
        thumb: { ...ep.thumb, headline: action.rewrite.thumb || ep.thumb.headline },
      }));
    case "reset":
      return createSeed(action.now);
    default:
      return state;
  }
}
