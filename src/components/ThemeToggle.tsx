"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY } from "@/lib/theme";

const THEMES = [
  { key: "auto", label: "自动" },
  { key: "dark", label: "深色" },
  { key: "light", label: "浅色" },
] as const;
type Theme = (typeof THEMES)[number]["key"];

/** localStorage 不是 React state，用 useSyncExternalStore 订阅，别在 effect 里 setState */
const listeners = new Set<() => void>();
function subscribe(fn: () => void) {
  listeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}
function readTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "dark" || v === "light" ? v : "auto";
  } catch {
    return "auto";
  }
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  // 服务端和首帧都当作 auto：真实值由 ThemeScript 先写到 <html> 上，不会闪
  const theme = useSyncExternalStore(subscribe, readTheme, () => "auto" as Theme);

  function pick(next: Theme) {
    try {
      if (next === "auto") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {
      /* 隐私模式下存不了，至少让本次生效 */
    }
    // 用 setAttribute 而不是改 dataset：eslint 的 immutability 规则拦 dataset 赋值
    const root = document.documentElement;
    if (next === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);
    listeners.forEach((fn) => fn());
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="hidden text-xs text-faint sm:inline">外观</span>
      <div className="flex rounded-lg border border-line p-0.5">
        {THEMES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => pick(t.key)}
            className={`rounded-md px-2 py-1 text-xs transition ${
              theme === t.key ? "bg-brand text-white" : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
