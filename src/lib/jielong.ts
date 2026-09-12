/** 微信接龙文本解析（需求 SIGN-03）。纯函数，可在客户端 import。 */
import { cleanName, isPunctuationOnly, normalizeName, NICKNAME_MAX } from "./names";

export type JielongSession = "afternoon" | "evening" | "full";

export type JielongRow = {
  seq: number | null;
  name: string;
  session: JielongSession;
  note: string;
  raw: string;
};

export type JielongSkip = {
  line: number;
  raw: string;
  reason: string;
};

export type JielongResult = {
  rows: JielongRow[];
  skipped: JielongSkip[];
};

const NUMBERED = /^(\d{1,3})\s*[.、．。,，:：)）]?\s*(.*)$/;
const OPEN_BRACKET = /[（(【[]/;

/** 从备注里识别场次；识别不到返回 null。 */
export function detectSession(text: string): JielongSession | null {
  if (/全天|两场|都来|下午\s*\+?\s*晚上/.test(text)) return "full";
  if (/下午|午场|白天/.test(text)) return "afternoon";
  if (/晚上|晚场|夜场/.test(text)) return "evening";
  return null;
}

function splitNameNote(rest: string): { name: string; note: string } {
  const trimmed = rest.trim();
  if (!trimmed) return { name: "", note: "" };
  const bracket = trimmed.search(OPEN_BRACKET);
  const space = trimmed.search(/[\s　]/);
  let cut = -1;
  if (bracket >= 0 && space >= 0) cut = Math.min(bracket, space);
  else if (bracket >= 0) cut = bracket;
  else if (space >= 0) cut = space;
  if (cut < 0) return { name: cleanName(trimmed), note: "" };
  const name = cleanName(trimmed.slice(0, cut));
  const note = cleanName(trimmed.slice(cut)).replace(/^[（(【[]/, "").replace(/[）)】\]]$/, "").trim();
  return { name, note };
}

/**
 * 解析接龙文本。
 * - 忽略 `#接龙` 行与标题行（第一个非序号行）
 * - 每行 `序号[.、．]? 昵称 (备注)?`
 * - 备注含"下午/晚上/全天"决定场次，否则用 defaultSession
 * - 昵称为空或仅为标点的行跳过并在 skipped 里说明
 */
export function parseJielong(text: string, defaultSession: JielongSession = "full"): JielongResult {
  const rows: JielongRow[] = [];
  const skipped: JielongSkip[] = [];
  const seen = new Map<string, number>(); // normalizeName → rows 下标
  let sawNumbered = false;
  let titleUsed = false;

  const lines = String(text ?? "").split(/\r?\n/);
  lines.forEach((rawLine, i) => {
    const line = rawLine.replace(/　/g, " ").trim();
    const lineNo = i + 1;
    if (!line) return;
    if (/^#/.test(line) || /^接龙[:：]?$/.test(line)) return;

    const m = NUMBERED.exec(line);
    if (!m) {
      // 我们自己生成的接龙里标题下面带一行报名链接，粘贴回来时直接忽略，不算跳过
      if (/https?:\/\//.test(line)) return;
      if (!sawNumbered && !titleUsed) {
        titleUsed = true; // 标题行
        return;
      }
      skipped.push({ line: lineNo, raw: line, reason: "不是序号行，已跳过" });
      return;
    }
    sawNumbered = true;
    const seq = Number(m[1]);
    const { name, note } = splitNameNote(m[2] ?? "");

    if (!name || isPunctuationOnly(name)) {
      skipped.push({ line: lineNo, raw: line, reason: "占位行（没有昵称）" });
      return;
    }
    if (name.length > NICKNAME_MAX) {
      skipped.push({ line: lineNo, raw: line, reason: `昵称超过 ${NICKNAME_MAX} 个字符` });
      return;
    }

    const row: JielongRow = {
      seq,
      name,
      note,
      session: detectSession(note) ?? defaultSession,
      raw: line,
    };

    const key = normalizeName(name);
    const prev = seen.get(key);
    if (prev !== undefined) {
      skipped.push({ line: lineNo, raw: line, reason: "昵称重复，保留最后一条" });
      rows[prev] = row;
      return;
    }
    seen.set(key, rows.length);
    rows.push(row);
  });

  return { rows, skipped };
}

/**
 * 由报名表反向生成接龙文本（EVT-05）。
 * `link` 是活动页地址，放在标题下一行，群里看到能直接点进来报名；
 * 粘贴回来解析时这行会被忽略（见 parseJielong）。
 */
export function buildJielong(
  title: string,
  entries: { name: string; note?: string | null }[],
  link?: string,
): string {
  const lines = [title];
  if (link) lines.push(`报名：${link}`);
  entries.forEach((e, i) => {
    const note = e.note ? `（${e.note}）` : "";
    lines.push(`${i + 1}. ${e.name}${note}`);
  });
  return lines.join("\n");
}
