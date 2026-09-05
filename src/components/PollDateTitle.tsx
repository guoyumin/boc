"use client";

import { useState } from "react";
import { addDays, formatDate, pollTitle } from "@/lib/dates";

/**
 * 发起时间投票时，标题跟着所选的周末走（需求 e）。
 * 管理员自己改过标题之后就不再自动覆盖。
 */
export default function PollDateTitle({ defaultSaturday }: { defaultSaturday: string }) {
  const [saturday, setSaturday] = useState(defaultSaturday);
  const [title, setTitle] = useState(pollTitle(defaultSaturday));
  const [touched, setTouched] = useState(false);

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(saturday);

  return (
    <>
      <div>
        <label className="label" htmlFor="saturday">
          这个周末的周六
        </label>
        <input
          id="saturday"
          className="input"
          type="date"
          name="saturday"
          value={saturday}
          required
          onChange={(e) => {
            const v = e.target.value;
            setSaturday(v);
            if (!touched && /^\d{4}-\d{2}-\d{2}$/.test(v)) setTitle(pollTitle(v));
          }}
        />
        {valid && (
          <p className="muted mt-1">
            周六 {formatDate(saturday)}，周日 {formatDate(addDays(saturday, 1))}
          </p>
        )}
      </div>
      <div>
        <label className="label" htmlFor="title">
          标题
        </label>
        <input
          id="title"
          className="input"
          name="title"
          value={title}
          maxLength={40}
          onChange={(e) => {
            setTouched(true);
            setTitle(e.target.value);
          }}
        />
        <p className="muted mt-1">默认按选的日期生成，可以自己改。</p>
      </div>
    </>
  );
}
