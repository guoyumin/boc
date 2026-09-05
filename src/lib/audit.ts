import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export function logAudit(
  userId: number | null,
  action: string,
  targetType?: string,
  targetId?: number,
  detail?: string,
): void {
  try {
    db.insert(auditLogs).values({ userId, action, targetType, targetId, detail }).run();
  } catch {
    // 审计失败不影响主流程
  }
}
