import { redirect } from "next/navigation";
import Flash from "@/components/Flash";
import { changePasswordAction } from "@/actions/account";
import { getUser } from "@/lib/auth";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  if (!(await getUser())) redirect("/login?next=/me/password");

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="page-title">修改密码</h1>
      <Flash err={sp.err} ok={sp.ok} />
      <form action={changePasswordAction} className="card space-y-3">
        <div>
          <label className="label" htmlFor="current">
            当前密码
          </label>
          <input id="current" className="input" name="current" type="password" autoComplete="current-password" required />
        </div>
        <div>
          <label className="label" htmlFor="next">
            新密码（至少 8 位）
          </label>
          <input id="next" className="input" name="next" type="password" autoComplete="new-password" required />
        </div>
        <div>
          <label className="label" htmlFor="next2">
            再输一遍
          </label>
          <input id="next2" className="input" name="next2" type="password" autoComplete="new-password" required />
        </div>
        <button type="submit" className="btn btn-primary btn-block">
          修改
        </button>
        <p className="muted">改完会退出所有登录，需要重新登录。</p>
      </form>
    </div>
  );
}
