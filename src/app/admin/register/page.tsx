import Link from "next/link";
import Flash from "@/components/Flash";
import { registerAction } from "@/actions/admin";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">申请当管理员</h1>
      <Flash err={sp.err} ok={sp.ok} />
      <form action={registerAction} className="card space-y-3">
        <div>
          <label className="label" htmlFor="username">
            用户名（3–32 位字母、数字、下划线）
          </label>
          <input id="username" className="input" name="username" autoComplete="username" required />
        </div>
        <div>
          <label className="label" htmlFor="password">
            密码（至少 8 位）
          </label>
          <input
            id="password"
            className="input"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password2">
            再输一遍
          </label>
          <input
            id="password2"
            className="input"
            name="password2"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="note">
            说明（你是谁，为什么要管理权限）
          </label>
          <textarea id="note" className="input" name="note" rows={3} maxLength={200} />
        </div>
        <button type="submit" className="btn btn-primary btn-block">
          提交申请
        </button>
        <p className="muted">提交后要初始管理员批准才能登录。</p>
      </form>
      <p className="muted text-center">
        已经有账号了？<Link href="/admin/login" className="link">去登录</Link>
      </p>
    </div>
  );
}
