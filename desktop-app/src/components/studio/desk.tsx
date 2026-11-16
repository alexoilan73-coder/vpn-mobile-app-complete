import { useEffect, useState } from "react";
import { Shell } from "@/components/studio/shell";
import { EpisodePanel } from "@/components/studio/episode-panel";
import { Btn, fieldClass } from "@/components/studio/ui";
import { useStudio } from "@/lib/studio/context";
import { AUTO_LABEL, DAY_ORDER, STAGE_LABEL, dayName, num, viewsOf, when } from "@/lib/studio/format";
import type { Autonomy, Episode, Stage } from "@/lib/studio/types";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const STAGES: Stage[] = ["idea", "script", "package", "queued", "live"];

export function Desk({ channelId }: { channelId: string }) {
  const { state, dispatch } = useStudio();
  const ch = state.channels.find((item) => item.id === channelId);
  const [openId, setOpenId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [name, setName] = useState(ch?.name ?? "");
  const [niche, setNiche] = useState(ch?.niche ?? "");
  const [voice, setVoice] = useState(ch?.voice ?? "");
  const [look, setLook] = useState(ch?.look ?? "");
  const [hour, setHour] = useState(ch?.hour ?? 18);
  const [formatLabel, setFormatLabel] = useState(ch?.format ?? "");

  useEffect(() => {
    if (!ch) return;
    setName(ch.name);
    setNiche(ch.niche);
    setVoice(ch.voice);
    setLook(ch.look);
    setHour(ch.hour);
    setFormatLabel(ch.format);
  }, [ch?.id]);

  if (!ch) {
    return (
      <Shell>
        <p>Такого стола нет.</p>
      </Shell>
    );
  }

  const mine = state.episodes.filter((ep) => ep.channelId === ch.id);
  const points = mine
    .filter((ep) => ep.stage === "live" && ep.publishedAt && ep.stats)
    .sort((a, b) => (a.publishedAt ?? 0) - (b.publishedAt ?? 0))
    .slice(-8)
    .map((ep) => ({
      label: format(ep.publishedAt ?? 0, "d MMM", { locale: ru }),
      views: ep.stats?.views ?? 0,
    }));

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-mist">{ch.handle}</p>
          <h1 className="font-display text-3xl">{ch.name}</h1>
          <p className="mt-1 text-sm text-mist">
            {num(ch.subscribers)} подписчиков · {num(viewsOf(mine, ch.id))} просмотров на столе
          </p>
        </div>
        <Btn tone={ch.paused ? "solid" : "ghost"} onClick={() => dispatch({ type: "pause", id: ch.id })}>
          {ch.paused ? "Снять с паузы" : "Пауза"}
        </Btn>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["auto", "approve", "draft"] as Autonomy[]).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`min-h-11 rounded-full px-4 text-sm font-semibold ${ch.autonomy === mode ? "bg-paper text-ink" : "border border-line text-mist"}`}
            onClick={() => dispatch({ type: "setAutonomy", id: ch.id, autonomy: mode })}
          >
            {AUTO_LABEL[mode]}
          </button>
        ))}
      </div>

      <label className="mt-4 flex min-h-11 items-center gap-3 text-sm text-mist">
        <input
          type="checkbox"
          checked={ch.autoShoot}
          onChange={(event) => dispatch({ type: "setAutoShoot", id: ch.id, on: event.target.checked })}
        />
        Стол сам заказывает ролик, когда выпуск упакован
      </label>

      <form
        className="mt-6 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          dispatch({
            type: "patchChannel",
            id: ch.id,
            patch: { name, niche, voice, look, hour: clampHour(hour), format: formatLabel },
          });
        }}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} aria-label="Название" />
          <input className={fieldClass} value={formatLabel} onChange={(e) => setFormatLabel(e.target.value)} aria-label="Формат" />
        </div>
        <textarea className={`${fieldClass} min-h-16`} value={niche} onChange={(e) => setNiche(e.target.value)} aria-label="Ниша" />
        <textarea className={`${fieldClass} min-h-16`} value={voice} onChange={(e) => setVoice(e.target.value)} aria-label="Голос" />
        <textarea className={`${fieldClass} min-h-24`} value={look} onChange={(e) => setLook(e.target.value)} aria-label="Как снимаем" />
        <div className="flex flex-wrap items-center gap-2">
          {DAY_ORDER.map((day) => {
            const on = ch.days.includes(day);
            return (
              <button
                key={day}
                type="button"
                className={`min-h-11 min-w-11 rounded-full px-3 text-sm ${on ? "bg-signal text-on-signal" : "border border-line text-mist"}`}
                onClick={() => dispatch({ type: "toggleDay", id: ch.id, day })}
              >
                {dayName(day)}
              </button>
            );
          })}
          <label className="inline-flex min-h-11 items-center gap-2 text-sm text-mist">
            час
            <input
              className="w-16 rounded-xl border border-line bg-ink px-2 py-2 tabular-nums text-paper"
              type="number"
              min={0}
              max={23}
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
            />
          </label>
          <Btn tone="solid" type="submit">
            Сохранить стол
          </Btn>
        </div>
      </form>

      {points.length > 1 ? (
        <div className="mt-8 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points}>
              <XAxis
                dataKey="label"
                stroke="var(--color-mist)"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                interval="preserveStartEnd"
                minTickGap={32}
              />
              <Tooltip
                contentStyle={{ background: "var(--color-raised)", border: "1px solid var(--color-line)", borderRadius: 12 }}
                labelStyle={{ color: "var(--color-paper)" }}
              />
              <Area dataKey="views" stroke="var(--color-signal)" fill="var(--color-signal)" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      <form
        className="mt-8 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          dispatch({ type: "addIdea", channelId: ch.id, title, now: Date.now() });
          setTitle("");
        }}
      >
        <input
          className={fieldClass}
          placeholder="Своя тема — стол подхватит"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Btn tone="solid" type="submit">
          В работу
        </Btn>
      </form>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        {STAGES.map((stage) => (
          <section key={stage} className="min-w-0">
            <h2 className="text-xs tracking-widest text-mist uppercase">{STAGE_LABEL[stage]}</h2>
            <ul className="mt-2 space-y-2">
              {mine
                .filter((ep) => ep.stage === stage)
                .map((ep) => (
                  <li key={ep.id}>
                    <EpisodeCard ep={ep} onOpen={() => setOpenId(ep.id)} />
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>

      {ch.custom ? (
        <div className="mt-8">
          <Btn tone="quiet" onClick={() => dispatch({ type: "removeChannel", id: ch.id })}>
            Закрыть этот стол
          </Btn>
        </div>
      ) : null}

      {openId ? <EpisodePanel id={openId} onClose={() => setOpenId(null)} /> : null}
    </Shell>
  );
}

function EpisodeCard({ ep, onOpen }: { ep: Episode; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="w-full rounded-2xl border border-line bg-raised p-3 text-left">
      <p className="text-sm font-semibold text-pretty">{ep.title}</p>
      <p className="mt-1 text-xs text-mist">
        {ep.needsApproval ? "Ждёт вас" : ep.pillar}
        {ep.scheduledAt && ep.stage === "queued" ? ` · ${when(ep.scheduledAt)}` : ""}
        {ep.video?.status === "done" ? " · ролик готов" : ""}
        {ep.video?.status === "pending" ? " · снимаем" : ""}
      </p>
    </button>
  );
}

function clampHour(n: number): number {
  if (!Number.isFinite(n)) return 18;
  return Math.min(23, Math.max(0, Math.round(n)));
}
