import { useEffect, useState } from "react";
import { Btn, fieldClass } from "@/components/studio/ui";
import { useStudio } from "@/lib/studio/context";
import { makeCover, rewriteEpisode } from "@/lib/studio/media";
import { STAGE_LABEL } from "@/lib/studio/format";
import type { Aspect, Episode, Resolution } from "@/lib/studio/types";

export function EpisodePanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, dispatch } = useStudio();
  const ep = state.episodes.find((item) => item.id === id);
  const ch = state.channels.find((item) => item.id === ep?.channelId);
  const [title, setTitle] = useState(ep?.title ?? "");
  const [hook, setHook] = useState(ep?.hook ?? "");
  const [script, setScript] = useState(ep?.script ?? "");
  const [description, setDescription] = useState(ep?.description ?? "");
  const [aspect, setAspect] = useState<Aspect>(ep?.shot?.aspect ?? "16:9");
  const [duration, setDuration] = useState(ep?.shot?.duration ?? 12);
  const [resolution, setResolution] = useState<Resolution>(ep?.shot?.resolution ?? "1080p");
  const [note, setNote] = useState("");
  const [busyText, setBusyText] = useState(false);
  const [busyCover, setBusyCover] = useState(false);

  useEffect(() => {
    if (!ep) return;
    setTitle(ep.title);
    setHook(ep.hook);
    setScript(ep.script);
    setDescription(ep.description);
    setAspect(ep.shot?.aspect ?? "16:9");
    setDuration(ep.shot?.duration ?? 12);
    setResolution(ep.shot?.resolution ?? "1080p");
  }, [ep?.id]);

  if (!ep || !ch) return null;

  const queued = state.shootQueue.includes(ep.id);
  const pending = ep.video?.status === "pending" || queued;
  const save = () => dispatch({ type: "patchEpisode", id: ep.id, patch: { title, hook, script, description } });

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/70" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-labelledby="ep-title"
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-line bg-raised px-4 py-5 text-paper sm:px-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs tracking-widest text-mist uppercase">
              {ch.name} · {STAGE_LABEL[ep.stage]}
            </p>
            <h2 id="ep-title" className="mt-1 font-display text-xl">
              {title || "Выпуск"}
            </h2>
          </div>
          <Btn tone="quiet" onClick={onClose}>
            Закрыть
          </Btn>
        </div>

        <div className={`mt-4 overflow-hidden rounded-2xl bg-ink ${aspect === "9:16" ? "mx-auto aspect-9/16 max-h-screen" : "aspect-video"}`}>
          {ep.video?.status === "done" && ep.video.url ? (
            <video key={ep.video.url} className="h-full w-full" controls playsInline src={ep.video.url} />
          ) : (
            <div className="flex h-full flex-col justify-between p-4">
              <p className="text-xs tracking-widest text-signal uppercase">
                {pending ? "Снимаем" : "Открытие выпуска"}
              </p>
              <p className="text-sm text-pretty text-paper">{hook}</p>
              {ep.video?.status === "failed" ? <p className="text-sm text-signal">{ep.video.error}</p> : null}
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3">
          <div className="flex flex-wrap gap-2">
            <SelectAspect value={aspect} onChange={setAspect} />
            <label className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-3 text-sm text-paper">
              <span className="text-mist">сек</span>
              <input
                className="w-14 bg-transparent tabular-nums text-paper outline-none"
                type="number"
                min={6}
                max={15}
                value={duration}
                onChange={(event) => setDuration(clamp(Number(event.target.value)))}
              />
            </label>
            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-full border border-line px-3 text-sm font-semibold text-paper"
              onClick={() => setResolution((cur) => (cur === "1080p" ? "720p" : "1080p"))}
            >
              {resolution}
            </button>
          </div>
          <Btn
            tone="solid"
            disabled={pending}
            onClick={() => {
              save();
              dispatch({ type: "enqueue", id: ep.id, aspect, duration: clamp(duration), resolution });
            }}
          >
            {pending ? "Съёмка уже идёт" : `Снять открытие · ${resolution}`}
          </Btn>
          <p className="text-xs text-pretty text-mist">
            Grok Imagine 1.5 пишет отдельный кинематографичный промпт под голос стола и снимает один дубль со звуком.
            Длина до 15 секунд — дальше модель не снимает одним куском. Дублей можно заказывать сколько угодно.
          </p>
          {ep.video?.prompt ? (
            <details className="text-sm text-mist">
              <summary className="cursor-pointer text-paper">Как снято</summary>
              <p className="mt-2 text-pretty">{ep.video.prompt}</p>
            </details>
          ) : null}
          {ep.takes && ep.takes.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto">
              {ep.takes.map((take) => (
                <video key={take.url} className="h-24 w-40 shrink-0 rounded-xl bg-ink" controls preload="metadata" src={take.url} />
              ))}
            </div>
          ) : null}
        </div>

        {ep.coverUrl ? <img src={ep.coverUrl} alt="" className="mt-4 w-full rounded-2xl" /> : null}

        <label className="mt-5 block text-xs text-mist">
          Заголовок
          <input className={`${fieldClass} mt-1`} value={title} onChange={(e) => setTitle(e.target.value)} onBlur={save} />
        </label>
        <label className="mt-3 block text-xs text-mist">
          Хук
          <textarea className={`${fieldClass} mt-1 min-h-20`} value={hook} onChange={(e) => setHook(e.target.value)} onBlur={save} />
        </label>
        <label className="mt-3 block text-xs text-mist">
          Текст
          <textarea className={`${fieldClass} mt-1 min-h-64`} value={script} onChange={(e) => setScript(e.target.value)} onBlur={save} />
        </label>
        <label className="mt-3 block text-xs text-mist">
          Описание
          <textarea
            className={`${fieldClass} mt-1 min-h-24`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={save}
          />
        </label>

        {note ? <p className="mt-3 text-sm text-signal">{note}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Btn
            tone="ghost"
            disabled={busyText}
            onClick={() => {
              setBusyText(true);
              setNote("");
              void rewriteEpisode({
                data: {
                  channelName: ch.name,
                  niche: ch.niche,
                  voice: ch.voice,
                  title,
                  hook,
                  pillar: ep.pillar,
                },
              })
                .then((res) => {
                  if (!res.ok) {
                    setNote(res.error);
                    return;
                  }
                  dispatch({ type: "applyRewrite", id: ep.id, rewrite: res.rewrite });
                  setTitle(res.rewrite.title);
                  setHook(res.rewrite.hook);
                  setScript(res.rewrite.script);
                  setDescription(res.rewrite.description);
                  setNote("Текст переписан.");
                })
                .catch(() => setNote("Редактор не ответил"))
                .finally(() => setBusyText(false));
            }}
          >
            {busyText ? "Пишем…" : "Переписать текст"}
          </Btn>
          <Btn
            tone="ghost"
            disabled={busyCover}
            onClick={() => {
              setBusyCover(true);
              setNote("");
              void makeCover({
                data: {
                  look: ch.look,
                  title,
                  headline: ep.thumb.headline,
                  composition: ep.thumb.composition,
                },
              })
                .then((res) => {
                  if (!res.ok) {
                    setNote(res.error);
                    return;
                  }
                  dispatch({ type: "cover", id: ep.id, url: res.url });
                })
                .catch(() => setNote("Кадр не собрался"))
                .finally(() => setBusyCover(false));
            }}
          >
            {busyCover ? "Кадр…" : "Кадр обложки"}
          </Btn>
          <Btn
            tone="quiet"
            onClick={() => {
              const pack = `${title}\n\n${description}\n\n${ep.tags.map((tag) => `#${tag}`).join(" ")}\n\n${script}`;
              void navigator.clipboard.writeText(pack).then(
                () => setNote("Пакет скопирован."),
                () => setNote("Не удалось скопировать."),
              );
            }}
          >
            Копировать пакет
          </Btn>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {ep.needsApproval ? (
            <Btn tone="solid" onClick={() => dispatch({ type: "approve", id: ep.id, now: Date.now() })}>
              Утвердить в эфир
            </Btn>
          ) : null}
          {ep.stage !== "live" ? (
            <Btn tone="ghost" onClick={() => dispatch({ type: "publishNow", id: ep.id, now: Date.now() })}>
              Выпустить сейчас
            </Btn>
          ) : null}
          {ep.stage !== "script" && ep.stage !== "idea" ? (
            <Btn tone="quiet" onClick={() => dispatch({ type: "returnToScript", id: ep.id, now: Date.now() })}>
              На текст
            </Btn>
          ) : null}
          <Btn tone="quiet" onClick={() => { dispatch({ type: "removeEpisode", id: ep.id }); onClose(); }}>
            Убрать выпуск
          </Btn>
        </div>
      </div>
    </div>
  );
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 12;
  return Math.min(15, Math.max(6, Math.round(n)));
}

function SelectAspect({ value, onChange }: { value: Aspect; onChange: (aspect: Aspect) => void }) {
  return (
    <button
      type="button"
      className="inline-flex min-h-11 items-center rounded-full border border-line px-3 text-sm font-semibold text-paper"
      onClick={() => onChange(value === "16:9" ? "9:16" : "16:9")}
    >
      {value === "16:9" ? "Широкий 16:9" : "Вертикальный 9:16"}
    </button>
  );
}
