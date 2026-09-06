"use client";

import { useState, useTransition } from "react";
import { setNoShowWaived } from "@/actions/signups";

/** 管理员 review 之后把某次「鸽」免掉，或者撤销免除（需求 h）。 */
export default function WaiveButton({ signupId, waived }: { signupId: number; waived: boolean }) {
  const [on, setOn] = useState(waived);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      title={on ? "撤销免除，重新算作鸽" : "这次不算鸽"}
      onClick={() => {
        const prev = on;
        setOn(!on);
        startTransition(async () => {
          try {
            await setNoShowWaived(signupId, !prev);
          } catch {
            setOn(prev);
          }
        });
      }}
      className={`btn btn-sm ${pending ? "opacity-60" : ""} ${
        on ? "border-ok/40 bg-ok-soft text-ok" : ""
      }`}
    >
      {on ? "已免鸽" : "免鸽"}
    </button>
  );
}
