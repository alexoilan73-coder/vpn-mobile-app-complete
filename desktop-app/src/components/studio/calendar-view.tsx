import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { useState } from "react";
import { Shell } from "@/components/studio/shell";
import { EpisodePanel } from "@/components/studio/episode-panel";
import { useStudio } from "@/lib/studio/context";

export function CalendarView() {
  const { state } = useStudio();
  const [openId, setOpenId] = useState<string | null>(null);
  const today = startOfDay(Date.now());
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  return (
    <Shell>
      <h1 className="font-display text-3xl">Неделя</h1>
      <p className="mt-2 max-w-2xl text-sm text-pretty text-mist">
        У каждого стола свой день и свой час. Они не делят одну ленту и не ждут друг друга.
      </p>
      <div className="mt-6 grid gap-3">
        {days.map((day) => {
          const items = state.episodes.filter((ep) => {
            const at = ep.scheduledAt ?? ep.publishedAt;
            return at ? isSameDay(at, day) : false;
          });
          return (
            <section key={day.toISOString()} className="rounded-2xl border border-line bg-raised p-4">
              <h2 className="text-sm capitalize text-mist">{format(day, "EEEE, d MMMM", { locale: ru })}</h2>
              {items.length === 0 ? (
                <p className="mt-2 text-sm text-mist">Пусто. Столы молчат в этот день.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {items.map((ep) => {
                    const ch = state.channels.find((item) => item.id === ep.channelId);
                    return (
                      <li key={ep.id}>
                        <button type="button" className="w-full text-left text-sm" onClick={() => setOpenId(ep.id)}>
                          <span className="text-signal">{ch?.name}</span>
                          <span className="text-paper"> · {ep.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      {openId ? <EpisodePanel id={openId} onClose={() => setOpenId(null)} /> : null}
    </Shell>
  );
}
