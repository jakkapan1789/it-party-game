import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { GameReport, ReportPlayer, ReportQuestion, ReportSummary } from '@ng/shared';
import { adminPin } from '../lib/session';
import { th } from '../i18n/th';
import { BlossomPanel, Button3D, Card } from '../design';
import { AdminPage, NeedLogin } from '../lobby/AdminPage';
import { Avatar } from '../mascot/Avatar';

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const sec = (ms: number | null) => (ms == null ? '–' : (ms / 1000).toFixed(1));
const when = (t: number) => new Date(t).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });

// Excel treats cells starting with = + - @ as formulas; nicknames are untrusted, so neutralise them.
const cell = (v: string | number | null) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function download(name: string, rows: (string | number | null)[][]) {
  // BOM so Excel opens the Thai text as UTF-8
  const blob = new Blob(['﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function AdminReport() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const pin = adminPin.get();
  const room = params.get('room');
  const id = params.get('id');

  const [report, setReport] = useState<GameReport | null>(null);
  const [list, setList] = useState<ReportSummary[] | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'notfound' | 'error'>('loading');

  const load = useCallback(() => {
    if (!pin) return;
    const headers = { 'x-admin-pin': pin };
    const url = room ? `/api/admin/report/live/${encodeURIComponent(room)}` : id ? `/api/admin/reports/${encodeURIComponent(id)}` : '/api/admin/reports';
    setState('loading');
    fetch(url, { headers })
      .then(async (r) => {
        if (r.status === 404) return setState('notfound');
        if (!r.ok) return setState('error');
        const data = await r.json();
        if (room || id) setReport(data as GameReport);
        else setList(data as ReportSummary[]);
        setState('ok');
      })
      .catch(() => setState('error'));
  }, [pin, room, id]);

  useEffect(load, [load]);

  if (!pin) return <NeedLogin title={th.report.title} text={th.editor.needLogin} cta={th.editor.goLogin} />;

  const back = id ? [{ to: '/admin/report', label: th.report.listTitle }, { to: '/admin', label: th.admin.backToRoom }] : [{ to: '/admin', label: th.admin.backToRoom }];
  return (
    <AdminPage title={th.report.title} back={back} wide>
        {report && (room || id) && (
          <div className="no-print flex flex-wrap justify-center gap-3">
            <Button3D variant="alt" className="!text-base" onClick={load}>{th.report.refresh}</Button3D>
            <Button3D variant="alt" className="!text-base" onClick={() => downloadPlayers(report)}>{th.report.csvPlayers}</Button3D>
            <Button3D variant="alt" className="!text-base" onClick={() => downloadQuestions(report)}>{th.report.csvQuestions}</Button3D>
            <Button3D variant="orange" className="!text-base" onClick={() => window.print()}>{th.report.print}</Button3D>
          </div>
        )}

      {state === 'loading' && <BlossomPanel size="sm"><p className="py-4 text-center font-semibold">{th.editor.loading}</p></BlossomPanel>}
      {state === 'notfound' && <BlossomPanel size="sm"><p className="py-4 text-center font-semibold">{th.report.notFound}</p></BlossomPanel>}
      {state === 'error' && <BlossomPanel size="sm"><p className="py-4 text-center font-semibold text-stop-dark">{th.report.loadFailed}</p></BlossomPanel>}

      {state === 'ok' && list && !room && !id && (
        <BlossomPanel title={th.report.listTitle} className="space-y-3">
          {list.length === 0 && <p className="py-6 text-center opacity-70">{th.report.empty}</p>}
          <ul className="space-y-2">
            {list.map((r) => (
              <li key={r.id} className="card-solid flex flex-wrap items-center gap-3 px-3 py-2">
                <span className="font-display text-xl">{th.report.room} {r.roomCode}</span>
                <span className="text-sm opacity-70">{when(r.startedAt)}</span>
                <span className="text-sm">👥 {r.playerCount} · ❓ {r.questionCount}/{r.totalQuestions}</span>
                <Button3D variant="go" className="ml-auto !min-h-10 !px-4 !text-base" onClick={() => nav(`/admin/report?id=${r.id}`)}>
                  {th.report.open}
                </Button3D>
              </li>
            ))}
          </ul>
        </BlossomPanel>
      )}

      {state === 'ok' && report && (room || id) && <ReportView report={report} />}
    </AdminPage>
  );
}

function downloadPlayers(r: GameReport) {
  download(`report-${r.roomCode}-players.csv`, [
    [th.report.colRank, th.report.colPlayer, th.report.colScore, th.report.colRight, th.report.colWrong, th.report.colNone, th.report.colStreak, `${th.report.colAvgAll} (${th.report.secUnit})`],
    ...r.players.map((p) => [p.rank, p.nickname, p.score, p.correct, p.wrong, p.unanswered, p.bestStreak, p.avgMs == null ? '' : (p.avgMs / 1000).toFixed(2)]),
  ]);
}

function downloadQuestions(r: GameReport) {
  download(`report-${r.roomCode}-questions.csv`, [
    [th.report.colNo, th.report.colQuestion, th.report.players, th.report.colAnswered, th.report.colCorrect, '%', `${th.report.colAvg} (${th.report.secUnit})`],
    ...r.questions.map((q) => [q.index + 1, q.label, q.eligible, q.answered, q.correct, pct(q.correct, q.eligible), q.avgCorrectMs == null ? '' : (q.avgCorrectMs / 1000).toFixed(2)]),
  ]);
}

function ReportView({ report }: { report: GameReport }) {
  const [query, setQuery] = useState('');

  const t = useMemo(() => {
    const eligible = report.questions.reduce((a, q) => a + q.eligible, 0);
    const answered = report.questions.reduce((a, q) => a + q.answered, 0);
    const correct = report.questions.reduce((a, q) => a + q.correct, 0);
    const times = report.questions.filter((q) => q.avgMs != null && q.answered > 0);
    const avgMs = times.length ? times.reduce((a, q) => a + q.avgMs! * q.answered, 0) / times.reduce((a, q) => a + q.answered, 0) : null;
    const rates = report.questions.map((q) => pct(q.correct, q.eligible));
    return {
      accuracy: pct(correct, eligible),
      participation: pct(answered, eligible),
      avgMs,
      hardest: rates.length > 1 ? rates.indexOf(Math.min(...rates)) : -1,
      easiest: rates.length > 1 ? rates.indexOf(Math.max(...rates)) : -1,
    };
  }, [report]);

  const players = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? report.players.filter((p) => p.nickname.toLowerCase().includes(q)) : report.players;
  }, [report, query]);

  const minutes = report.endedAt ? Math.max(1, Math.round((report.endedAt - report.startedAt) / 60000)) : null;
  const partial = report.questions.length < report.totalQuestions;

  return (
    <>
      <div className="space-y-1 text-center text-white print:text-left print:text-black">
        <h1 className="text-outline hidden text-4xl print:block print:text-black print:[-webkit-text-stroke:0] print:[text-shadow:none]">{th.report.title}</h1>
        <p className="font-semibold [text-shadow:0_2px_0_var(--color-ink)] print:[text-shadow:none]">
          {th.report.room} {report.roomCode} · {when(report.startedAt)}
          {minutes != null && ` · ${th.report.duration(minutes)}`}
          {partial && ` · ${th.report.partial(report.questions.length, report.totalQuestions)}`}
        </p>
        {report.endedAt == null && <p className="rounded-lg border-[3px] border-ink bg-alt px-3 py-1 font-semibold text-ink">{th.report.live}</p>}
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Tile label={th.report.players} value={report.players.length} />
        <Tile label={th.report.questions} value={`${report.questions.length}/${report.totalQuestions}`} />
        <Tile label={th.report.accuracy} value={`${t.accuracy}%`} />
        <Tile label={th.report.participation} value={`${t.participation}%`} />
        <Tile label={th.report.avgTime} value={`${sec(t.avgMs)} ${th.report.secUnit}`} />
      </section>

      {report.players.length > 0 && (
        <BlossomPanel title={`🏆 ${th.report.podium}`} className="space-y-2">
          <ol className="grid gap-2 sm:grid-cols-3">
            {report.players.slice(0, 3).map((p) => (
              <li key={p.playerId} className="flex items-center gap-3 rounded-xl border-[3px] border-ink bg-[#FFE98A] px-3 py-2">
                <span className="text-3xl">{['🥇', '🥈', '🥉'][Math.min(p.rank, 3) - 1]}</span>
                <Avatar id={p.avatarId} size={44} />
                <span className="min-w-0 flex-1 truncate font-semibold">{p.nickname}</span>
                <span className="font-display text-xl">{p.score.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        </BlossomPanel>
      )}

      <BlossomPanel title={th.report.perQuestion}>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b-[3px] border-ink text-sm">
              <th className="py-2 pr-2">{th.report.colNo}</th>
              <th className="pr-2">{th.report.colQuestion}</th>
              <th className="w-56 pr-2">{th.report.colCorrect}</th>
              <th className="pr-2">{th.report.colAnswered}</th>
              <th>{th.report.colAvg}</th>
            </tr>
          </thead>
          <tbody>
            {report.questions.map((q, i) => (
              <QuestionRow key={q.questionId} q={q} tag={i === t.hardest ? th.report.hardest : i === t.easiest ? th.report.easiest : null} />
            ))}
          </tbody>
        </table>
        </div>
      </BlossomPanel>

      <BlossomPanel title={th.report.perPlayer} className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={th.report.search}
            className="no-print ml-auto h-10 w-56 rounded-xl border-[3px] border-ink bg-white px-3 outline-none focus:ring-4 focus:ring-[#FFE600]"
          />
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b-[3px] border-ink text-sm">
              <th className="py-2 pr-2">{th.report.colRank}</th>
              <th className="pr-2">{th.report.colPlayer}</th>
              <th className="pr-2 text-right">{th.report.colScore}</th>
              <th className="pr-2 text-right">✓ {th.report.colRight}</th>
              <th className="pr-2 text-right">✕ {th.report.colWrong}</th>
              <th className="pr-2 text-right">{th.report.colNone}</th>
              <th className="pr-2 text-right">🔥 {th.report.colStreak}</th>
              <th className="text-right">{th.report.colAvgAll}</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <PlayerRow key={p.playerId} p={p} />
            ))}
          </tbody>
        </table>
        </div>
        {players.length === 0 && <p className="py-4 text-center opacity-70">{th.report.noMatch}</p>}
      </BlossomPanel>
    </>
  );
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card-solid px-3 py-2 text-center">
      <p className="font-display text-3xl leading-tight">{value}</p>
      <p className="text-sm opacity-75">{label}</p>
    </div>
  );
}

