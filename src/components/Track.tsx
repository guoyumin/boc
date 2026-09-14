"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { trackFromQuery, type TrackParams } from "@/lib/analytics";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/**
 * 客户端直接上报：和 gtag() 一样把 arguments 推进 dataLayer。初始化脚本
 * （js + config）是 beforeInteractive 的，永远排在这些事件前面；gtag.js 本身
 * 晚一点加载没关系，它会按顺序回放队列。GA 没启用时（没配 ID、管理员、本地开发）
 * 只是往数组里放几条，没有网络请求也没有警告。
 */
export function track(name: string, params: TrackParams) {
  if (typeof window === "undefined") return;
  // gtag.js 认的是 arguments 对象，不是普通数组，所以得用 function 而不是箭头函数
  const push = function () {
    // eslint-disable-next-line prefer-rest-params
    (window.dataLayer ||= []).push(arguments);
  } as (...args: unknown[]) => void;
  push("event", name, params);
}

/** 页面加载类事件：渲染到哪个页面，哪个页面打开时就上报一次（参数变了再报） */
export function Track({ name, params }: { name: string; params: TrackParams }) {
  const key = JSON.stringify(params);
  useEffect(() => {
    track(name, JSON.parse(key));
  }, [name, key]);
  return null;
}

/**
 * Server Action 成功后 redirect 回来的页面带着 ?ev=…，在这里上报一次，
 * 然后把 ev 参数从地址栏抹掉：刷新不会重复计数，把链接转发给别人也不会
 * 替他记一次「报名成功」。挂在 (play) layout 里，各个页面不用自己管。
 */
export function TrackFromQuery() {
  const pathname = usePathname();
  const search = useSearchParams();
  const ev = trackFromQuery(search);
  const key = ev ? `${pathname}?${search}` : null;
  useEffect(() => {
    if (!ev || !key) return;
    track(ev.name, ev.params);
    const url = new URL(window.location.href);
    for (const k of [...url.searchParams.keys()]) {
      if (k === "ev" || k.startsWith("ev_")) url.searchParams.delete(k);
    }
    window.history.replaceState(window.history.state, "", url);
    // ev 是从 search 派生的，key 变了它才变
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}
