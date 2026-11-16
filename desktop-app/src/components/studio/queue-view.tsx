import { useState } from "react";
import { Shell } from "@/components/studio/shell";
import { EpisodePanel } from "@/components/studio/episode-panel";
import { Btn } from "@/components/studio/ui";
import { useStudio } from "@/lib/studio/context";

export function QueueView() {
  const { state, dispatch } = useStudio();
  const [openId, setOpenId] = useState<string | null>(null);
  const waiting = state.episodes.filter((ep) => ep.needsApproval);

  return (
    <Shell>
      <h1 className="font-display text-3xl">Утвердить</h1>
      <p className="mt-2 max-w-2xl text-sm text-pretty text-mist">
        Сюда попадают только столы в режиме «на утверждение». Остальные выпускают себя сами.
      </p>
      {waiting.length === 0 ? (
        <p className="mt-8 text-sm text-mist">Сейчас никто не ждёт. Кухня позовёт, когда упакует следующий ужин.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {waiting.map((ep) => {
            const ch = state.channels.find((item) => item.id === ep.channelId);
            return (
              <li key={ep.id} className="rounded-2xl border border-line bg-raised p-4">
                <p className="text-xs text-signal">{ch?.name}</p>
                <h2 className="mt-1 text-lg font-semibold">{ep.title}</h2>
                <p className="mt-2 text-sm text-pretty text-mist">{ep.hook}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Btn tone="solid" onClick={() => dispatch({ type: "approve", id: ep.id, now: Date.now() })}>
                    В эфир
                  </Btn>
                  <Btn tone="ghost" onClick={() => dispatch({ type: "returnToScript", id: ep.id, now: Date.now() })}>
                    На текст
                  </Btn>
                  <Btn tone="quiet" onClick={() => setOpenId(ep.id)}>
                    Открыть
                  </Btn>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {openId ? <EpisodePanel id={openId} onClose={() => setOpenId(null)} /> : null}
    </Shell>
  );
}
