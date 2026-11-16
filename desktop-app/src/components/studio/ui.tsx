import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fieldClass =
  "w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm text-paper outline-none placeholder:text-mist";

export function Btn({
  tone = "ghost",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "ghost" | "solid" | "quiet" }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition duration-200 disabled:opacity-50",
        tone === "solid" && "bg-signal text-on-signal hover:brightness-110",
        tone === "ghost" && "border border-line bg-raised text-paper hover:border-mist",
        tone === "quiet" && "px-2 text-mist hover:text-paper",
        className,
      )}
      {...props}
    />
  );
}
