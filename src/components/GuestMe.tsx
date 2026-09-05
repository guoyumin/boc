"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { lookupPlayerId } from "@/actions/players";
import { saveNickname, useStoredNickname } from "./useNickname";

/**
 * 没登录时的「我的」页。注册是可选的：填个昵称照样能找到自己的记录。
 */
export default function GuestMe({ err, ok }: { err?: string; ok?: string }) {
  const router = useRouter();
  const stored = useStoredNickname();
  const [edited, setEdited] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const value = edited ?? stored;
  // 记住了昵称就先去查，查到就直接跳到那个人的主页
  const looking = stored !== "" && !missing;

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

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">我的</h1>
      {(err || ok) && (
        <p className={`card text-sm ${err ? "text-red-700" : "text-emerald-700"}`}>{err || ok}</p>
      )}

      {looking ? (
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
        </div>
      )}

      <div className="card space-y-2">
        <div className="card-title">要不要注册个账号？</div>
        <p className="muted">
          只玩一次不用注册，填昵称直接报名就行。常来的话可以注册：绑定自己的昵称和别名，
          在一个地方看自己的报名、出勤和成就。
        </p>
        <div className="flex gap-2">
          <Link href="/register" className="btn btn-primary flex-1">
            注册
          </Link>
          <Link href="/login" className="btn flex-1">
            登录
          </Link>
        </div>
      </div>
    </div>
  );
}
