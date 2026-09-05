"use client";

import { useSyncExternalStore } from "react";

export const NICK_KEY = "bocNickname";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function readClient(): string {
  try {
    return localStorage.getItem(NICK_KEY) ?? "";
  } catch {
    return "";
  }
}

/** 浏览器里记住的昵称。服务端渲染时是空字符串，水合后才有值。 */
export function useStoredNickname(): string {
  return useSyncExternalStore(subscribe, readClient, () => "");
}

export function saveNickname(name: string): void {
  const v = name.trim();
  if (!v) return;
  try {
    localStorage.setItem(NICK_KEY, v);
  } catch {
    /* 隐私模式下写不进去就算了 */
  }
}
