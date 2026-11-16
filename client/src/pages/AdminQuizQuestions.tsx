import { useEffect, useState } from 'react';
import { adminPin } from '../lib/session';
import { adminHeaders } from '../lib/packages';
import { th } from '../i18n/th';
import { BlossomPanel, Button3D } from '../design';
import { AdminPage, NeedLogin } from '../lobby/AdminPage';

interface Choice { id: string; text: string }
interface Q { id: string; prompt: string; choices: Choice[]; correctChoiceId: string; timeLimitSec: number }

const DEFAULT_TIME = 15;
const rid = () => Math.random().toString(36).slice(2, 7);
const blank = (): Q => {
  const choices = [{ id: rid(), text: '' }, { id: rid(), text: '' }, { id: rid(), text: '' }, { id: rid(), text: '' }];
  return { id: `z${rid()}`, prompt: '', choices, correctChoiceId: choices[0].id, timeLimitSec: DEFAULT_TIME };
};
const input = 'h-11 w-full rounded-xl border-[3px] border-ink bg-white px-3 text-lg outline-none focus:ring-4 focus:ring-[#FFE600]';
const LETTERS = ['A', 'B', 'C', 'D'];

/** Host page: edit the text-question set used by the "เกมตอบคำถาม" game. */
export default function AdminQuizQuestions() {
  const pin = adminPin.get();
  const [qs, setQs] = useState<Q[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!pin) return;
    fetch('/api/admin/quiz-questions', { headers: adminHeaders() }).then((r) => (r.ok ? r.json() : Promise.reject())).then(setQs).catch(() => setMsg({ kind: 'err', text: th.packages.loadFailed }));
  }, [pin]);

  if (!pin) return <NeedLogin title={th.quizEditor.title} text={th.editor.needLogin} cta={th.editor.goLogin} />;

  const edit = (next: Q[]) => { setQs(next); setDirty(true); setMsg(null); };
  const patch = (i: number, p: Partial<Q>) => edit(qs!.map((q, k) => (k === i ? { ...q, ...p } : q)));
  const setChoice = (qi: number, ci: number, text: string) => patch(qi, { choices: qs![qi].choices.map((c, k) => (k === ci ? { ...c, text } : c)) });
  const move = (i: number, d: -1 | 1) => { const a = [...qs!]; [a[i + d], a[i]] = [a[i], a[i + d]]; edit(a); };
  const invalid = !qs || qs.length === 0 || qs.some((q) => !q.prompt.trim() || q.choices.some((c) => !c.text.trim()));

  const save = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/admin/quiz-questions', { method: 'PUT', headers: { ...adminHeaders(), 'content-type': 'application/json' }, body: JSON.stringify(qs) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.issues?.[0]?.message ?? body.error ?? String(r.status));
      setDirty(false);
      setMsg({ kind: 'ok', text: th.editor.saved });
    } catch (e) {
      setMsg({ kind: 'err', text: `${th.editor.saveFailed}${e instanceof Error ? e.message : ''}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminPage
      title={th.quizEditor.title}
      back={[{ to: '/admin/games/quiz', label: th.games.allPackages }, { to: '/admin', label: th.admin.backToRoom }]}
      footer={
        <>
          <p role="status" className={`mr-auto font-semibold ${msg?.kind === 'err' ? 'text-[#FFB4B4]' : 'text-white'}`}>{msg?.text ?? (dirty ? (invalid ? th.quizEditor.fillAll : th.editor.unsaved) : '')}</p>
          <Button3D disabled={!dirty || busy || invalid} onClick={save}>{busy ? th.editor.saving : th.editor.save}</Button3D>
        </>
      }
    >
        {!qs ? (
          <BlossomPanel size="sm"><p className="py-4 text-center font-semibold">{msg ? msg.text : th.editor.loading}</p></BlossomPanel>
        ) : (
          qs.map((q, qi) => (
            <BlossomPanel key={q.id} title={th.editor.questionN(qi + 1)} className="space-y-3">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button aria-label={th.editor.up} disabled={qi === 0} onClick={() => move(qi, -1)} className="size-10 rounded-lg border-[3px] border-ink bg-cream font-bold disabled:opacity-40">↑</button>
                <button aria-label={th.editor.down} disabled={qi === qs.length - 1} onClick={() => move(qi, 1)} className="size-10 rounded-lg border-[3px] border-ink bg-cream font-bold disabled:opacity-40">↓</button>
                <button
                  disabled={qs.length === 1}
                  onClick={() => { if (deleting !== q.id) return setDeleting(q.id); setDeleting(null); edit(qs.filter((_, k) => k !== qi)); }}
                  onBlur={() => setDeleting(null)}
                  className="h-10 rounded-lg border-[3px] border-ink bg-stop px-3 font-semibold text-white disabled:opacity-40"
                >
                  {deleting === q.id ? th.editor.confirmDelete : th.editor.remove}
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">{th.editor.prompt}</span>
                  <input value={q.prompt} maxLength={160} onChange={(e) => patch(qi, { prompt: e.target.value })} placeholder={th.quizEditor.promptPlaceholder} className={input} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">{th.editor.timeLimit}</span>
                  <input type="number" min={3} max={120} value={q.timeLimitSec} onChange={(e) => patch(qi, { timeLimitSec: Math.min(120, Math.max(3, Number(e.target.value) || DEFAULT_TIME)) })} className={`${input} text-center`} />
                </label>
              </div>
              <fieldset className="space-y-2">
                <legend className="mb-1 text-sm font-semibold">{th.quizEditor.choices}</legend>
                {q.choices.map((c, ci) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <input type="radio" name={`correct-${q.id}`} checked={q.correctChoiceId === c.id} onChange={() => patch(qi, { correctChoiceId: c.id })} className="size-6 accent-[#2E9B2E]" aria-label={th.editor.isCorrect} title={th.editor.isCorrect} />
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-cream font-display">{LETTERS[ci]}</span>
                    <input value={c.text} maxLength={60} onChange={(e) => setChoice(qi, ci, e.target.value)} placeholder={th.quizEditor.choicePlaceholder(LETTERS[ci])} className={input} />
                    <button
                      aria-label={th.editor.remove}
                      disabled={q.choices.length <= 2}
                      onClick={() => {
                        const choices = q.choices.filter((_, k) => k !== ci);
                        patch(qi, { choices, correctChoiceId: choices.some((x) => x.id === q.correctChoiceId) ? q.correctChoiceId : choices[0].id });
                      }}
                      className="size-10 shrink-0 rounded-lg border-[3px] border-ink bg-stop font-bold text-white disabled:opacity-40"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <p className="text-xs opacity-70">{th.quizEditor.correctHint}</p>
                <button disabled={q.choices.length >= 4} onClick={() => patch(qi, { choices: [...q.choices, { id: rid(), text: '' }] })} className="h-10 rounded-lg border-[3px] border-dashed border-ink/50 px-3 font-semibold disabled:opacity-40">
                  {th.quizEditor.addChoice}
                </button>
              </fieldset>
            </BlossomPanel>
          ))
        )}
        {qs && (
          <button disabled={qs.length >= 100} onClick={() => edit([...qs, blank()])} className="h-12 w-full rounded-xl border-[3px] border-dashed border-[#FFE08A] bg-black/25 font-semibold text-[#FFE08A] disabled:opacity-40">
            {th.editor.add}
          </button>
        )}
    </AdminPage>
  );
}
