"use client";

import { useState, useTransition } from "react";
import { setAttendance } from "@/actions/signups";
import { ATTEND_OPTIONS } from "@/lib/labels";

export default function AttendanceButtons({
  signupId,
  value,
}: {
  signupId: number;
  value: string;
}) {
  const [current, setCurrent] = useState(value);
  const [pending, startTransition] = useTransition();

  return (
    <div className={`inline-flex overflow-hidden rounded-lg border border-line-strong ${pending ? "opacity-60" : ""}`}>
      {ATTEND_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={pending}
          onClick={() => {
            const prev = current;
            setCurrent(o.value);
            startTransition(async () => {
              try {
                await setAttendance(signupId, o.value);
              } catch {
                setCurrent(prev);
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
  );
}
