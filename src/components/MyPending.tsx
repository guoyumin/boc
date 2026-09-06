"use client";

import { useStoredNickname } from "./useNickname";

/** ACH-04：待确认的宣告只有本人（同昵称）看得到 */
export default function MyPending({ names }: { names: string[] }) {
  const nick = useStoredNickname().trim().toLowerCase();
  const mine = nick !== "" && names.some((n) => n.trim().toLowerCase() === nick);
  if (!mine) return null;
  return (
    <div className="mt-3 rounded-lg border border-warn/30 bg-warn-soft px-3 py-2 text-sm text-warn">
      ⏳ 你的宣告已提交，等管理员确认后才会上墙。
    </div>
  );
}
