import { PLAY_LINKS } from "@/lib/urls";

// 文案定稿见 issue #7 的评论（v2）。带「待定」的地方是还没确认的事实。
const ENTRIES = [
  {
    href: PLAY_LINKS.events(),
    icon: "🎲",
    title: "活动报名",
    desc: "看最近几场活动，填个昵称就能报名，不用注册账号。",
  },
  {
    href: PLAY_LINKS.polls(),
    icon: "🗓",
    title: "时间投票",
    desc: "日期还没定的时候，来这里勾一下你哪个时段有空。",
  },
  {
    href: PLAY_LINKS.me(),
    icon: "👤",
    title: "我的主页",
    desc: "自己的报名、出勤、游戏记录和成就，注册账号后可见。",
  },
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

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-stone-200 bg-white px-5 py-10 text-center sm:px-10 sm:py-16">
        <p className="text-xs tracking-[0.2em] text-stone-400">BLOOD ON THE CLOCKTOWER · ZÜRICH</p>
        <h1 className="mt-3 text-3xl leading-tight font-bold text-stone-900 sm:text-5xl">
          钟声将响，
          <br className="sm:hidden" />
          今晚你站在哪一边？
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-stone-600">
          苏黎世的《血染钟楼》据点。一场谎言与直觉的博弈，一群值得相遇的人。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <a href={PLAY_LINKS.events()} className="btn btn-primary">
            看看最近的活动 →
          </a>
          <a href="#first" className="btn">
            我是新人
          </a>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {ENTRIES.map((e) => (
          <a key={e.href} href={e.href} className="card transition hover:border-brand/40">
            <div className="card-title">
              <span>
                <span className="mr-1.5">{e.icon}</span>
                {e.title}
              </span>
              <span className="text-stone-300">→</span>
            </div>
            <p className="muted">{e.desc}</p>
          </a>
        ))}
      </section>

      <section id="about" className="scroll-mt-16">
        <h2 className="text-xl font-bold text-stone-900">关于我们</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_18rem]">
          <div className="space-y-3 text-stone-700">
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
          <dl className="card h-fit space-y-2 text-sm">
            <div>
              <dt className="text-xs text-stone-400">频率</dt>
              <dd className="font-medium text-stone-800">每周一次</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400">地点</dt>
              <dd className="font-medium text-stone-800">ETH Hönggerberg</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400">下午场</dt>
              <dd className="font-medium text-stone-800">13:30 – 17:30</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400">晚上场</dt>
              <dd className="font-medium text-stone-800">18:00 – 22:00</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400">费用</dt>
              <dd className="font-medium text-stone-800">场地目前免费</dd>
            </div>
          </dl>
        </div>
      </section>

      <section id="what" className="scroll-mt-16">
        <h2 className="text-xl font-bold text-stone-900">《血染钟楼》是什么</h2>
        <p className="mt-3 text-stone-700">
          一个社交推理游戏，可以粗暴地理解成「进化版狼人杀」，但几乎解决了狼人杀所有让人扫兴的地方：
        </p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {WHAT.map(([t, d]) => (
            <li key={t} className="card">
              <p className="font-semibold text-stone-800">{t}</p>
              <p className="muted mt-1">{d}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-stone-700">完全不懂规则也没关系，我们每次活动都会留新手桌。</p>
      </section>

      <section id="first" className="scroll-mt-16">
        <h2 className="text-xl font-bold text-stone-900">第一次来，需要准备什么</h2>
        <ol className="mt-3 space-y-2">
          {FIRST.map(([t, d], i) => (
            <li key={t} className="card flex gap-3">
              <span className="badge badge-brand h-fit">{i + 1}</span>
              <span>
                <span className="font-semibold text-stone-800">{t}</span>{" "}
                <span className="text-stone-600">{d}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="muted mt-3">
          想先了解一下，可以加群 —— <span className="badge badge-plain">加群方式待定</span>
        </p>
      </section>

      <section id="faq" className="scroll-mt-16">
        <h2 className="text-xl font-bold text-stone-900">常见问题</h2>
        <dl className="mt-3 space-y-2">
          {FAQ.map(([q, a]) => (
            <div key={q} className="card">
              <dt className="font-semibold text-stone-800">{q}</dt>
              <dd className="muted mt-1">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
