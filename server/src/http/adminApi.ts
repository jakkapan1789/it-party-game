import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import express, { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { pinMatches } from '../auth';
import { QUESTIONS_FILE, questionSchema } from '../games/pickImage';
import { QUIZ_QUESTIONS_FILE, quizQuestionSchema } from '../games/quiz';
import { gameModules } from '../games';
import { loadPackages, savePackages } from '../packages';
import { packagesSchema, type GameInfo } from '@ng/shared';
import { buildReport, listReports, loadReport } from '../core/report';
import type { Room } from '../core/types';
import { UPLOADS_DIR } from '../paths';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_QUESTIONS = 100;
// SVG is deliberately excluded: user-uploaded SVG served from our origin can carry script.
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

// ── brute-force guard on the PIN header ──
const FAIL_LIMIT = 10;
const FAIL_WINDOW_MS = 5 * 60_000;
const failures = new Map<string, { n: number; resetAt: number }>();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip ?? 'unknown';
  const f = failures.get(ip);
  if (f && f.resetAt > Date.now() && f.n >= FAIL_LIMIT) return void res.status(429).json({ error: 'too_many_attempts' });
  const pin = req.header('x-admin-pin') ?? '';
  if (!pinMatches(pin)) {
    const cur = f && f.resetAt > Date.now() ? f : { n: 0, resetAt: Date.now() + FAIL_WINDOW_MS };
    cur.n++;
    failures.set(ip, cur);
    return void res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

const questionsSchema = z
  .array(
    questionSchema.refine((q) => q.images.every((i) => i.src.startsWith('/uploads/')), {
      message: 'image src must start with /uploads/',
    }),
  )
  .min(1)
  .max(MAX_QUESTIONS)
  .superRefine((qs, ctx) => {
    const seen = new Set<string>();
    qs.forEach((q, i) => {
      if (seen.has(q.id)) ctx.addIssue({ code: 'custom', path: [i, 'id'], message: `duplicate question id "${q.id}"` });
      seen.add(q.id);
    });
  });

const quizQuestionsSchema = z
  .array(quizQuestionSchema)
  .min(1)
  .max(MAX_QUESTIONS)
  .superRefine((qs, ctx) => {
    const seen = new Set<string>();
    qs.forEach((q, i) => {
      if (seen.has(q.id)) ctx.addIssue({ code: 'custom', path: [i, 'id'], message: `duplicate question id "${q.id}"` });
      seen.add(q.id);
    });
  });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    // Never trust the client's filename: random name, extension from the checked mime type.
    filename: (_req, file, cb) => cb(null, `${randomBytes(9).toString('hex')}${EXT_BY_MIME[file.mimetype]}`),
  }),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype in EXT_BY_MIME),
}).single('image');

export function adminApi(getRoom: (code: string) => Room | undefined): Router {
  const r = Router();
  r.use('/api/admin', requireAdmin);

  r.get('/api/admin/questions', (_req, res) => {
    res.json(JSON.parse(readFileSync(QUESTIONS_FILE, 'utf8')));
  });

  r.get('/api/admin/quiz-questions', (_req, res) => {
    try {
      res.json(JSON.parse(readFileSync(QUIZ_QUESTIONS_FILE, 'utf8')));
    } catch {
      res.json([]);
    }
  });

  r.put('/api/admin/quiz-questions', express.json({ limit: '1mb' }), async (req, res) => {
    const parsed = quizQuestionsSchema.safeParse(req.body);
    if (!parsed.success) {
      return void res.status(400).json({ error: 'invalid', issues: parsed.error.issues.slice(0, 10).map((i) => ({ path: i.path.join('.'), message: i.message })) });
    }
    const tmp = path.join(path.dirname(QUIZ_QUESTIONS_FILE), `.quiz-${randomBytes(4).toString('hex')}.tmp`);
    await writeFile(tmp, JSON.stringify(parsed.data, null, 2), 'utf8');
    await rename(tmp, QUIZ_QUESTIONS_FILE);
    res.json({ ok: true, count: parsed.data.length });
  });

  r.put('/api/admin/questions', express.json({ limit: '1mb' }), async (req, res) => {
    const parsed = questionsSchema.safeParse(req.body);
    if (!parsed.success) {
      return void res.status(400).json({
        error: 'invalid',
        issues: parsed.error.issues.slice(0, 10).map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    // Write-then-rename so a crash mid-write can't leave a half-written question file.
    const tmp = path.join(path.dirname(QUESTIONS_FILE), `.questions-${randomBytes(4).toString('hex')}.tmp`);
    await writeFile(tmp, JSON.stringify(parsed.data, null, 2), 'utf8');
    await rename(tmp, QUESTIONS_FILE);
    res.json({ ok: true, count: parsed.data.length });
  });

  // Games the server can run + saved packages (playlists of games) the host picks from before starting.
  r.get('/api/admin/games', (_req, res) => {
    const games: GameInfo[] = [...gameModules.values()].map((m) => ({ id: m.id, title: m.title, questions: m.listQuestions() }));
    res.json(games);
  });

  r.get('/api/admin/packages', (_req, res) => {
    res.json(loadPackages());
  });

  r.put('/api/admin/packages', express.json({ limit: '100kb' }), async (req, res) => {
    const parsed = packagesSchema.safeParse(req.body);
    if (!parsed.success) {
      return void res.status(400).json({ error: 'invalid', issues: parsed.error.issues.slice(0, 10).map((i) => ({ path: i.path.join('.'), message: i.message })) });
    }
    const unknown = parsed.data.map((p) => p.moduleId).find((id) => !gameModules.has(id));
    if (unknown) return void res.status(400).json({ error: 'invalid', issues: [{ path: 'moduleId', message: `unknown game "${unknown}"` }] });
    await savePackages(parsed.data);
    res.json({ ok: true, count: parsed.data.length });
  });

  // Live report of a room (also works mid-game, covering the questions revealed so far).
  r.get('/api/admin/report/live/:code', (req, res) => {
    const room = getRoom(req.params.code);
    const report = room && buildReport(room);
    if (!report) return void res.status(404).json({ error: 'not_found' });
    res.json(report);
  });

  r.get('/api/admin/reports', async (_req, res) => {
    res.json(await listReports());
  });

  r.get('/api/admin/reports/:id', async (req, res) => {
    const report = await loadReport(req.params.id);
    if (!report) return void res.status(404).json({ error: 'not_found' });
    res.json(report);
  });

  r.post('/api/admin/upload', (req, res) => {
    upload(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        return void res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: err.code });
      }
      if (err) return void res.status(500).json({ error: 'upload_failed' });
      if (!req.file) return void res.status(415).json({ error: 'unsupported_type' });
      res.json({ src: `/uploads/${req.file.filename}` });
    });
  });

  return r;
}
