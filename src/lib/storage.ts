/**
 * 上传文件的落盘、缩略图与删除（FILE-01 / FILE-04）。
 *
 * 根目录取 `UPLOAD_DIR`（默认 `./data/uploads`）。磁盘路径永远是
 * `{eventId}/{uuid}.{ext}`，绝不使用用户传来的文件名——原始文件名只存进数据库，
 * 下载时作为 `Content-Disposition` 的 filename 用。
 *
 * 每个 fs 调用上的 `turbopackIgnore` 注释是给打包器看的：上传根目录来自环境变量，
 * Turbopack 静态分析不出来，会警告「要把整个工程打进产物」。这里的路径都是运行时
 * 的数据目录，不需要被 trace，所以显式关掉。
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import sharp from "sharp";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_JSON_BYTES = 1 * 1024 * 1024; // 1 MB
const MAX_EDGE = 2500; // 原图最长边
const THUMB_EDGE = 400; // 缩略图最长边

export type DetectedKind =
  | { kind: "board_image"; mime: string; ext: "jpg" | "png" | "webp" }
  | { kind: "script_json"; mime: "application/json"; ext: "json" };

/** 只保留文件名部分，去掉路径分隔符——原始名只用于展示与下载。 */
export function safeName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "";
  return base.replace(/[\r\n\t]/g, " ").trim().slice(0, 120) || "未命名文件";
}

export function uploadRoot(): string {
  return path.resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR ?? "./data/uploads");
}

/** 解析出磁盘绝对路径，并挡住任何试图跳出上传根目录的相对路径。 */
export function absPath(storagePath: string): string {
  const root = uploadRoot();
  const full = path.resolve(/* turbopackIgnore: true */ root, storagePath);
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new Error("非法的文件路径");
  }
  return full;
}

/**
 * 按 magic bytes 判断真实类型，不信任扩展名和浏览器给的 MIME。
 * 认不出图片签名时，再尝试按 JSON 解析（JSON 没有 magic bytes）。
 */
export function detectKind(buf: Buffer, declaredName: string): DetectedKind {
  const b = buf;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return { kind: "board_image", mime: "image/jpeg", ext: "jpg" };
  }
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) {
    return { kind: "board_image", mime: "image/png", ext: "png" };
  }
  if (
    b.length >= 12 &&
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { kind: "board_image", mime: "image/webp", ext: "webp" };
  }
  // 不是图片：只有能当成 JSON 文本读出来才收
  const head = b.subarray(0, 4096).toString("utf8").replace(/^﻿/, "").trimStart();
  if (head.startsWith("[") || head.startsWith("{")) {
    return { kind: "script_json", mime: "application/json", ext: "json" };
  }
  const name = declaredName || "这个文件";
  throw new Error(`${name}：只收 jpg / png / webp 图片和剧本 JSON，这个文件都不是`);
}

export type SavedFile = {
  storagePath: string;
  thumbPath: string | null;
  mime: string;
  size: number;
};

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(/* turbopackIgnore: true */ dir, { recursive: true });
}

/** 图片：sharp 重新编码（顺带去掉 EXIF）、限制最长边，并另存一张缩略图。 */
export async function saveImage(eventId: number, buf: Buffer, ext: string): Promise<SavedFile> {
  const root = uploadRoot();
  const dir = path.join(/* turbopackIgnore: true */ root, String(eventId));
  await ensureDir(dir);

  const id = randomUUID();
  const outExt = ext === "png" ? "png" : ext === "webp" ? "webp" : "jpg";
  const rel = path.join(/* turbopackIgnore: true */ String(eventId), `${id}.${outExt}`);
  const thumbRel = path.join(/* turbopackIgnore: true */ String(eventId), `${id}.thumb.jpg`);

  const pipeline = sharp(buf, { failOn: "error" }).rotate().resize({
    width: MAX_EDGE,
    height: MAX_EDGE,
    fit: "inside",
    withoutEnlargement: true,
  });
  const out =
    outExt === "png"
      ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
      : outExt === "webp"
        ? await pipeline.webp({ quality: 85 }).toBuffer()
        : await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
  await fs.writeFile(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ root, rel), out);

  const thumb = await sharp(buf, { failOn: "error" })
    .rotate()
    .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer();
  await fs.writeFile(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ root, thumbRel), thumb);

  const mime = outExt === "png" ? "image/png" : outExt === "webp" ? "image/webp" : "image/jpeg";
  return { storagePath: rel, thumbPath: thumbRel, mime, size: out.length };
}

/** JSON：原样保存，不重写。 */
export async function saveJson(eventId: number, buf: Buffer): Promise<SavedFile> {
  const root = uploadRoot();
  const dir = path.join(/* turbopackIgnore: true */ root, String(eventId));
  await ensureDir(dir);
  const rel = path.join(/* turbopackIgnore: true */ String(eventId), `${randomUUID()}.json`);
  await fs.writeFile(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ root, rel), buf);
  return { storagePath: rel, thumbPath: null, mime: "application/json", size: buf.length };
}

/** 删除磁盘文件；文件不存在不算错误。 */
export async function removeFiles(paths: (string | null)[]): Promise<void> {
  for (const p of paths) {
    if (!p) continue;
    try {
      await fs.rm(/* turbopackIgnore: true */ absPath(p), { force: true });
    } catch {
      // 磁盘上没有 / 路径非法都不影响数据库记录已经删掉这件事
    }
  }
}

/** 删活动时连同它的整个上传目录一起删；目录不存在不算错误。 */
export async function removeEventDir(eventId: number): Promise<void> {
  try {
    await fs.rm(/* turbopackIgnore: true */ absPath(String(eventId)), { recursive: true, force: true });
  } catch {
    // 同上：磁盘清理失败不该挡住删除活动本身
  }
}

export async function readFileText(storagePath: string): Promise<string> {
  return fs.readFile(/* turbopackIgnore: true */ absPath(storagePath), "utf8");
}

export async function fileStat(storagePath: string): Promise<{ size: number } | null> {
  try {
    const s = await fs.stat(/* turbopackIgnore: true */ absPath(storagePath));
    return { size: s.size };
  } catch {
    return null;
  }
}

export function openStream(storagePath: string): ReadableStream<Uint8Array> {
  const node = createReadStream(/* turbopackIgnore: true */ absPath(storagePath));
  return new ReadableStream({
    start(controller) {
      node.on("data", (chunk) => controller.enqueue(new Uint8Array(chunk as Buffer)));
      node.on("end", () => controller.close());
      node.on("error", (e) => controller.error(e));
    },
    cancel() {
      node.destroy();
    },
  });
}