function QuestionRow({ q, tag }: { q: ReportQuestion; tag: string | null }) {
  const rate = pct(q.correct, q.eligible);
  return (
    <tr className="border-b border-[#5B3A29]/30 align-middle">
      <td className="py-2 pr-2 font-display text-lg">{q.index + 1}</td>
      <td className="pr-2">
        <span className="font-semibold">{q.label}</span>
        {tag && (
          <span className={`ml-2 rounded-full border-2 border-ink px-2 text-xs font-semibold text-white ${tag === th.report.hardest ? 'bg-stop' : 'bg-go'}`}>{tag}</span>
        )}
      </td>
      <td className="pr-2">
        <div className="flex items-center gap-2">
          <div className="h-4 flex-1 overflow-hidden rounded-full border-2 border-ink bg-white">
            <div className="h-full bg-go" style={{ width: `${rate}%` }} />
          </div>
          <span className="w-24 text-right text-sm font-semibold">{q.correct}/{q.eligible} ({rate}%)</span>
        </div>
      </td>
      <td className="pr-2">{q.answered}/{q.eligible}</td>
      <td>{sec(q.avgCorrectMs)} {th.report.secUnit}</td>
    </tr>
  );
}

function PlayerRow({ p }: { p: ReportPlayer }) {
  return (
    <tr className="border-b border-[#5B3A29]/30 align-middle">
      <td className="py-1.5 pr-2 font-display text-lg">{p.rank}</td>
      <td className="pr-2">
        <span className="flex items-center gap-2">
          <Avatar id={p.avatarId} size={30} />
          <span className="max-w-[16ch] truncate font-semibold">{p.nickname}</span>
        </span>
      </td>
      <td className="pr-2 text-right font-display text-lg">{p.score.toLocaleString()}</td>
      <td className="pr-2 text-right">{p.correct}</td>
      <td className="pr-2 text-right">{p.wrong}</td>
      <td className="pr-2 text-right">{p.unanswered}</td>
      <td className="pr-2 text-right">{p.bestStreak}</td>
      <td className="text-right">{sec(p.avgMs)} {th.report.secUnit}</td>
    </tr>
  );
}
