// File: src/MigrationGame.tsx
import { useEffect, useMemo, useRef, useState } from "react";

/** Single-file game for M365 → Google Workspace. Tailwind v4 + Difficulty toggle. */

type Mode = "menu" | "match" | "quiz" | "scenario";
type Difficulty = "Easy" | "Normal" | "Hard";

type Pair = { left: string; right: string; why?: string };
type QA = { q: string; choices: string[]; answer: string; why?: string };
type ScenarioStep = { id: string; text: string };
type Scenario = { id: string; title: string; prompt: string; steps: ScenarioStep[]; correctOrder: string[]; tips?: string };
type BadgeKey = "Speedster" | "PerfectRound" | "MigrationPro" | "ComebackKid" | "MatchMaster" | "QuizWhiz" | "ScenarioSage";

/* ---------- Data: Matches (expanded) ---------- */
const APP_PAIRS: Pair[] = [
  { left: "Word",            right: "Docs",              why: "Suggesting mode ≈ Track Changes." },
  { left: "Excel",           right: "Sheets",            why: "Real-time collaboration & Explore." },
  { left: "PowerPoint",      right: "Slides",            why: "Presenter tools + Q&A." },
  { left: "Outlook",         right: "Gmail",             why: "Labels + powerful search operators." },
  { left: "OneDrive",        right: "Drive",             why: "Personal storage; link sharing." },
  { left: "Teams Meetings",  right: "Meet",              why: "Video meetings, recording, Q&A." },
  { left: "Teams Chat",      right: "Chat/Spaces",       why: "DMs & persistent rooms." },
  { left: "SharePoint",      right: "Shared Drives",     why: "Team-owned storage with roles." },
  { left: "OneNote",         right: "Keep",              why: "Quick notes & reminders." },
  { left: "Planner",         right: "Tasks in Spaces",   why: "Lightweight team task boards." },
  { left: "Forms (Microsoft)", right: "Google Forms",    why: "Surveys & quizzes → Sheets." },
  { left: "Visio",           right: "Drawings",          why: "Simple diagrams in Drive." },
  { left: "Stream",          right: "Drive/Meet Recordings", why: "Recordings live in Drive." },
  { left: "Sway",            right: "Sites",             why: "Lightweight web pages/sites." },
  { left: "Power Automate",  right: "Apps Script",       why: "Automate Workspace via JS." },
  { left: "Yammer/Communities", right: "Spaces/Groups",  why: "Topic/community collaboration." },
  { left: "Project (basic)", right: "Sheets",            why: "Simple tracking/PM templates." },
];

/* ---------- Data: Quiz (expanded) ---------- */
const SHORTCUT_QA: QA[] = [
  { q: "Send email (Gmail web)",                 choices: ["Ctrl+Enter","Ctrl+S","Alt+Enter","Shift+Enter"], answer: "Ctrl+Enter", why: "Sends message." },
  { q: "Search focus (Gmail)",                   choices: ["/","Ctrl+F","Ctrl+K",";"],                      answer: "/",           why: "Jump to search." },
  { q: "Compose new email (Gmail)",              choices: ["c","n","Ctrl+N","Shift+C"],                     answer: "c",           why: "Keyboard compose." },
  { q: "Bold (Docs/Sheets/Slides)",              choices: ["Ctrl+B","Ctrl+Shift+B","Alt+B","Ctrl+1"],       answer: "Ctrl+B" },
  { q: "Insert link (Docs/Slides/Sheets)",       choices: ["Ctrl+K","Ctrl+L","Ctrl+Shift+K","Alt+K"],       answer: "Ctrl+K" },
  { q: "Find (Docs/Slides/Sheets)",              choices: ["Ctrl+F","Ctrl+G","Ctrl+H","Ctrl+K"],            answer: "Ctrl+F" },
  { q: "Comment (Docs/Sheets/Slides)",           choices: ["Ctrl+Alt+M","Ctrl+M","Alt+M","Shift+M"],        answer: "Ctrl+Alt+M" },
  { q: "Open link dialog in Gmail compose",      choices: ["Ctrl+K","Ctrl+Shift+K","/","Ctrl+L"],           answer: "Ctrl+K" },
  { q: "Insert row above (Sheets)",              choices: ["Ctrl+Alt++","Ctrl+Shift+=","Alt+Shift+=","Ctrl+="], answer: "Ctrl+Alt++" },
  { q: "Start presentation (Slides)",            choices: ["Ctrl+Enter","Ctrl+F5","Ctrl+Alt+P","Present (⌘/Ctrl+Enter)"], answer: "Ctrl+Enter" },
];

