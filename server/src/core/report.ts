import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { GameReport, ReportPlayer, ReportQuestion, ReportSummary } from '@ng/shared';
import { DATA_DIR } from '../paths';
import type { Room } from './types';

export const REPORTS_DIR = path.join(DATA_DIR, 'reports');
const ID_RE = /^\d{8}T\d{6}-\d{6}$/;
export const isReportId = (s: string) => ID_RE.test(s);

const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

function stamp(t: number) {
  return new Date(t).toISOString().replace(/[-:]/g, '').slice(0, 15); // 20261031T213500
}

/** Everything is derived from the per-round records, so kicked/left players still appear. */
export function buildReport(room: Room): GameReport | undefined {
  const g = room.game;
  if (!g) return undefined;

  const questions: ReportQuestion[] = g.history.map((r) => {
    const answered = r.entries.filter((e) => e.answered);
    const correct = answered.filter((e) => e.correct);
    return {
      index: r.index,
      questionId: r.questionId,
      label: r.label,
      limitMs: r.limitMs,
      eligible: r.eligible,
      answered: answered.length,
      correct: correct.length,
      avgMs: mean(answered.map((e) => e.elapsedMs ?? 0)),
      avgCorrectMs: mean(correct.map((e) => e.elapsedMs ?? 0)),
    };
  });

  const acc = new Map<string, Omit<ReportPlayer, 'rank'> & { times: number[]; streak: number }>();
  for (const p of room.players.values()) {
    acc.set(p.id, { playerId: p.id, nickname: p.nickname, avatarId: p.avatarId, score: 0, correct: 0, wrong: 0, unanswered: 0, bestStreak: 0, avgMs: null, times: [], streak: 0 });
  }
  for (const r of g.history) {
    for (const e of r.entries) {
      let a = acc.get(e.playerId);
      if (!a) {
        a = { playerId: e.playerId, nickname: e.nickname, avatarId: e.avatarId, score: 0, correct: 0, wrong: 0, unanswered: 0, bestStreak: 0, avgMs: null, times: [], streak: 0 };
        acc.set(e.playerId, a);
      }
      a.score += e.points;
      if (!e.answered) a.unanswered++;
      else if (e.correct) a.correct++;
      else a.wrong++;
      if (e.answered && e.elapsedMs != null) a.times.push(e.elapsedMs);
      a.streak = e.correct ? a.streak + 1 : 0;
      a.bestStreak = Math.max(a.bestStreak, a.streak);
    }
  }

  const sorted = [...acc.values()].sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname));
  const players: ReportPlayer[] = [];
  sorted.forEach((a, i) => {
    const { times, streak: _s, ...rest } = a;
    // competition ranking: ties share a rank
    const rank = i > 0 && sorted[i - 1].score === a.score ? players[i - 1].rank : i + 1;
    players.push({ ...rest, avgMs: mean(times), rank });
  });

  return {
    id: `${stamp(g.startedAt)}-${room.code}`,
    roomCode: room.code,
    moduleId: [...new Set(g.steps.map((s) => s.moduleId))].join('+'),
    startedAt: g.startedAt,
    endedAt: g.endedAt ?? null,
    totalQuestions: g.total,
    questions,
    players,
  };
}

/** Write-then-rename so a crash can't leave a half-written report. Called after every reveal and at the end. */
export async function saveReport(report: GameReport) {
  await mkdir(REPORTS_DIR, { recursive: true });
  const file = path.join(REPORTS_DIR, `${report.id}.json`);
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(report), 'utf8');
  await rename(tmp, file);
}

export async function loadReport(id: string): Promise<GameReport | undefined> {
  if (!isReportId(id)) return undefined; // also blocks path traversal
  try {
    return JSON.parse(await readFile(path.join(REPORTS_DIR, `${id}.json`), 'utf8')) as GameReport;
  } catch {
    return undefined;
  }
}

export async function listReports(): Promise<ReportSummary[]> {
  let files: string[];
  try {
    files = await readdir(REPORTS_DIR);
  } catch {
    return [];
  }
  const out: ReportSummary[] = [];
  for (const f of files) {
    const id = f.replace(/\.json$/, '');
    if (!f.endsWith('.json') || !isReportId(id)) continue;
    const r = await loadReport(id);
    if (r) out.push({ id, roomCode: r.roomCode, startedAt: r.startedAt, endedAt: r.endedAt, playerCount: r.players.length, questionCount: r.questions.length, totalQuestions: r.totalQuestions });
  }
  return out.sort((a, b) => b.startedAt - a.startedAt);
}
