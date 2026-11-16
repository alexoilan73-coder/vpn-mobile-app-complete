import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { clock, longDate } from "@/lib/studio/format";
import { useStudio } from "@/lib/studio/context";
import { cn } from "@/components/studio/ui";

function Clock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="text-right">
      <p className="tabular-nums text-sm text-paper">{clock(now)}</p>
      <p className="text-xs capitalize text-mist">{longDate(now)}</p>
    </div>
  );
}

const links = [
  { to: "/", label: "Пульт", exact: true },
  { to: "/calendar", label: "Неделя", exact: false },
  { to: "/queue", label: "Утвердить", exact: false },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStudio();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const waiting = state.episodes.filter((ep) => ep.needsApproval).length;
  const shooting = state.episodes.filter((ep) => ep.video?.status === "pending").length + state.shootQueue.length;

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="font-display text-lg tracking-wide text-paper">
            Автоэфир
          </Link>
          <span className="hidden items-center gap-2 text-xs text-mist sm:inline-flex">
            <span className="pulse-dot size-2 rounded-full bg-signal" aria-hidden />
            столы сами
          </span>
          <div className="ml-auto flex items-center gap-2">
            {shooting > 0 ? <span className="text-xs text-signal">Снимаем</span> : null}
            <Clock />
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 pb-3">
          {links.map((link) => {
            const on = link.exact ? path === link.to : path.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold",
                  on ? "bg-paper text-ink" : "text-mist",
                )}
              >
                {link.label}
                {link.to === "/queue" && waiting > 0 ? (
                  <span className="ml-2 tabular-nums text-signal">{waiting}</span>
                ) : null}
              </Link>
            );
          })}
          <button
            type="button"
            className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-signal px-4 text-sm font-semibold text-on-signal sm:ml-auto"
            onClick={() => dispatch({ type: "shift", now: Date.now() })}
          >
            Прогнать смену
          </button>
        </div>
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
          {state.channels.map((ch) => {
            const on = path === `/channel/${ch.id}`;
            return (
              <Link
                key={ch.id}
                to="/channel/$channelId"
                params={{ channelId: ch.id }}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-sm",
                  on ? "border-signal text-paper" : "border-line text-mist",
                  ch.paused && "opacity-50",
                )}
              >
                <span className={cn("size-1.5 rounded-full", ch.paused ? "bg-mist" : "bg-signal")} />
                {ch.name}
              </Link>
            );
          })}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