const TERMINOLOGY_QA: QA[] = [
  { q: "Outlook folders map to what in Gmail?",  choices: ["Labels","Categories","Spaces","Filters"],        answer: "Labels" },
  { q: "Word Track Changes maps to what in Docs?", choices: ["Suggesting","Reviewing","Markup","Proposing"], answer: "Suggesting" },
  { q: "Team-owned files live in…",              choices: ["Shared Drives","My Drive","Shared with me","Public"], answer: "Shared Drives" },
  { q: "Persistent team chat space in Google?",  choices: ["Spaces","Groups","Labels","Rooms Only"],         answer: "Spaces" },
  { q: "Automations across Workspace built with…", choices: ["Apps Script","Flow","Shortcuts","Builder"],    answer: "Apps Script" },
  { q: "Company intranet pages best fit…",       choices: ["Sites","Docs","Slides","Keep"],                  answer: "Sites" },
  { q: "Meeting recording destination in Workspace?", choices: ["Drive","Meet Cloud","Photos","Calendar"],   answer: "Drive" },
  { q: "Formal org email lists with posting rules?", choices: ["Google Groups","Spaces","Labels","Meet"],    answer: "Google Groups" },
];

/* ---------- Data: Scenarios (expanded) ---------- */
const SCENARIOS: Scenario[] = [
  {
    id: "share-comment",
    title: "Share a Docs file for comment-only",
    prompt: "Give a teammate comment access (no editing). Arrange:",
    steps: [
      { id: "open-doc", text: "Open the Docs file" },
      { id: "share-btn", text: "Click Share" },
      { id: "add-email", text: "Add teammate's email" },
      { id: "set-commenter", text: "Set permission to Commenter" },
      { id: "send", text: "Send" },
    ],
    correctOrder: ["open-doc","share-btn","add-email","set-commenter","send"],
    tips: "Viewer ≠ comments; Editor can edit.",
  },
  {
    id: "share-editor",
    title: "Share a Sheet for editor access",
    prompt: "Let a teammate edit a Sheet safely:",
    steps: [
      { id: "open-sheet", text: "Open the Sheets file" },
      { id: "share-btn", text: "Click Share" },
      { id: "add-collab", text: "Add collaborator's email" },
      { id: "set-editor", text: "Set permission to Editor" },
      { id: "notify", text: "Optionally write a note" },
      { id: "send", text: "Send" },
    ],
    correctOrder: ["open-sheet","share-btn","add-collab","set-editor","notify","send"],
    tips: "Use Restricted link for tighter sharing.",
  },
  {
    id: "create-space",
    title: "Create a Space for a project",
    prompt: "Stand up a team Space with tasks & files:",
    steps: [
      { id: "open-chat", text: "Open Chat" },
      { id: "new-space", text: "Create a new Space" },
      { id: "name-space", text: "Name the Space & set purpose" },
      { id: "add-members", text: "Add members" },
      { id: "pin-files", text: "Pin a key Drive folder" },
      { id: "add-task", text: "Add first task list" },
    ],
    correctOrder: ["open-chat","new-space","name-space","add-members","pin-files","add-task"],
    tips: "Use Space tasks for lightweight planning.",
  },
  {
    id: "calendar-meet-record",
    title: "Schedule Meet with recording enabled",
    prompt: "Create an event with Meet + recording:",
    steps: [
      { id: "open-cal", text: "Open Calendar" },
      { id: "create-event", text: "Create event" },
      { id: "add-guests", text: "Add guests" },
      { id: "add-meet", text: "Add a Google Meet" },
      { id: "host-ctrl", text: "Open Host controls" },
      { id: "toggle-record", text: "Enable recording (if available)" },
      { id: "save", text: "Save" },
    ],
    correctOrder: ["open-cal","create-event","add-guests","add-meet","host-ctrl","toggle-record","save"],
    tips: "Recording depends on edition & admin settings.",
  },
  {
    id: "drive-shared",
    title: "Move team files into a Shared Drive",
    prompt: "Centralize ownership under the team:",
    steps: [
      { id: "open-drive", text: "Open Drive" },
      { id: "new-sd", text: "Create a Shared Drive (or open existing)" },
      { id: "check-perms", text: "Check Manager/Content Manager roles" },
      { id: "move-files", text: "Move project folder into Shared Drive" },
      { id: "verify-sharing", text: "Verify sharing settings" },
    ],
    correctOrder: ["open-drive","new-sd","check-perms","move-files","verify-sharing"],
    tips: "Shared Drives prevent loss when members leave.",
  },
];

