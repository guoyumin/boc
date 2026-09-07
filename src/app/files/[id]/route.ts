/**
 * GET /files/{id}         原文件
 * GET /files/{id}?thumb=1 缩略图（只有图片有）
 *
 * 全站公开可见，文件也一样；不可猜是靠磁盘路径里的 UUID（FILE-04）。
 * 文件内容写进去就不再变，所以可以长缓存。
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { eventFiles } from "@/db/schema";
import { fileStat, openStream } from "@/lib/storage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const fileId = Number(id);
  if (!Number.isInteger(fileId) || fileId <= 0) {
    return new Response("文件不存在", { status: 404 });
  }
  const row = db.select().from(eventFiles).where(eq(eventFiles.id, fileId)).get();
  if (!row) return new Response("文件不存在", { status: 404 });

  const wantThumb = new URL(req.url).searchParams.get("thumb") === "1";
  const useThumb = wantThumb && !!row.thumbPath;
  const storagePath = useThumb ? row.thumbPath! : row.storagePath;

  const stat = await fileStat(storagePath);
  if (!stat) return new Response("文件已丢失", { status: 404 });

  // 按 mime 判断，别绑死在 kind 上——剧本投票的候选图是另一种 kind
  const isImage = row.mime.startsWith("image/");
  const mime = useThumb ? "image/jpeg" : isImage ? row.mime : "application/json; charset=utf-8";
  // 图片内联展示；JSON 当附件下载，带上原始文件名
  const disposition = isImage
    ? "inline"
    : `attachment; filename*=UTF-8''${encodeURIComponent(row.originalName)}`;

  return new Response(openStream(storagePath), {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(stat.size),
      "Content-Disposition": disposition,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
