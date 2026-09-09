"use client";

import { useState } from "react";
import RarityBadge from "@/components/RarityBadge";
import RoleIcon from "@/components/RoleIcon";
import { importAchievements } from "@/actions/achievements";
import { parseAchievementsTable, type ImportPreview } from "@/lib/achievements-csv";

const SAMPLE = `role\tname\tcondition\tstars
厨师\t零对之夜\t首夜得知场上有 0 对邪恶玩家相邻\t3
麻脸巫婆\t改头换面\t把一名玩家变成别的角色并赢下游戏\t5`;

const SKIP_LABEL = { exists: "库里已有，跳过", dup: "这份表里重复，跳过" } as const;

/**
 * 成就表格导入（issue #54）。先解析预览、确认了才写库——
 * 一次导几十条，错在哪总得先看得见。跟接龙导入是同一套做法。
 */
export default function AchievementImport({ existingNames }: { existingNames: string[] }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  function doParse(value: string) {
    setPreview(value.trim() ? parseAchievementsTable(value, existingNames) : null);
  }

  async function pickFile(file: File | undefined) {
    if (!file) return;
    const value = await file.text();
    setText(value);
    doParse(value);
  }

  const fresh = preview?.rows.filter((r) => r.skip === null) ?? [];
  const skipped = (preview?.rows.length ?? 0) - fresh.length;

  return (
    <div className="space-y-4">
      <div className="card">
        <label className="label" htmlFor="ach-import-text">
          把表格整块粘贴进来（从飞书 / Excel 直接复制就行）
        </label>
        <textarea
          id="ach-import-text"
          className="input h-44 font-mono text-sm"
          placeholder={SAMPLE}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (preview) doParse(e.target.value);
          }}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-primary" onClick={() => doParse(text)}>
            解析
          </button>
          <label className="btn cursor-pointer">
            选 CSV / TSV 文件
            <input
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </label>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setText("");
              setPreview(null);
            }}
          >
            清空
          </button>
        </div>
        <p className="muted mt-2">
          第一行是表头，必须有「成就名称」这一列（写 name / 成就名称 / 标题都认）。
          其余列可选：角色、达成条件、星数（1–5）、剧本、排序、隐藏、上架。
        </p>
      </div>

      {preview && (
        <form action={importAchievements} className="card space-y-3">
          <input type="hidden" name="text" value={text} />
          <div className="card-title">
            <span>
              预览：新增 {fresh.length} 条
              {skipped > 0 && ` · 跳过 ${skipped} 条`}
              {preview.errors.length > 0 && ` · ${preview.errors.length} 行读不出来`}
            </span>
          </div>

          {preview.ignored.length > 0 && (
            <p className="muted">没认出来、会忽略的列：{preview.ignored.join("、")}</p>
          )}

          <ul className="space-y-2">
            {preview.rows.map((r) => (
              <li
                key={r.line}
                className={`rounded-lg border border-line p-2 ${r.skip ? "opacity-55" : ""}`}
              >
                <div className="flex items-start gap-2">
                  <RoleIcon role={r.role} className="size-6" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-ink">
                      {r.name}
                      <RarityBadge rarity={r.rarity} />
                      {r.scriptName && <span className="badge badge-plain">{r.scriptName}</span>}
                      {r.hidden === 1 && <span className="badge badge-plain">隐藏</span>}
                      {r.active === 0 && <span className="badge badge-plain">已下架</span>}
                      {r.skip && (
                        <span className="badge border-warn/30 bg-warn-soft text-warn">
                          {SKIP_LABEL[r.skip]}
                        </span>
                      )}
                    </p>
                    <p className="muted mt-0.5">
                      {r.role} · {r.description || "（没写达成条件）"}
                    </p>
                    {r.warnings.map((w) => (
                      <p key={w} className="mt-0.5 text-xs text-warn">
                        {w}
                      </p>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {preview.errors.length > 0 && (
            <div className="rounded-lg border border-line bg-surface-2 p-2 text-xs text-muted">
              <p className="mb-1 font-medium">这些行读不出来，不会导入：</p>
              <ul className="space-y-0.5">
                {preview.errors.map((e) => (
                  <li key={e.line}>
                    第 {e.line} 行 — {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={fresh.length === 0}>
            确认新增 {fresh.length} 个成就
          </button>
          <p className="muted">
            导入只新增，不会改动已有的成就，也不会删任何东西。改成就还是在成就管理里一条条改。
          </p>
        </form>
      )}
    </div>
  );
}
