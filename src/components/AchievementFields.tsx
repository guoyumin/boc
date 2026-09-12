"use client";

import { useId, useState } from "react";
import RoleIcon from "@/components/RoleIcon";
import { RARITY_OPTIONS } from "@/lib/labels";
import { GENERIC_ROLE, canonicalRole, roleOptionGroups } from "@/lib/roles";

/** 表单里用得到的字段，页面传进来的是普通对象（服务端组件 → 客户端组件要可序列化） */
export type AchievementDraft = {
  name: string;
  description: string;
  role: string;
  rarity: string;
  scriptName: string | null;
  hidden: number;
  sortOrder: number;
  active: number;
};

const CUSTOM = "__custom__";
const GROUPS = roleOptionGroups();
const OFFICIAL = new Set(GROUPS.flatMap((g) => g.roles));

/**
 * 角色下拉（issue #54）。选项是 177 个官方角色，选完图标自动对上——
 * 以前是手填，打错一个字图标就回落成门环、红蓝筛选也漏掉。
 * 非官方角色（自制板子之类）走「其他（手填）」。
 */
function RoleSelect({ defaultValue }: { defaultValue: string }) {
  // 库里的旧写法（少个连字符之类）先收敛成官方写法，才能在下拉里选中
  const initial = canonicalRole(defaultValue);
  const known = initial === GENERIC_ROLE || OFFICIAL.has(initial);
  const [choice, setChoice] = useState(known ? initial : CUSTOM);
  const [custom, setCustom] = useState(known ? "" : initial);
  const role = choice === CUSTOM ? custom : choice;
  const id = useId();

  return (
    <div>
      <label className="label" htmlFor={id}>
        角色
      </label>
      <div className="flex items-center gap-2">
        <RoleIcon role={role} className="size-7" />
        <select
          id={id}
          className="input min-w-0 flex-1"
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
        >
          <option value={GENERIC_ROLE}>通用（不绑定角色）</option>
          {GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </optgroup>
          ))}
          <option value={CUSTOM}>其他（手填）</option>
        </select>
      </div>
      {choice === CUSTOM && (
        <input
          className="input mt-2"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          maxLength={20}
          placeholder="非官方角色名"
          aria-label="非官方角色名"
          required
        />
      )}
      <input type="hidden" name="role" value={role} />
    </div>
  );
}

export default function AchievementFields({ a }: { a?: AchievementDraft }) {
  return (
    <>
      <div>
        <label className="label">名称</label>
        <input className="input" name="name" defaultValue={a?.name ?? ""} maxLength={30} required />
      </div>
      <div>
        <label className="label">达成条件</label>
        <textarea
          className="input"
          name="description"
          rows={2}
          defaultValue={a?.description ?? ""}
          maxLength={200}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <RoleSelect defaultValue={a?.role ?? GENERIC_ROLE} />
        <div>
          <label className="label">稀有度</label>
          <select className="input" name="rarity" defaultValue={a?.rarity ?? "common"}>
            {RARITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">剧本专属（留空 = 全局成就）</label>
        <input
          className="input"
          name="scriptName"
          defaultValue={a?.scriptName ?? ""}
          maxLength={40}
          placeholder="宏伟岩廊"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">排序</label>
          <input className="input" name="sortOrder" type="number" defaultValue={a?.sortOrder ?? 100} />
        </div>
        <div className="flex items-end gap-4 pb-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="hidden"
              value="1"
              defaultChecked={a?.hidden === 1}
              className="h-4 w-4 accent-[#8b1e2d]"
            />
            隐藏
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="active"
              value="1"
              defaultChecked={a ? a.active === 1 : true}
              className="h-4 w-4 accent-[#8b1e2d]"
            />
            上架
          </label>
        </div>
      </div>
    </>
  );
}
