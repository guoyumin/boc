"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * 可放大的图片：缩略图点开在**当前页面**盖一层看大图，大图按屏幕大小 fit（contain），
 * 不再跳到新窗口开原图。点空白处、右上角 ✕、按 Esc 都能关。
 *
 * 大图那层用 portal 挂到 body 上：这个组件会出现在 <label> 里（投票表单的候选图），
 * 要是把大图渲染在 label 里面，点大图会把 checkbox 一起点了。
 */
export default function Zoomable({
  src,
  thumb,
  alt,
  className,
  buttonClassName = "block w-full",
}: {
  /** 原图 */
  src: string;
  /** 缩略图；不传就直接用原图 */
  thumb?: string;
  alt: string;
  /** 缩略图 <img> 的 class */
  className?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    // 底下的页面别跟着滚
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`cursor-zoom-in ${buttonClassName}`}
        aria-label={`放大查看：${alt}`}
      >
        {/* 图片来自我们自己的 /files 接口，尺寸不固定，不走 next/image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb ?? src} alt={alt} loading="lazy" className={className} />
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={alt}
            className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/92 p-2 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="关闭"
              className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full bg-black/60 text-xl leading-none text-white hover:bg-black/80"
            >
              ✕
            </button>
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-3 left-1/2 max-w-[90vw] -translate-x-1/2 truncate rounded-full bg-black/60 px-3 py-1 text-xs text-white/85 hover:text-white"
            >
              {alt} · 打开原图 ↗
            </a>
          </div>,
          document.body,
        )}
    </>
  );
}
