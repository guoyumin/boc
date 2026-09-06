import Link from "next/link";
import { redirect } from "next/navigation";
import Flash from "@/components/Flash";
import NicknameInput from "@/components/NicknameInput";
import { registerAction } from "@/actions/account";
import { getUser } from "@/lib/auth";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  if (await getUser()) redirect("/me");

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">注册</h1>
      <Flash err={sp.err} ok={sp.ok} />
      <p className="muted">
        只玩一次不用注册，直接填昵称报名就行。注册是为了把历史记录和成就都挂到你名下。
      </p>
      <form action={registerAction} className="card space-y-3">
        <div>
          <label className="label" htmlFor="nickname">
            昵称（群里大家怎么叫你）
          </label>
          <NicknameInput id="nickname" name="nickname" required />
          <p className="mt-1 text-xs text-stone-500">
            填的昵称如果名册里已经有了，就会认领那条记录，以前的报名和成就都跟过来。
          </p>
        </div>
        <div>
          <label className="label" htmlFor="username">
            用户名（登录用，3–32 位字母、数字、下划线）
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
        <button type="submit" className="btn btn-primary btn-block">
          注册
        </button>
      </form>
      <p className="muted text-center">
        已经有账号了？<Link href="/login" className="link">去登录</Link>
      </p>
    </div>
  );
}