/* ---------- Utils ---------- */
function shuffle<T>(arr: T[]): T[] { const a=[...arr]; for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }
function pickN<T>(arr:T[], n:number){ return shuffle(arr).slice(0,n); }
function cls(...p:Array<string|boolean|undefined>){ return p.filter(Boolean).join(" "); }
function formatTime(ms:number){ const s=Math.max(0,Math.floor(ms/1000)); const mm=String(Math.floor(s/60)).padStart(2,"0"); const ss=String(s%60).padStart(2,"0"); return `${mm}:${ss}`; }

const store = {
  get<T>(k:string,f:T):T{ try{ const r=localStorage.getItem(k); return r?JSON.parse(r):f; } catch { return f; } },
  set<T>(k:string,v:T){ try{ localStorage.setItem(k,JSON.stringify(v)); } catch {} }
};

/* ---------- Small UI ---------- */
function Card({children,className}:{children:React.ReactNode;className?:string}){ return <div className={cls("rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4",className)}>{children}</div>; }
function ModeButton({label,active,onClick}:{label:string;active?:boolean;onClick:()=>void}){ return <button onClick={onClick} className={cls("px-3 py-1 rounded-xl text-sm border", active?"bg-blue-600 text-white border-blue-600":"bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800")} aria-pressed={active}>{label}</button>; }
function BadgeBar({badges}:{badges:BadgeKey[]}){ if(!badges.length) return null;
  const desc:Record<BadgeKey,string>={Speedster:"Answered fast",PerfectRound:"No mistakes",MigrationPro:"80%+ in all modes",ComebackKid:"Bounced back",MatchMaster:"Match mode star",QuizWhiz:"Quiz champ",ScenarioSage:"Scenario solver"};
  return (<div className="flex flex-wrap items-center gap-2 py-2">{badges.map(b=>(<span key={b} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-900 dark:bg-amber-800/40 dark:text-amber-100 border border-amber-300/60"><span>🏅</span><span>{b}</span><span className="opacity-70">— {desc[b]}</span></span>))}</div>);
}

/* Difficulty selector inside header (why: quick scenario sizing) */
function Header(props: {
  score: number; best: number; mode: Mode; onChangeMode: (m: Mode) => void;
  timeLeftMs: number | null; lives: number; badges: BadgeKey[];
  difficulty: Difficulty; onChangeDifficulty: (d: Difficulty) => void;
}) {
  const { score, best, mode, onChangeMode, timeLeftMs, lives, badges, difficulty, onChangeDifficulty } = props;
  return (
    <header className="sticky top-0 z-10 backdrop-blur bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 mr-auto">
          <span className="text-2xl">🧭</span>
          <h1 className="text-xl font-semibold">M365 → Google Workspace Migration Game</h1>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-sm">
          <div className="px-3 py-1 rounded-xl bg-gray-100 dark:bg-gray-800">Score: <b>{score}</b></div>
          <div className="px-3 py-1 rounded-xl bg-gray-100 dark:bg-gray-800">Best: <b>{best}</b></div>
          <div className="px-3 py-1 rounded-xl bg-gray-100 dark:bg-gray-800">Lives: <b>{"❤️".repeat(Math.max(0, lives)) || "—"}</b></div>
          <div className="px-3 py-1 rounded-xl bg-gray-100 dark:bg-gray-800">{timeLeftMs !== null ? <>⏱ {formatTime(timeLeftMs)}</> : "∞"}</div>
        </div>

        <div className="flex items-center gap-2">
          <ModeButton label="Menu" active={mode === "menu"} onClick={() => onChangeMode("menu")} />
          <ModeButton label="Match" active={mode === "match"} onClick={() => onChangeMode("match")} />
          <ModeButton label="Quiz" active={mode === "quiz"} onClick={() => onChangeMode("quiz")} />
          <ModeButton label="Scenarios" active={mode === "scenario"} onClick={() => onChangeMode("scenario")} />
          <div className="ml-2">
            <label className="sr-only" htmlFor="diff">Difficulty</label>
            <select
              id="diff"
              value={difficulty}
              onChange={(e) => onChangeDifficulty(e.target.value as Difficulty)}
              className="px-3 py-1 rounded-xl border text-sm bg-white dark:bg-gray-900"
              title="Difficulty"
            >
              <option>Easy</option>
              <option>Normal</option>
              <option>Hard</option>
            </select>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 pb-2">
        <BadgeBar badges={badges} />
      </div>
    </header>
  );
}

/* ---------- Modes ---------- */

function MatchMode(props: {
  onResult: (delta: number, correct: boolean, why?: string) => void;
  onRoundEnd: (stats: { total: number; correct: number; avgMs: number }) => void;
  pairCount: number;
}) {
  const { onResult, onRoundEnd, pairCount } = props;
  const [pairs, setPairs] = useState<Pair[]>(() => pickN(APP_PAIRS, Math.min(pairCount, APP_PAIRS.length)));
  const [left, right] = useMemo(() => [pairs.map((p) => p.left), shuffle(pairs.map((p) => p.right))], [pairs]);
  const [selLeft, setSelLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [t0, setT0] = useState<number>(Date.now());
  const times = useRef<number[]>([]);

  useEffect(() => { setPairs(pickN(APP_PAIRS, Math.min(pairCount, APP_PAIRS.length))); setMatched({}); setSelLeft(null); }, [pairCount]);
  useEffect(() => { setT0(Date.now()); }, [pairs]);

  const handlePick = (side: "L" | "R", value: string) => {
    if (side === "L") { setSelLeft(value); return; }
    if (!selLeft) return;
    const pair = pairs.find((p) => p.left === selLeft);
    const ok = pair?.right === value;
    const dt = Date.now() - t0; times.current.push(dt);
    if (ok) { setMatched((m) => ({ ...m, [selLeft]: value })); onResult(+10, true, pair?.why); }
    else { onResult(0, false, `Nope. ${selLeft} maps to ${pair?.right}.`); }
    setSelLeft(null); setT0(Date.now());
  };

  useEffect(() => {
    const total = pairs.length;
    const done = Object.keys(matched).length;
    if (done === total && total > 0) {
      const avg = times.current.reduce((a, b) => a + b, 0) / Math.max(1, times.current.length);
      onRoundEnd({ total, correct: done, avgMs: avg });
      setTimeout(() => { times.current = []; setMatched({}); setPairs(pickN(APP_PAIRS, Math.min(pairCount, APP_PAIRS.length))); }, 600);
    }
  }, [matched, pairs, onRoundEnd, pairCount]);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <h2 className="text-lg font-semibold mb-2">M365 Apps</h2>
        <ul className="grid gap-2">
          {left.map((l) => (
            <li key={l}>
              <button
                onClick={() => handlePick("L", l)}
                disabled={matched[l] !== undefined}
                className={cls(
                  "w-full text-left px-4 py-3 rounded-xl border",
                  selLeft === l ? "border-blue-600 ring-2 ring-blue-600/30" : "border-gray-300 dark:border-gray-700",
                  matched[l] !== undefined ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                {l}
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold mb-2">Google Workspace</h2>
        <ul className="grid gap-2">
          {right.map((r) => (
            <li key={r}>
              <button
                onClick={() => handlePick("R", r)}
                className="w-full text-left px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {r}
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="md:col-span-2">
        <p className="text-sm opacity-75">Tip: Select a Microsoft app on the left, then its Google equivalent on the right.</p>
      </Card>
    </div>
  );
}

function QuizMode(props: {
  onResult: (delta: number, correct: boolean, why?: string) => void;
  onRoundEnd: (stats: { total: number; correct: number; avgMs: number }) => void;
  questionCount: number;
  perQuestionMs: number;
}) {
  const { onResult, onRoundEnd, questionCount, perQuestionMs } = props;
  const [questions, setQuestions] = useState<QA[]>(() => shuffle([...SHORTCUT_QA, ...TERMINOLOGY_QA]).slice(0, questionCount));
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [lock, setLock] = useState(false);
  const [t0, setT0] = useState<number>(Date.now());
  const times = useRef<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(perQuestionMs);

  useEffect(() => { setQuestions(shuffle([...SHORTCUT_QA, ...TERMINOLOGY_QA]).slice(0, questionCount)); setIdx(0); setSelected(null); setLock(false); setT0(Date.now()); setTimeLeft(perQuestionMs); }, [questionCount, perQuestionMs]);
  useEffect(() => { const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 100)), 100); return () => clearInterval(id); }, []);
  useEffect(() => { if (timeLeft === 0 && !lock) { setLock(true); onResult(0, false, "Time's up."); } }, [timeLeft, lock, onResult]);

  const q = questions[idx];
  const options = useMemo(() => shuffle(q.choices), [idx, q.choices]);

  const choose = (c: string) => {
    if (lock) return;
    setSelected(c);
    setLock(true); // crucial: call, do not assign
    const ok = c === q.answer;
    const dt = Date.now() - t0; times.current.push(dt);
    onResult(ok ? +10 : 0, ok, ok ? q.why : `Answer: ${q.answer}. ${q.why ?? ""}`);
  };

  const next = () => {
    if (idx + 1 >= questions.length) {
      const avg = times.current.reduce((a, b) => a + b, 0) / Math.max(1, times.current.length);
      onRoundEnd({ total: questions.length, correct: times.current.length, avgMs: avg });
      setTimeout(() => {
        times.current = [];
        const fresh = shuffle([...SHORTCUT_QA, ...TERMINOLOGY_QA]);
        setQuestions(fresh.slice(0, questionCount));
        setIdx(0); setSelected(null); setLock(false); setT0(Date.now()); setTimeLeft(perQuestionMs);
      }, 600);
      return;
    }
    setIdx((i) => i + 1); setSelected(null); setLock(false); setT0(Date.now()); setTimeLeft(perQuestionMs);
  };

  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Question {idx + 1} / {questions.length}</h2>
          <div className="text-sm">⏱ {formatTime(timeLeft)}</div>
        </div>
        <p className="text-base mb-4 font-medium">{q.q}</p>
        <ul className="grid gap-2">
          {options.map((c) => {
            const isSel = selected === c;
            const isCorrect = lock && c === q.answer;
            const style = lock
              ? isCorrect
                ? "border-green-600 bg-green-50 dark:bg-green-900/20"
                : isSel
                ? "border-red-600 bg-red-50 dark:bg-red-900/20"
                : "opacity-80"
              : "hover:bg-gray-50 dark:hover:bg-gray-800";
            return (
              <li key={c}>
                <button onClick={() => choose(c)} disabled={lock} className={cls("w-full text-left px-4 py-3 rounded-xl border", style)}>{c}</button>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm opacity-80" aria-live="polite">
            {lock && (selected === q.answer ? "✅ Correct" : selected ? "❌ Incorrect" : "⌛ Time's up")}
          </div>
          <button onClick={next} className="px-3 py-1 rounded-xl border bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800">
            {idx + 1 >= questions.length ? "Finish Round" : "Next"}
          </button>
        </div>
      </Card>
      <Card><p className="text-sm opacity-75">Tip: Many shortcuts are shared with M365; focus on Gmail labels, Meet, and Sites.</p></Card>
    </div>
  );
}

function ScenarioMode(props: {
  onResult: (delta: number, correct: boolean, why?: string) => void;
  onRoundEnd: (stats: { total: number; correct: number; avgMs: number }) => void;
}) {
  const { onResult, onRoundEnd } = props;
  const [scenario, setScenario] = useState<Scenario>(() => shuffle(SCENARIOS)[0]);
  const [pool, setPool] = useState<ScenarioStep[]>(() => shuffle(scenario.steps));
  const [order, setOrder] = useState<string[]>([]);
  const t0 = useRef<number>(Date.now());
  useEffect(() => { t0.current = Date.now(); }, [scenario]);

  const add = (id: string) => { if (order.includes(id)) return; setOrder((o) => [...o, id]); };
  const remove = (id: string) => setOrder((o) => o.filter((x) => x !== id));
  const submit = () => {
    const ok = JSON.stringify(order) === JSON.stringify(scenario.correctOrder);
    const dt = Date.now() - t0.current;
    onResult(ok ? +20 : 0, ok, ok ? "Great sequencing!" : `Correct: ${scenario.correctOrder.map(id => scenario.steps.find(s => s.id === id)?.text).join(" → ")}`);
    onRoundEnd({ total: 1, correct: ok ? 1 : 0, avgMs: dt });
    setTimeout(() => { const next = shuffle(SCENARIOS)[0]; setScenario(next); setPool(shuffle(next.steps)); setOrder([]); }, 600);
  };

  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-lg font-semibold mb-1">{scenario.title}</h2>
        <p className="text-sm opacity-80 mb-3">{scenario.prompt}</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Step Pool</h3>
            <ul className="grid gap-2">
              {pool.map((s) => (
                <li key={s.id}>
                  <button onClick={() => add(s.id)} className="w-full text-left px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">{s.text}</button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Your Sequence</h3>
            <ol className="grid gap-2">
              {order.map((id, i) => {
                const step = scenario.steps.find((s) => s.id === id)!;
                return (
                  <li key={id} className="flex items-center gap-2">
                    <span className="w-6 h-6 inline-flex items-center justify-center rounded-full border text-xs">{i + 1}</span>
                    <span className="flex-1 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700">{step.text}</span>
                    <button onClick={() => remove(id)} className="px-2 py-1 text-xs rounded-lg border">Remove</button>
                  </li>
                );
              })}
            </ol>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm opacity-70">Pick steps in order; remove to adjust.</div>
              <button onClick={submit} disabled={order.length !== scenario.correctOrder.length} className="px-3 py-1 rounded-xl border bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 disabled:opacity-50">Submit</button>
            </div>
          </div>
        </div>
      </Card>
      {scenario.tips && <Card><p className="text-sm opacity-75">Tip: {scenario.tips}</p></Card>}
    </div>
  );
}

/* ---------- Main ---------- */

function diffSettings(d: Difficulty) {
  switch (d) {
    case "Easy":   return { pairCount: 6,  questionCount: 8,  perQuestionMs: 25000 };
    case "Hard":   return { pairCount: 10, questionCount: 12, perQuestionMs: 12000 };
    default:       return { pairCount: 8,  questionCount: 10, perQuestionMs: 20000 }; // Normal
  }
}

export default function MigrationGame() {
  const [mode, setMode] = useState<Mode>(() => store.get<Mode>("gw.mode", "menu"));
  const [difficulty, setDifficulty] = useState<Difficulty>(() => store.get<Difficulty>("gw.diff", "Normal"));

  const [score, setScore] = useState(() => store.get<number>("gw.score", 0));
  const [best, setBest] = useState(() => store.get<number>("gw.best", 0));
  const [lives, setLives] = useState(() => store.get<number>("gw.lives", 3));
  const [badges, setBadges] = useState<BadgeKey[]>(() => store.get<BadgeKey[]>("gw.badges", []));
  const [modeScores, setModeScores] = useState<Record<string, number>>(() => store.get("gw.modeScores", {} as Record<string, number>));

  const settings = diffSettings(difficulty);

  const onResult = (delta: number, correct: boolean, why?: string) => {
    setScore((s) => s + delta);
    if (!correct) setLives((l) => Math.max(0, l - 1));
    // Keep logging minimal; avoid noisy toasts.
    console.debug(correct ? "OK:" : "NO:", why ?? "");
  };

  const onRoundEnd = (stats: { total: number; correct: number; avgMs: number }) => {
    const accuracy = stats.total ? Math.round((stats.correct / stats.total) * 100) : 0;
    setModeScores((ms) => ({ ...ms, [mode]: accuracy }));
    setBadges((prev) => {
      const next = new Set(prev);
      if (stats.avgMs < 5000) next.add("Speedster");
      if (stats.correct === stats.total) next.add("PerfectRound");
      if (mode === "match") next.add("MatchMaster");
      if (mode === "quiz") next.add("QuizWhiz");
      if (mode === "scenario") next.add("ScenarioSage");
      const merged = { ...modeScores, [mode]: accuracy };
      const high = ["match", "quiz", "scenario"].filter((m) => (merged[m] || 0) >= 80).length;
      if (high >= 3) next.add("MigrationPro");
      return Array.from(next);
    });
  };

  /* Persist */
  useEffect(() => void store.set("gw.mode", mode), [mode]);
  useEffect(() => void store.set("gw.diff", difficulty), [difficulty]);
  useEffect(() => { store.set("gw.score", score); setBest((b) => (score > b ? score : b)); }, [score]);
  useEffect(() => void store.set("gw.best", best), [best]);
  useEffect(() => void store.set("gw.lives", lives), [lives]);
  useEffect(() => void store.set("gw.badges", badges), [badges]);
  useEffect(() => void store.set("gw.modeScores", modeScores), [modeScores]);

  const reset = () => { setScore(0); setLives(3); setBadges([]); setModeScores({}); };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100">
      <Header
        score={score}
        best={best}
        mode={mode}
        onChangeMode={setMode}
        timeLeftMs={null}
        lives={lives}
        badges={badges}
        difficulty={difficulty}
        onChangeDifficulty={setDifficulty}
      />
      <main className="max-w-5xl mx-auto px-4 py-6 grid gap-4">
        {mode === "menu" && (
          <>
            <Card>
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Welcome! 🎉</h2>
                  <p className="opacity-80 mb-3">
                    Learn Google Workspace fast with mini-games designed for folks migrating
                    from Microsoft 365. Earn points, unlock badges, and level up your muscle memory.
                  </p>
                  <ul className="list-disc ml-5 space-y-1 text-sm opacity-90">
                    <li><b>Match:</b> Pair Microsoft apps with their Google counterparts.</li>
                    <li><b>Quiz:</b> Shortcuts, labels, suggesting mode, and more.</li>
                    <li><b>Scenarios:</b> Practical step-by-step tasks you’ll do daily.</li>
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => setMode("match")} className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800">Start Match</button>
                    <button onClick={() => setMode("quiz")} className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800">Start Quiz</button>
                    <button onClick={() => setMode("scenario")} className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800">Start Scenarios</button>
                  </div>
                </div>
                <div>
                  <div className="rounded-2xl border border-dashed p-6 text-center">
                    <div className="text-6xl mb-3">🧩</div>
                    <p className="opacity-80">Score: <b>{score}</b> · Best: <b>{best}</b> · Lives: <b>{"❤️".repeat(lives)}</b></p>
                    <p className="opacity-80 text-sm mt-1">Badges: {badges.length ? badges.join(", ") : "—"}</p>
                    <div className="mt-4">
                      <button onClick={reset} className="px-3 py-1 rounded-xl border text-sm">Reset Progress</button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold mb-2">Cheat Sheet</h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div>
                  <h4 className="font-semibold mb-1">Apps</h4>
                  <ul className="grid gap-1">
                    {APP_PAIRS.map((p) => (
                      <li key={p.left} className="flex items-center justify-between px-3 py-2 rounded-lg border">
                        <span>{p.left}</span><span className="opacity-60">→</span><span className="font-medium">{p.right}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Quick Shortcuts</h4>
                  <ul className="grid gap-1">
                    {SHORTCUT_QA.slice(0, 6).map((s) => (
                      <li key={s.q} className="flex items-center justify-between px-3 py-2 rounded-lg border">
                        <span>{s.q}</span><span className="font-medium">{s.answer}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </>
        )}

        {mode === "match" && (
          <MatchMode onResult={onResult} onRoundEnd={onRoundEnd} pairCount={settings.pairCount} />
        )}
        {mode === "quiz" && (
          <QuizMode
            onResult={onResult}
            onRoundEnd={onRoundEnd}
            questionCount={settings.questionCount}
            perQuestionMs={settings.perQuestionMs}
          />
        )}
        {mode === "scenario" && <ScenarioMode onResult={onResult} onRoundEnd={onRoundEnd} />}
      </main>
    </div>
  );
}
