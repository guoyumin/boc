"use client";

import { useMemo, useState } from "react";
import { importJielong } from "@/actions/signups";
import { parseJielong, type JielongRow, type JielongSession } from "@/lib/jielong";
import { normalizeName } from "@/lib/names";
import { SESSION_OPTIONS } from "@/lib/labels";

const SAMPLE = `#接龙 血染钟楼
1. 清扬 （晚上补位）
2、枫染柒萋 下午场 感冒好了就来
3. Crystal🍀`;

export default function JielongEditor({
  eventId,
  defaultSession,
  knownNames,
}: {
  eventId: number;
  defaultSession: JielongSession;
  knownNames: string[];
}) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<JielongRow[] | null>(null);
  const [skipped, setSkipped] = useState<{ line: number; raw: string; reason: string }[]>([]);

  const known = useMemo(() => new Set(knownNames.map((n) => normalizeName(n))), [knownNames]);

  function doParse(value: string) {
    const r = parseJielong(value, defaultSession);
    setRows(r.rows);
    setSkipped(r.skipped);
  }

  const update = (i: number, patch: Partial<JielongRow>) =>
    setRows((rs) => (rs ? rs.map((r, j) => (j === i ? { ...r, ...patch } : r)) : rs));

  return (
    <div className="space-y-4">
      <div className="card">
        <label className="label" htmlFor="jielong-text">
          把微信里的接龙整段粘贴进来
        </label>
        <textarea
          id="jielong-text"
          className="input h-44 font-mono text-sm"
          placeholder={SAMPLE}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (rows) doParse(e.target.value);
          }}
        />
        <div className="mt-3 flex gap-2">
          <button type="button" className="btn btn-primary" onClick={() => doParse(text)}>
            解析
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setText("");
              setRows(null);
              setSkipped([]);
            }}
          >
            清空
          </button>
        </div>
        <p className="muted mt-2">
          没写场次的行默认按「{SESSION_OPTIONS.find((s) => s.value === defaultSession)?.label}」算。
        </p>
      </div>

      {rows && (
        <form action={importJielong} className="card">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="rows" value={JSON.stringify(rows)} />
          <div className="card-title">
            <span>预览（{rows.length} 人）</span>
          </div>

          {rows.length === 0 && <p className="muted">没解析出任何人，检查一下格式。</p>}

          <div className="space-y-2">
            {rows.map((r, i) => {
              const isNew = !known.has(normalizeName(r.name));
              return (
                <div key={i} className="rounded-lg border border-stone-200 p-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 shrink-0 text-center text-xs text-stone-400">{r.seq ?? i + 1}</span>
                    <input
                      className="input min-w-0 flex-1"
                      value={r.name}
                      maxLength={20}
                      onChange={(e) => update(i, { name: e.target.value })}
                    />
                    <select
                      className="input w-20 shrink-0 px-1"
                      value={r.session}
                      onChange={(e) => update(i, { session: e.target.value as JielongSession })}
                    >
                      {SESSION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-sm shrink-0"
                      onClick={() => setRows((rs) => rs!.filter((_, j) => j !== i))}
                      aria-label="删掉这一行"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      className="input flex-1 py-1 text-sm"
                      placeholder="备注"
                      value={r.note}
                      onChange={(e) => update(i, { note: e.target.value })}
                    />
                    <span className={`badge ${isNew ? "border-amber-200 bg-amber-50 text-amber-700" : "badge-plain"}`}>
                      {isNew ? "将新建" : "名册里有"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {skipped.length > 0 && (
            <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-2 text-xs text-stone-500">
              <p className="mb-1 font-medium">跳过了 {skipped.length} 行：</p>
              <ul className="space-y-0.5">
                {skipped.map((s, i) => (
                  <li key={i}>
                    第 {s.line} 行「{s.raw}」— {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block mt-4" disabled={rows.length === 0}>
            确认导入 {rows.length} 人
          </button>
          <p className="muted mt-2">已有的报名会按昵称覆盖。</p>
        </form>
      )}
    </div>
  );
}
