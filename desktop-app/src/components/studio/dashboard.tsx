import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/studio/shell";
import { Btn, fieldClass } from "@/components/studio/ui";
import { useStudio } from "@/lib/studio/context";
import { AUTO_LABEL, STAGE_LABEL, ago, num, viewsOf, when } from "@/lib/studio/format";
import type { Channel, Episode } from "@/lib/studio/types";

function nextEpisode(episodes: Episode[], channelId: string): Episode | undefined {
  const mine = episodes.filter((ep) => ep.channelId === channelId && ep.stage !== "live");
  const rank = { queued: 0, package: 1, script: 2, idea: 3, live: 4 };
  return [...mine].sort((a, b) => rank[a.stage] - rank[b.stage])[0];
}

function DeskLine({ ch, episodes }: { ch: Channel; episodes: Episode[] }) {
  const next = nextEpisode(episodes, ch.id);
  const views = viewsOf(episodes, ch.id);
  return (
    <article className="py-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto] md:items-center">
        <div className="min-w-0">
          <p className="text-xs text-mist">{ch.handle}</p>
          <h2 className="font-display text-xl">{ch.name}</h2>
          <p className="mt-1 text-sm text-pretty text-mist">{ch.niche}</p>
        </div>
        <div className="min-w-0">
          <p className="text-sm text-paper">{next ? next.title : "Стол свободен и ищет тему"}</p>
          <p className="mt-1 text-xs text-mist">
            {AUTO_LABEL[ch.autonomy]}
            {ch.paused ? " · пауза" : ""}
            {next ? ` · ${STAGE_LABEL[next.stage]}` : ""}
            {next?.scheduledAt ? ` · ${when(next.scheduledAt)}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <p className="text-right text-xs text-mist">
            <span className="block tabular-nums text-sm text-paper">{num(ch.subscribers)}</span>
            подписчики · {num(views)} просмотров
          </p>
          <Link
            to="/channel/$channelId"
            params={{ channelId: ch.id }}
            className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-semibold text-paper"
          >
            Открыть стол
          </Link>
        </div>
      </div>
    </article>
  );
}

function needsApprovalWait(ch: Channel, episodes: Episode[]) {
  return episodes.some((ep) => ep.channelId === ch.id && ep.needsApproval);
}

function AddDesk() {
  const { dispatch } = useStudio();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [niche, setNiche] = useState("");
  const [voice, setVoice] = useState("");
  if (!open) {
    return (
      <Btn tone="ghost" onClick={() => setOpen(true)}>
        Новый стол
      </Btn>
    );
  }
  return (
    <form
      className="mt-4 grid gap-3 rounded-2xl border border-line bg-raised p-4"
      onSubmit={(event) => {
        event.preventDefault();
        dispatch({ type: "addChannel", name, niche, voice, now: Date.now() });
        setName("");
        setNiche("");
        setVoice("");
        setOpen(false);
      }}
    >
      <input className={fieldClass} placeholder="Название канала" value={name} onChange={(e) => setName(e.target.value)} />
      <input className={fieldClass} placeholder="Ниша" value={niche} onChange={(e) => setNiche(e.target.value)} />
      <input className={fieldClass} placeholder="Голос" value={voice} onChange={(e) => setVoice(e.target.value)} />
      <div className="flex gap-2">
        <Btn tone="solid" type="submit">
          Открыть стол
        </Btn>
        <Btn tone="quiet" onClick={() => setOpen(false)}>
          Отмена
        </Btn>
      </div>
    </form>
  );
}

export function Dashboard() {
  const { state, dispatch } = useStudio();
  const clips = state.episodes.filter((ep) => ep.video?.status === "done" && ep.video.url);
  return (
    <Shell>
      <p className="max-w-2xl text-pretty text-mist">
        Четыре независимых стола сами находят темы, пишут текст и ставят выпуск в свой эфир. Ролик открытия
        снимается в 1080p со звуком — столько дублей, сколько попросите. Модель держит один дубль до 15 секунд,
        это её потолок, не квота студии.
      </p>

      <section className="mt-6 divide-y divide-line border-t border-line">
        {state.channels.map((ch) => (
          <div key={ch.id} className={needsApprovalWait(ch, state.episodes) ? "border-l-2 border-l-signal pl-4" : ""}>
            <DeskLine ch={ch} episodes={state.episodes} />
          </div>
        ))}
      </section>

      <div className="mt-4">
        <AddDesk />
      </div>

      <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <div>
          <h2 className="font-display text-lg">Ход студии</h2>
          <ol className="mt-3 divide-y divide-line">
            {state.log.slice(0, 8).map((line) => {
              const ch = state.channels.find((item) => item.id === line.channelId);
              return (
                <li key={line.id} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 py-3 text-sm">
                  <span className="text-mist">{ago(line.at)}</span>
                  <span>
                    <span className="text-mist">{ch?.name ?? "Стол"}. </span>
                    {line.text}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        <div>
          <h2 className="font-display text-lg">Снятое</h2>
          {clips.length === 0 ? (
            <p className="mt-3 text-sm text-pretty text-mist">
              Роликов пока нет. Откройте выпуск и нажмите «Снять открытие» — стол напишет кадр и снимет его.
            </p>
          ) : (
            <ul className="mt-3 space-y-4">
              {clips.slice(0, 3).map((ep) => (
                <li key={ep.id}>
                  <p className="mb-2 text-sm">{ep.title}</p>
                  <video className="w-full rounded-2xl bg-black" controls playsInline preload="metadata" src={ep.video?.url} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="mt-10">
        <Btn tone="quiet" onClick={() => dispatch({ type: "reset", now: Date.now() })}>
          Вернуть исходные четыре стола
        </Btn>
      </div>
    </Shell>
  );
}
