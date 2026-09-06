import Link from "next/link";
import { notFound } from "next/navigation";
import Flash from "@/components/Flash";
import JielongEditor from "@/components/JielongEditor";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { getEvent, listPlayers } from "@/lib/queries";
import type { JielongSession } from "@/lib/jielong";

export default async function JielongPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  await requireAdmin();
  const event = getEvent(Number(id));
  if (!event) notFound();

  const defaultSession: JielongSession =
    event.hasAfternoon === 1 && event.hasEvening === 1
      ? "full"
      : event.hasAfternoon === 1
        ? "afternoon"
        : "evening";

  const known = listPlayers().flatMap((p) => {
    let aliases: string[] = [];
    try {
      const v = JSON.parse(p.aliases);
      if (Array.isArray(v)) aliases = v.filter((x): x is string => typeof x === "string");
    } catch {
      aliases = [];
    }
    return [p.name, ...aliases];
  });

  return (
    <div className="space-y-4">
      <Flash err={sp.err} ok={sp.ok} />
      <div className="flex items-center justify-between">
        <h1 className="page-title">粘贴接龙</h1>
        <Link href={`/events/${event.id}`} className="btn btn-sm">
          返回活动
        </Link>
      </div>
      <p className="muted">{formatDate(event.date)} · {event.title}</p>
      <JielongEditor eventId={event.id} defaultSession={defaultSession} knownNames={known} />
    </div>
  );
}
