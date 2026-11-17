"use client";

import { useState, useTransition } from "react";
import { setAttendance, setPresenceFlag } from "@/actions/signups";
import { ATTEND_OPTIONS } from "@/lib/labels";

/**
 * 管理员签到：左边一组是到了哪场，右边是「迟到」「早退」两个开关（issue #1、#66）。
 * 这两个和场次正交——可以「下午 + 迟到 + 早退」——所以不放进同一组单选里。
 */
export default function AttendanceButtons({
  signupId,
  value,
  signup = "none",
  late = false,
  leftEarly = false,
}: {
  signupId: number;
  value: string;
  /** 报名的场次：没标到场就点迟到/早退时，服务端按它补到场，这里照同样的规则先显示出来 */
  signup?: string;
  late?: boolean;
  leftEarly?: boolean;
}) {
  const [current, setCurrent] = useState(value);
  const [flags, setFlags] = useState({ late, leftEarly });
  const [pending, startTransition] = useTransition();

  function toggle(flag: "late" | "leftEarly") {
    const prev = current;
    const prevFlags = flags;
    const next = !flags[flag];
    setFlags({ ...flags, [flag]: next });
    // 还没标到场就点迟到/早退，服务端会按报名场次补上到场；这里按同一规则先显示出来
    if (next && current === "none") setCurrent(signup !== "none" ? signup : "full");
    startTransition(async () => {
      try {
        await setPresenceFlag(signupId, flag, next);
      } catch {
        setCurrent(prev);
        setFlags(prevFlags);
      }
    });
  }

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
              const prevFlags = flags;
              setCurrent(o.value);
              // 服务端改成未到会把迟到和早退一起清掉，这里同步一下
              if (o.value === "none") setFlags({ late: false, leftEarly: false });
              startTransition(async () => {
                try {
                  await setAttendance(signupId, o.value);
                } catch {
                  setCurrent(prev);
                  setFlags(prevFlags);
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
      {(
        [
          { flag: "late", label: "迟到", hint: "标记迟到（不算鸽）" },
          { flag: "leftEarly", label: "早退", hint: "标记早退（不算鸽）" },
        ] as const
      ).map((b) => (
        <button
          key={b.flag}
          type="button"
          disabled={pending}
          aria-pressed={flags[b.flag]}
          title={flags[b.flag] ? `取消${b.label}标记` : b.hint}
          onClick={() => toggle(b.flag)}
          className={`rounded-lg border px-2 py-1 text-xs ${
            flags[b.flag]
              ? "border-warn/40 bg-warn-soft text-warn"
              : "border-line-strong bg-surface text-faint"
          }`}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
