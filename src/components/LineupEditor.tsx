"use client";

import { useState } from "react";

export type LineupRow = { name: string; roleName: string; seat: string };

export default function LineupEditor({
  initial,
  nameOptions,
}: {
  initial: LineupRow[];
  nameOptions: string[];
}) {
  const [rows, setRows] = useState<LineupRow[]>(
    initial.length ? initial : [{ name: "", roleName: "", seat: "" }],
  );

  const update = (i: number, patch: Partial<LineupRow>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-2">
      <datalist id="lineup-names">
        {nameOptions.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            className="input w-12 shrink-0 px-2 text-center"
            name="lineupSeat"
            inputMode="numeric"
            placeholder="座"
            value={r.seat}
            onChange={(e) => update(i, { seat: e.target.value })}
          />
          <input
            className="input min-w-0 flex-1"
            name="lineupName"
            list="lineup-names"
            placeholder="昵称"
            maxLength={20}
            value={r.name}
            onChange={(e) => update(i, { name: e.target.value })}
          />
          <input
            className="input min-w-0 flex-1"
            name="lineupRole"
            placeholder="角色"
            value={r.roleName}
            onChange={(e) => update(i, { roleName: e.target.value })}
          />
          <button
            type="button"
            className="btn btn-sm shrink-0"
            onClick={() => setRows((rs) => (rs.length === 1 ? rs : rs.filter((_, j) => j !== i)))}
            aria-label="删除这一行"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => setRows((rs) => [...rs, { name: "", roleName: "", seat: String(rs.length + 1) }])}
      >
        ＋ 加一行
      </button>
      <p className="muted">留空的行会被忽略；昵称不在名册里会自动新建玩家。</p>
    </div>
  );
}
