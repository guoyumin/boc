import Link from "next/link";
import { redirect } from "next/navigation";
import Flash from "@/components/Flash";
import { loginAction } from "@/actions/admin";
import { getAdmin } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string; next?: string }>;
}) {
  const sp = await searchParams;
  if (await getAdmin()) redirect(sp.next && sp.next.startsWith("/") ? sp.next : "/admin");

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">管理员登录</h1>
      <Flash err={sp.err} ok={sp.ok} />
      <form action={loginAction} className="card space-y-3">
        <input type="hidden" name="next" value={sp.next ?? "/admin"} />
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
        还没有账号？<Link href="/admin/register" className="link">申请当管理员</Link>
      </p>
      <p className="muted text-center">玩家不需要登录，直接填昵称就行。</p>
    </div>
  );
}
