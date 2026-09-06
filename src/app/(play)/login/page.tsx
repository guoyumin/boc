import Link from "next/link";
import { redirect } from "next/navigation";
import Flash from "@/components/Flash";
import { loginAction } from "@/actions/account";
import { getUser } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") ? sp.next : "/me";
  if (await getUser()) redirect(next);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">登录</h1>
      <Flash err={sp.err} ok={sp.ok} />
      <form action={loginAction} className="card space-y-3">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="label" htmlFor="username">
            用户名
          </label>
          <input id="username" className="input" name="username" autoComplete="username" required />
        </div>
        <div>
          <label className="label" htmlFor="password">
            密码
          </label>
          <input
            id="password"
            className="input"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary btn-block">
          登录
        </button>
      </form>
      <p className="muted text-center">
        还没有账号？<Link href="/register" className="link">注册一个</Link>
      </p>
      <div className="card text-sm text-stone-600">
        <div className="mb-1 font-medium text-stone-800">要不要注册？</div>
        <p>
          只是来玩一次的话不用注册，直接在时间投票和活动页填昵称就行。
          注册是给常来的人用的：绑定自己的昵称和别名，看自己的报名、出勤和成就。
        </p>
      </div>
    </div>
  );
}
