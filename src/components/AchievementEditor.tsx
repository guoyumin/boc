"use client";

import { useState } from "react";
import AchievementFields, { type AchievementDraft } from "@/components/AchievementFields";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { deleteAchievement, saveAchievement } from "@/actions/achievements";

/**
 * 单条成就的编辑表单，点开才渲染。
 * 角色下拉有 177 个官方角色，一屏几十条成就要是每条都预渲染一个下拉，
 * 光 option 就上万个，手机上直接卡住——所以这里是懒渲染（issue #54）。
 */
export default function AchievementEditor({ id, a }: { id: number; a: AchievementDraft }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="mt-2 text-sm text-brand-bright" onClick={() => setOpen(true)}>
        编辑
      </button>
    );
  }

  return (
    <div className="mt-2">
      <button type="button" className="text-sm text-brand-bright" onClick={() => setOpen(false)}>
        收起
      </button>
      <form action={saveAchievement} className="mt-3 space-y-3">
        <input type="hidden" name="achievementId" value={id} />
        <AchievementFields a={a} />
        <button type="submit" className="btn btn-primary btn-block">
          保存
        </button>
      </form>
      <form action={deleteAchievement} className="mt-2">
        <input type="hidden" name="achievementId" value={id} />
        <ConfirmSubmit message={`删除成就「${a.name}」？相关宣告也会一起删掉。`}>删除成就</ConfirmSubmit>
      </form>
    </div>
  );
}
