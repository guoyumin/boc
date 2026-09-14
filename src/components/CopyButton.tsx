"use client";

import { useRef, useState } from "react";
import { track } from "@/components/Track";

export default function CopyButton({
  text,
  label = "复制到微信",
  className = "btn",
  block = true,
  share,
}: {
  text: string;
  label?: string;
  className?: string;
  /** false = 不占满整行，可以和别的按钮排一排 */
  block?: boolean;
  /** 传了就上报 share_copy 事件：看分享按钮有没有人用 */
  share?: "link" | "jielong";
}) {
  const [state, setState] = useState<"idle" | "done" | "manual">("idle");
  const areaRef = useRef<HTMLTextAreaElement>(null);

  async function copy() {
    if (share) track("share_copy", { kind: share });
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
      setTimeout(() => setState("idle"), 2000);
      return;
    } catch {
      /* 微信里可能没有 clipboard API，退化为选中文本 */
    }
    setState("manual");
    requestAnimationFrame(() => {
      const el = areaRef.current;
      if (!el) return;
      el.focus();
      el.select();
      el.setSelectionRange(0, text.length);
    });
  }

  return (
    <div className={block ? "w-full" : "contents"}>
      <button type="button" className={className} onClick={copy}>
        {state === "done" ? "已复制 ✓" : label}
      </button>
      {state === "manual" && (
        <div className="mt-2 w-full">
          <p className="muted mb-1">复制没成功，长按下面的文字自己复制：</p>
          <textarea ref={areaRef} className="input h-40 font-mono text-xs" readOnly value={text} />
        </div>
      )}
    </div>
  );
}
