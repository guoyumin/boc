import { PLAY_LINKS } from "@/lib/urls";

// 文案定稿见 issue #7 的评论（v2）。带「待定」的地方是还没确认的事实。
const ENTRIES = [
  {
    href: PLAY_LINKS.events(),
    icon: "🎲",
    title: "活动报名",
    sub: "GATHERINGS",
    desc: "看最近几场活动，填个昵称就能报名，不用注册账号。",
  },
  {
    href: PLAY_LINKS.polls(),
    icon: "🗓",
    title: "时间投票",
    sub: "TIME POLL",
    desc: "日期还没定的时候，来这里勾一下你哪个时段有空。",
  },
  {
    href: PLAY_LINKS.me(),
    icon: "👤",
    title: "我的主页",
    sub: "MY TOWN",
    desc: "自己的报名、出勤、游戏记录和成就，注册账号后可见。",
  },
];

const FACTS = [
  ["频率", "每周一次"],
  ["地点", "ETH Hönggerberg"],
  ["下午场", "13:30 – 17:30"],
  ["晚上场", "18:00 – 22:00"],
  ["费用", "场地目前免费"],
];

const WHAT = [
  ["死了也能继续玩。", "出局的人保留一张投票票，依然能说话、能左右局势——很多局是死人翻的盘。"],
  ["说书人不是发牌机器。", "他会在规则允许的范围内制造混乱、保护节奏，让每一局都不一样。"],
  [
    "信息永远是脏的。",
    "你的能力可能被醉酒、被中毒、被伪装，所以「我验了他是好人」从来不是结论，只是线索。",
  ],
  ["一局大约 60–90 分钟。", "剧本从新手向到脑筋打结的进阶本都有。"],
];

const FIRST = [
  ["先在活动页报名。", "不用注册账号，填个昵称就行——昵称就是你在小镇上的身份。"],
  ["准时到。", "一局开始后中途不好插入，所以我们会记录出勤；实在来不了记得回去取消报名。"],
  ["什么都不用带，也不用花钱。", "剧本、角色牌、说书人我们都备好了，场地目前免费。"],
  ["来了先说你是新人。", "我们会把你安排到新手桌，说书人会在开局前讲规则，中途也可以随时举手问。"],
  ["别怕玩坏。", "第一局你大概率会死得莫名其妙，这很正常，也是这个游戏最好玩的部分。"],
];

const FAQ = [
  ["在哪儿玩？", "ETH Hönggerberg，每周一次。具体教室和日期看活动页，每场都会写清楚。"],
  ["要会德语或英语吗？", "不用，桌上说中文。"],
  ["一个人来会不会尴尬？", "一半以上的人第一次都是自己来的。游戏本身就是强制社交，坐下十分钟就熟了。"],
  ["没玩过狼人杀能玩吗？", "能。没有狼人杀的坏习惯反而更好带。"],
  ["要花钱吗？", "不要，场地目前免费。"],
  ["只能来半场行吗？", "行。下午场和晚上场分开报名，来一个就够。"],
  [
    "报名了临时来不了怎么办？",
    "回活动页取消报名。取消会留下记录，但比放鸽子好——桌子是按人数排的。",
  ],
];

