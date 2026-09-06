import { GRIMOIRE_URL } from "@/lib/urls";

/**
 * 指向在线魔典的外链。开新标签页，别把人从报名流程里带走。
 * `variant="card"` 是卡片式（首页用），默认是一个小按钮。
 */
export default function GrimoireLink({ variant = "btn" }: { variant?: "btn" | "card" }) {
  const common = { href: GRIMOIRE_URL, target: "_blank", rel: "noreferrer noopener" };

  if (variant === "card") {
    return (
      <a {...common} className="card group block transition hover:border-brand-line hover:bg-surface-2">
        <div className="card-title">
          <span>
            <span className="mr-1.5">📖</span>在线魔典
          </span>
          <span className="text-faint transition group-hover:text-brand-bright">↗</span>
        </div>
        <p className="eyebrow -mt-2 mb-2">grimoire</p>
        <p className="muted">说书人用的在线模拟器，摆板、发身份、记状态都在里面。</p>
      </a>
    );
  }

  return (
    <a {...common} className="btn btn-sm">
      📖 在线魔典 ↗
    </a>
  );
}
