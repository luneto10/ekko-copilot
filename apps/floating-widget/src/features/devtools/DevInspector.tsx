import { useEffect, useMemo, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import type { DebugEvent, DebugLevel, DebugMetrics, SpeakerId } from '@workiq/types';
import { bridge } from '@/shared/bridge';
import { StatusPill } from '@/shared/ui/StatusPill';

const LEVELS: DebugLevel[] = ['event', 'info', 'warn', 'error'];

const LEVEL_STYLE: Record<DebugLevel, string> = {
  event: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  info: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  warn: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  error: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

const CATEGORY_COLOR: Record<string, string> = {
  audio: 'text-cyan-300',
  speech: 'text-emerald-300',
  transcript: 'text-sky-300',
  intent: 'text-fuchsia-300',
  workiq: 'text-violet-300',
  memory: 'text-amber-300',
  tactic: 'text-orange-300',
  config: 'text-slate-400',
  orchestrator: 'text-teal-300',
  test: 'text-pink-300',
};

const QUICK_INJECTS: { label: string; text: string }[] = [
  { label: 'Pricing', text: 'How much does the enterprise plan cost per user?' },
  { label: 'Security', text: 'Is your platform SOC 2 compliant and how is data encrypted?' },
  { label: 'SLA', text: 'What uptime SLA do you guarantee?' },
  { label: 'Contract', text: "What's the contract term, and can we cancel early?" },
  { label: 'Integration', text: 'Can it integrate with Salesforce through your API?' },
  { label: 'Competitor', text: 'How are you different from Salesforce?' },
];

const SAMPLE_CALL: { speaker: SpeakerId; text: string }[] = [
  { speaker: 'Speaker_1', text: "Thanks for joining today, Carlos. I'd love to understand your current workflow and where the friction is." },
  { speaker: 'Speaker_2', text: 'Sure. Right now my team wastes hours every week reconciling data across three different tools.' },
  { speaker: 'Speaker_1', text: "That's exactly the kind of pain we remove. How many people are affected by this?" },
  { speaker: 'Speaker_2', text: "About forty on the operations side. It's a real bottleneck during our month-end close." },
  { speaker: 'Speaker_2', text: 'Before we go further, how much does the enterprise plan cost per user?' },
  { speaker: 'Speaker_1', text: 'Great question. Let me frame it around the ROI first, then I will share the pricing.' },
  { speaker: 'Speaker_2', text: 'We also have strict requirements. Is your platform SOC 2 compliant and how is data encrypted?' },
  { speaker: 'Speaker_1', text: 'Yes, we are SOC 2 Type II with encryption at rest and in transit. I can send the whitepaper.' },
  { speaker: 'Speaker_2', text: 'Good. My main concern now is the contract term and whether we can cancel early.' },
  { speaker: 'Speaker_1', text: "Understood. Let's tailor a proposal that fits your procurement timeline and budget." },
];

const catColor = (category: string) => CATEGORY_COLOR[category] ?? 'text-slate-300';
const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString('en-US', { hour12: false }) + '.' + String(ts % 1000).padStart(3, '0');

export function DevInspector() {
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [metrics, setMetrics] = useState<DebugMetrics | null>(null);
  const [paused, setPaused] = useState(false);
  const [search, setSearch] = useState('');
  const [activeLevels, setActiveLevels] = useState<Set<DebugLevel>>(new Set(LEVELS));
  const [speaker, setSpeaker] = useState<SpeakerId>('Speaker_2');
  const [injectText, setInjectText] = useState('');
  const [tab, setTab] = useState<'log' | 'memory'>('log');

  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const logEndRef = useRef<HTMLDivElement>(null);
  const playingRef = useRef(false);

  useEffect(() => {
    const offs = [
      bridge.onDebugInit((snapshot) => {
        setEvents(snapshot.events);
        setMetrics(snapshot.metrics);
      }),
      bridge.onDebugEvent((event) => {
        if (pausedRef.current) return;
        setEvents((prev) => [...prev.slice(-800), event]);
      }),
      bridge.onDebugMetrics((m) => setMetrics(m)),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (!activeLevels.has(e.level)) return false;
      if (!q) return true;
      return (
        e.message.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        JSON.stringify(e.data ?? '').toLowerCase().includes(q)
      );
    });
  }, [events, activeLevels, search]);

  useEffect(() => {
    if (!paused) logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filtered, paused]);

  const counters = metrics?.counters ?? {};
  const gauges = metrics?.gauges ?? {};
  const latestMemory = useMemo(() => {
    for (let i = events.length - 1; i >= 0; i--) {
      const d = events[i].data as { markdown?: string } | undefined;
      if (events[i].category === 'memory' && d?.markdown) return d.markdown;
    }
    return '';
  }, [events]);

  const toggleLevel = (lvl: DebugLevel) => {
    setActiveLevels((prev) => {
      const next = new Set(prev);
      if (next.has(lvl)) next.delete(lvl);
      else next.add(lvl);
      return next;
    });
  };

  const inject = (text: string) => {
    const t = text.trim();
    if (t) bridge.sendTestTranscript(speaker, t);
  };

  const playSampleCall = () => {
    if (playingRef.current) return;
    playingRef.current = true;
    SAMPLE_CALL.forEach((line, i) => {
      setTimeout(() => {
        bridge.sendTestTranscript(line.speaker, line.text);
        if (i === SAMPLE_CALL.length - 1) playingRef.current = false;
      }, i * 900);
    });
  };

  const kb = (bytes: number) => (bytes ? `${(bytes / 1024).toFixed(0)} KB` : '0');

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          WorkIQ Dev Inspector
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <StatusPill ok={gauges['speech.configured'] === true} label="Speech" />
          <StatusPill ok={gauges['openai.configured'] === true} label="OpenAI" />
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-300">
            Work IQ: {String(gauges['workiq.mode'] ?? '-')}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-400">
            {String(gauges['openai.deployment'] ?? '-')}
          </span>
        </div>
      </header>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-2 border-b border-white/10 px-4 py-3 text-center md:grid-cols-7">
        <Stat label="Mic chunks" value={counters['audio.chunks.mic'] ?? 0} sub={kb(counters['audio.bytes.mic'] ?? 0)} />
        <Stat label="Sys chunks" value={counters['audio.chunks.system'] ?? 0} sub={kb(counters['audio.bytes.system'] ?? 0)} />
        <Stat label="Finals" value={counters['finals'] ?? 0} sub={`${gauges['buffer.words'] ?? 0} buf words`} />
        <Stat label="Intents" value={counters['intents'] ?? 0} />
        <Stat label="Work IQ" value={counters['workiq.calls'] ?? 0} sub={gauges['workiq.lastMs'] ? `${gauges['workiq.lastMs']} ms` : undefined} />
        <Stat label="Memory" value={counters['memory.compiles'] ?? 0} sub={gauges['memory.lastMs'] ? `${gauges['memory.lastMs']} ms` : undefined} />
        <Stat label="Tactics" value={counters['tactics'] ?? 0} />
      </div>

      {/* Injector */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2">
        <span className="text-[11px] uppercase tracking-widest text-slate-500">Inject</span>
        <select
          value={speaker}
          onChange={(e) => setSpeaker(e.target.value as SpeakerId)}
          className="rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-xs"
        >
          <option value="Speaker_2">Customer</option>
          <option value="Speaker_1">Sales Rep</option>
        </select>
        <input
          value={injectText}
          onChange={(e) => setInjectText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              inject(injectText);
              setInjectText('');
            }
          }}
          placeholder="Type a line and press Enter to feed the pipeline..."
          className="min-w-[220px] flex-1 rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500/50"
        />
        {QUICK_INJECTS.map((q) => (
          <button
            key={q.label}
            onClick={() => inject(q.text)}
            title={q.text}
            className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[11px] text-violet-200 hover:bg-violet-500/20"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Simulation controls */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2">
        <span className="text-[11px] uppercase tracking-widest text-slate-500">Simulate</span>
        <button
          onClick={playSampleCall}
          className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/25"
        >
          Play sample call
        </button>
        <button
          onClick={() => bridge.forceMemoryCompile()}
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200 hover:bg-amber-500/20"
        >
          Compile memory now
        </button>
        <button
          onClick={() => bridge.forceTactic()}
          className="rounded-md border border-orange-500/40 bg-orange-500/10 px-2 py-1 text-[11px] text-orange-200 hover:bg-orange-500/20"
        >
          Generate tactic now
        </button>
        <span className="text-[10px] text-slate-500">
          Memory auto-compiles after ~{String(gauges['memory.flushWords'] ?? 40)} words. Use these to force it.
        </span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/10 px-4 py-1.5 text-[11px]">
        {(['log', 'memory'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1 font-medium transition ${
              tab === t ? 'bg-white/10 text-slate-100' : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            {t === 'log' ? 'Event Log' : 'Compiled Memory'}
          </button>
        ))}
      </div>

      {/* Filters (log only) */}
      {tab === 'log' && (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2 text-[11px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="filter..."
            className="w-40 rounded-md border border-white/10 bg-slate-900 px-2 py-1 outline-none focus:border-sky-500/50"
          />
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              onClick={() => toggleLevel(lvl)}
              className={`rounded-full border px-2 py-0.5 capitalize ${
                activeLevels.has(lvl) ? LEVEL_STYLE[lvl] : 'border-white/10 text-slate-600'
              }`}
            >
              {lvl}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-slate-500">
              {filtered.length}/{events.length}
            </span>
            <button
              onClick={() => setPaused((p) => !p)}
              className={`rounded-md border px-2 py-0.5 ${
                paused ? 'border-amber-500/40 bg-amber-500/15 text-amber-200' : 'border-white/10 text-slate-300'
              }`}
            >
              {paused ? 'Paused' : 'Live'}
            </button>
            <button
              onClick={() => {
                bridge.clearDebug();
                setEvents([]);
              }}
              className="rounded-md border border-white/10 px-2 py-0.5 text-slate-300 hover:bg-white/5"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Body: event log OR compiled memory */}
      {tab === 'log' ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 font-mono text-[11px] leading-relaxed">
          {filtered.length === 0 && <p className="italic text-slate-600">No events match.</p>}
          {filtered.slice(-400).map((e) => (
            <div key={e.id} className="border-b border-white/5 py-0.5">
              <div className="flex items-start gap-2">
                <span className="shrink-0 text-slate-600">{fmtTime(e.ts)}</span>
                <span className={`shrink-0 rounded border px-1 ${LEVEL_STYLE[e.level]}`}>{e.level}</span>
                <span className={`shrink-0 font-semibold ${catColor(e.category)}`}>{e.category}</span>
                <span className="text-slate-200">{e.message}</span>
              </div>
              {e.data != null && JSON.stringify(e.data) !== '{}' && (
                <details className="ml-[5.5rem] mt-0.5">
                  <summary className="cursor-pointer text-slate-600 hover:text-slate-400">data</summary>
                  <pre className="overflow-x-auto whitespace-pre-wrap text-slate-400">
                    {JSON.stringify(e.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest text-slate-500">
              Live memory.md
            </span>
            <button
              onClick={() => bridge.forceMemoryCompile()}
              className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200 hover:bg-amber-500/20"
            >
              Compile now
            </button>
          </div>
          {latestMemory ? (
            <div className="prose-copilot max-w-2xl text-sm text-slate-200">
              <Markdown>{latestMemory}</Markdown>
            </div>
          ) : (
            <p className="italic text-slate-600">No memory compiled yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}