function Section({
  id,
  title,
  sub,
  children,
}: {
  id: string;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <p className="eyebrow">{sub}</p>
      <h2 className="display mt-1 text-2xl sm:text-3xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function Home() {
  return (
    <div>
      {/* hero：整幅苏黎世夜景，左侧压暗好放标题 */}
      <section className="relative isolate overflow-hidden border-b border-line">
        <picture>
          {/* 窄屏用右半边的裁切，左边那片空水面在手机上没意义 */}
          <source
            media="(max-width: 640px)"
            srcSet="/hero/zurich-portrait-900.webp"
          />
          <source media="(max-width: 1200px)" srcSet="/hero/zurich-1000.webp" />
          <img
            src="/hero/zurich-1800.webp"
            alt="血色天空下的苏黎世老城与钟楼"
            className="absolute inset-0 -z-10 size-full object-cover object-[70%_center] sm:object-center"
            fetchPriority="high"
          />
        </picture>
        {/* 双层遮罩：横向压暗左边给文字，纵向收底避免和下面的内容硬接 */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-bg via-bg/85 to-bg/25 sm:to-transparent" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-b from-transparent to-bg" />

        <div className="mx-auto flex min-h-[26rem] max-w-6xl flex-col justify-center px-4 py-20 sm:px-6 sm:py-28 lg:min-h-[34rem]">
          <p className="eyebrow">blood on the clocktower · zürich</p>
          <h1 className="display mt-4 text-4xl leading-[1.15] sm:text-6xl">
            钟声将响，
            <br />
            今晚你站在哪一边？
          </h1>
          <p className="mt-5 max-w-md text-ink-2 sm:text-lg">
            苏黎世的《血染钟楼》据点。一场谎言与直觉的博弈，一群值得相遇的人。
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <a href={PLAY_LINKS.events()} className="btn btn-primary">
              看看最近的活动 →
            </a>
            <a href="#first" className="btn">
              我是新人
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-14 px-4 pt-12 sm:px-6">
        <section className="grid gap-3 sm:grid-cols-3">
          {ENTRIES.map((e) => (
            <a
              key={e.href}
              href={e.href}
              className="card group transition hover:border-brand-line hover:bg-surface-2"
            >
              <div className="card-title">
                <span>
                  <span className="mr-1.5">{e.icon}</span>
                  {e.title}
                </span>
                <span className="text-faint transition group-hover:text-brand-bright">→</span>
              </div>
              <p className="eyebrow -mt-2 mb-2">{e.sub}</p>
              <p className="muted">{e.desc}</p>
            </a>
          ))}
        </section>

        <Section id="about" title="关于我们" sub="who we are">
          <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
            <div className="space-y-3 text-ink-2">
              <p>我们是一群在苏黎世玩《血染钟楼》（Blood on the Clocktower）的人。</p>
              <p>
                没有门槛，没有考核，不需要你读过任何攻略。带一双愿意怀疑的眼睛来就够了——剩下的，说书人会在开局前用十分钟讲明白。
              </p>
              <p>
                你可以只来一个半场，也可以从头坐到最后一颗钟声敲完。每局大约 60–90
                分钟，所以一个半场通常能玩上好几轮。
              </p>
              <p>桌上说中文，欢迎所有在苏黎世（以及愿意坐火车过来）的朋友。</p>
            </div>
            <dl className="card h-fit divide-y divide-line text-sm">
              {FACTS.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <dt className="text-xs text-faint">{k}</dt>
                  <dd className="font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Section>

        <Section id="what" title="《血染钟楼》是什么" sub="the game">
          <p className="text-ink-2">
            一个社交推理游戏，可以粗暴地理解成「进化版狼人杀」，但几乎解决了狼人杀所有让人扫兴的地方：
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {WHAT.map(([t, d]) => (
              <li key={t} className="card">
                <p className="font-serif font-semibold text-ink">{t}</p>
                <p className="muted mt-1">{d}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-ink-2">完全不懂规则也没关系，我们每次活动都会留新手桌。</p>
        </Section>

        <Section id="first" title="第一次来，需要准备什么" sub="your first night">
          <ol className="grid gap-3 sm:grid-cols-2">
            {FIRST.map(([t, d], i) => (
              <li key={t} className="card flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-brand-line bg-brand-soft font-serif text-xs text-brand-bright">
                  {i + 1}
                </span>
                <span>
                  <span className="font-serif font-semibold text-ink">{t}</span>{" "}
                  <span className="text-ink-2">{d}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="muted mt-4">
            想先了解一下，加微信{" "}
            <span className="badge badge-brand select-all">CHDC1047</span>{" "}
            —— 申请好友时备注一句「血染新人」。
          </p>
        </Section>

        <Section id="faq" title="常见问题" sub="questions">
          <dl className="grid gap-3 sm:grid-cols-2">
            {FAQ.map(([q, a]) => (
              <div key={q} className="card">
                <dt className="font-serif font-semibold text-ink">{q}</dt>
                <dd className="muted mt-1">{a}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>
    </div>
  );
}
