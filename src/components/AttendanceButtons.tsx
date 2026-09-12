"use client";

import { useState, useTransition } from "react";
import { setAttendance, setLate } from "@/actions/signups";
import { ATTEND_OPTIONS } from "@/lib/labels";

/**
 * 管理员签到：左边一组是到了哪场，右边单独一个「迟到」开关（issue #1）。
 * 迟到和场次正交——可以「下午 + 迟到」——所以不放进同一组单选里。
 */
export default function AttendanceButtons({
  signupId,
  value,
  signup = "none",
  late = false,
}: {
  signupId: number;
  value: string;
  /** 报名的场次：没标到场就点迟到时，服务端按它补到场，这里照同样的规则先显示出来 */
  signup?: string;
  late?: boolean;
}) {
  const [current, setCurrent] = useState(value);
  const [isLate, setIsLate] = useState(late);
  const [pending, startTransition] = useTransition();

  return (
    <div className={`inline-flex items-center gap-1.5 ${pending ? "opacity-60" : ""}`}>
      <div className="inline-flex overflow-hidden rounded-lg border border-line-strong">
        {ATTEND_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={pending}
            onClick={() => {
              const prev = current;
              const prevLate = isLate;
              setCurrent(o.value);
              // 服务端改成未到会把迟到一起清掉，这里同步一下
              if (o.value === "none") setIsLate(false);
              startTransition(async () => {
                try {
                  await setAttendance(signupId, o.value);
                } catch {
                  setCurrent(prev);
                  setIsLate(prevLate);
                }
              });
            }}
            className={`px-2 py-1 text-xs ${
              current === o.value ? "bg-brand text-white" : "bg-surface text-ink-2"
            } ${o.value !== "none" ? "border-l border-line-strong" : ""}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={pending}
        aria-pressed={isLate}
        title={isLate ? "取消迟到标记" : "标记迟到（不算鸽）"}
        onClick={() => {
          const prev = current;
          const prevLate = isLate;
          const next = !isLate;
          setIsLate(next);
          // 还没标到场就点迟到，服务端会按报名场次补上到场；这里按同一规则先显示出来
          if (next && current === "none") setCurrent(signup !== "none" ? signup : "full");
          startTransition(async () => {
            try {
              await setLate(signupId, next);
            } catch {
              setCurrent(prev);
              setIsLate(prevLate);
            }
          });
        }}
        className={`rounded-lg border px-2 py-1 text-xs ${
          isLate ? "border-warn/40 bg-warn-soft text-warn" : "border-line-strong bg-surface text-faint"
        }`}
      >
        迟到
      </button>
    </div>
  );
}
