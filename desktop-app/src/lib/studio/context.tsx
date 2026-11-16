import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { reduce, type Action } from "@/lib/studio/actions";
import { catchUp, createSeed, DEFAULT_SHOT } from "@/lib/studio/engine";
import { pollEpisodeVideo, startEpisodeVideo } from "@/lib/studio/media";
import type { StudioState } from "@/lib/studio/types";

const KEY = "avtoefir-v1";

type StudioApi = {
  state: StudioState;
  dispatch: (action: Action) => void;
};

const Ctx = createContext<StudioApi | null>(null);

function load(): StudioState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudioState;
    if (!parsed || !Array.isArray(parsed.channels) || !Array.isArray(parsed.episodes)) return null;
    return { ...parsed, shootQueue: parsed.shootQueue ?? [], log: parsed.log ?? [] };
  } catch {
    return null;
  }
}

export function useStudio(): StudioApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Студия ещё не поднята");
  return ctx;
}

function Boot() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink px-6 text-paper">
      <div className="text-center">
        <p className="font-display text-2xl tracking-wide">Автоэфир</p>
        <p className="mt-2 text-sm text-mist">Поднимаем четыре стола</p>
      </div>
    </div>
  );
}

function Runtime({ state, dispatch }: StudioApi) {
  const inflight = useRef<string | null>(null);
  const head = state.shootQueue[0] ?? "";

  useEffect(() => {
    if (!head || inflight.current) return;
    const ep = state.episodes.find((item) => item.id === head);
    const ch = state.channels.find((item) => item.id === ep?.channelId);
    if (!ep || !ch) {
      dispatch({ type: "videoFailed", id: head, error: "Выпуск уже не на столе" });
      return;
    }
    if (ep.video?.status === "pending" && ep.video.requestId && ep.video.requestId !== "none") {
      dispatch({ type: "videoStarted", id: ep.id, requestId: ep.video.requestId, prompt: ep.video.prompt ?? "" });
      return;
    }
    const shot = ep.shot ?? DEFAULT_SHOT;
    inflight.current = head;
    void (async () => {
      try {
        const res = await startEpisodeVideo({
          data: {
            channelName: ch.name,
            look: ch.look,
            title: ep.title,
            hook: ep.hook,
            visual: ep.visual,
            script: ep.script,
            aspect: shot.aspect,
            duration: shot.duration,
            resolution: shot.resolution,
          },
        });
        if (res.ok) dispatch({ type: "videoStarted", id: ep.id, requestId: res.requestId, prompt: res.prompt });
        else dispatch({ type: "videoFailed", id: ep.id, error: res.error });
      } catch {
        dispatch({ type: "videoFailed", id: ep.id, error: "Съёмка не стартовала" });
      } finally {
        inflight.current = null;
      }
    })();
  }, [head, state.episodes, state.channels, dispatch]);

  const pendingKey = state.episodes
    .filter((ep) => ep.video?.status === "pending" && ep.video.requestId && ep.video.requestId !== "none")
    .map((ep) => `${ep.id}:${ep.video?.requestId}`)
    .join("|");

  useEffect(() => {
    if (!pendingKey) return;
    let stop = false;
    const run = async () => {
      const jobs = pendingKey.split("|").filter(Boolean);
      for (const job of jobs) {
        if (stop) return;
        const [id, requestId] = job.split(":");
        if (!id || !requestId) continue;
        try {
          const res = await pollEpisodeVideo({ data: { requestId } });
          if (stop || !res.ok) continue;
          if (res.status === "done") dispatch({ type: "videoDone", id, url: res.url });
          if (res.status === "failed") dispatch({ type: "videoFailed", id, error: res.error });
        } catch {
          /* следующий заход */
        }
      }
    };
    void run();
    const timer = window.setInterval(() => void run(), 5000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [pendingKey, dispatch]);

  return null;
}

export function StudioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StudioState | null>(null);

  useEffect(() => {
    const now = Date.now();
    const loaded = load();
    setState(loaded ? catchUp(loaded, now) : createSeed(now));
    const timer = window.setInterval(() => {
      setState((cur) => (cur ? tickSafe(cur) : cur));
    }, 28000);
    const first = window.setTimeout(() => {
      setState((cur) => (cur ? tickSafe(cur) : cur));
    }, 1200);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(first);
    };
  }, []);

  useEffect(() => {
    if (!state) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* переполнено — студия всё равно жива в этой сессии */
    }
  }, [state]);

  const dispatch = useCallback((action: Action) => {
    setState((cur) => (cur ? reduce(cur, action) : cur));
  }, []);

  if (!state) return <Boot />;

  return (
    <Ctx.Provider value={{ state, dispatch }}>
      <Runtime state={state} dispatch={dispatch} />
      {children}
    </Ctx.Provider>
  );
}

function tickSafe(state: StudioState): StudioState {
  return reduce(state, { type: "tick", now: Date.now() });
}
