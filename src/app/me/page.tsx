"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { lookupPlayerId } from "@/actions/players";
import { saveNickname, useStoredNickname } from "@/components/useNickname";

export default function MePage() {
  const router = useRouter();
  const stored = useStoredNickname();
  const [edited, setEdited] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const value = edited ?? stored;

  // 有记住的昵称就直接跳到对应的玩家页
  useEffect(() => {
    if (!stored) return;
    let cancelled = false;
    lookupPlayerId(stored).then((id) => {
      if (cancelled) return;
      if (id) router.replace(`/players/${id}`);
      else setMissing(true);
    });
    return () => {
      cancelled = true;
    };
  }, [stored, router]);

  async function go() {
    const clean = value.trim();
    if (!clean) return;
    const id = await lookupPlayerId(clean);
    if (id) {
      saveNickname(clean);
      router.replace(`/players/${id}`);
    } else {
      setMissing(true);
    }
  }

  const loading = stored !== "" && !missing;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">我的</h1>
      {loading ? (
        <p className="muted">正在找你的记录…</p>
      ) : (
        <div className="card space-y-3">
          <p className="muted">
            {missing
              ? `名册里还没有「${value}」。参加过活动、填过时间或记过局之后就会有页面了。`
              : "填一个昵称，就能看到自己的出席、对局和成就。"}
          </p>
          <div>
            <label className="label" htmlFor="me-nick">
              你的昵称
            </label>
            <input
              id="me-nick"
              className="input"
              value={value}
              maxLength={20}
              placeholder="微信里用的名字"
              onChange={(e) => {
                setEdited(e.target.value);
                setMissing(false);
              }}
            />
          </div>
          <button type="button" className="btn btn-primary btn-block" onClick={() => void go()}>
            查看我的页面
          </button>
          <Link href="/events" className="btn btn-block">
            先去看看活动
          </Link>
        </div>
      )}
    </div>
  );
}
