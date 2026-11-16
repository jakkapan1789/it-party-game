import { useEffect, useRef, useState } from 'react';
import { adminPin } from '../lib/session';
import { th } from '../i18n/th';
import { BlossomPanel, Button3D } from '../design';
import { AdminPage, NeedLogin } from '../lobby/AdminPage';

interface Img {
  id: string;
  src: string;
}
interface Q {
  id: string;
  prompt: string;
  images: [Img, Img];
  correctImageId: string;
  timeLimitSec: number;
}

const DEFAULT_TIME = 10;
const newId = () => `q${Math.random().toString(36).slice(2, 8)}`;
const blank = (): Q => ({
  id: newId(),
  prompt: '',
  images: [{ id: 'a', src: '' }, { id: 'b', src: '' }],
  correctImageId: 'a',
  timeLimitSec: DEFAULT_TIME,
});

/** Accepts the documented JSON shape; returns null for anything unusable. */
function normalize(raw: unknown): Q | null {
  const q = raw as Partial<Q> | null;
  if (!q || typeof q.prompt !== 'string' || !Array.isArray(q.images) || q.images.length !== 2) return null;
  const imgs = q.images.map((i) => ({ id: String(i?.id ?? ''), src: String(i?.src ?? '') }));
  if (imgs.some((i) => !i.id || !i.src) || imgs[0].id === imgs[1].id) return null;
  const correct = imgs.some((i) => i.id === q.correctImageId) ? String(q.correctImageId) : imgs[0].id;
  const t = Number(q.timeLimitSec);
  return {
    id: typeof q.id === 'string' && q.id ? q.id : newId(),
    prompt: q.prompt,
    images: [imgs[0], imgs[1]],
    correctImageId: correct,
    timeLimitSec: t > 0 && t <= 120 ? t : DEFAULT_TIME,
  };
}

export default function AdminQuestions() {
  const pin = adminPin.get();
  const [qs, setQs] = useState<Q[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // 'save' | `${qIndex}:${imgIndex}`
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const headers = { 'x-admin-pin': pin ?? '' };

  useEffect(() => {
    if (!pin) return;
    fetch('/api/admin/questions', { headers })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((raw: unknown[]) => setQs(raw.map(normalize).filter((q): q is Q => !!q)))
      .catch(() => setMsg({ kind: 'err', text: th.editor.saveFailed }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  if (!pin) return <NeedLogin title={th.editor.title} text={th.editor.needLogin} cta={th.editor.goLogin} />;

  const edit = (next: Q[]) => {
    setQs(next);
    setDirty(true);
    setMsg(null);
  };
  const patch = (i: number, p: Partial<Q>) => edit(qs!.map((q, k) => (k === i ? { ...q, ...p } : q)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= qs!.length) return;
    const next = [...qs!];
    [next[i], next[j]] = [next[j], next[i]];
    edit(next);
  };

  const upload = async (qi: number, ii: 0 | 1, file: File) => {
    setBusy(`${qi}:${ii}`);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const r = await fetch('/api/admin/upload', { method: 'POST', headers, body: fd });
      if (!r.ok) throw new Error(String(r.status));
      const { src } = (await r.json()) as { src: string };
      const q = qs![qi];
      const images = q.images.map((im, k) => (k === ii ? { ...im, src } : im)) as [Img, Img];
      patch(qi, { images });
    } catch {
      setMsg({ kind: 'err', text: th.editor.uploadFailed });
    } finally {
      setBusy(null);
    }
  };

  const validate = (): string | null => {
    if (!qs!.length) return th.editor.needOne;
    if (qs!.some((q) => !q.prompt.trim())) return th.editor.needPrompt;
    if (qs!.some((q) => q.images.some((i) => !i.src))) return th.editor.needImages;
    return null;
  };

  const save = async () => {
    const problem = validate();
    if (problem) return setMsg({ kind: 'err', text: problem });
    setBusy('save');
    try {
      const r = await fetch('/api/admin/questions', {
        method: 'PUT',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify(qs!.map((q) => ({ ...q, prompt: q.prompt.trim() }))),
      });
      if (!r.ok) {
        const e = (await r.json().catch(() => ({}))) as { issues?: { path: string; message: string }[] };
        const detail = e.issues?.[0] ? `: ${e.issues[0].path} ${e.issues[0].message}` : '';
        throw new Error(detail);
      }
      setDirty(false);
      setMsg({ kind: 'ok', text: th.editor.saved });
    } catch (e) {
      setMsg({ kind: 'err', text: `${th.editor.saveFailed}${e instanceof Error ? e.message : ''}` });
    } finally {
      setBusy(null);
    }
  };

  const importFile = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text());
      if (!Array.isArray(raw)) throw new Error('not an array');
      const ok = raw.map(normalize).filter((q): q is Q => !!q);
      if (!ok.length) throw new Error('empty');
      edit(ok);
      setMsg({ kind: 'ok', text: th.editor.imported(ok.length, raw.length - ok.length) });
    } catch {
      setMsg({ kind: 'err', text: th.editor.importFailed });
    }
  };

  const exportFile = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(qs, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'game1-questions.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminPage
      title={th.editor.title}
      back={[{ to: '/admin/games/pickImage', label: th.games.allPackages }, { to: '/admin', label: th.admin.backToRoom }]}
      footer={qs && (
          <>
            <Button3D variant="alt" className="!text-base" onClick={() => edit([...qs, blank()])}>{th.editor.add}</Button3D>
            <Button3D variant="alt" className="!text-base" onClick={() => fileInput.current?.click()}>{th.editor.importJson}</Button3D>
            <Button3D variant="alt" className="!text-base" onClick={exportFile}>{th.editor.exportJson}</Button3D>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void importFile(f);
              }}
            />
            <div className="ml-auto flex items-center gap-3">
              {dirty && !msg && <span className="text-sm text-white/90">{th.editor.unsaved}</span>}
              <Button3D disabled={busy === 'save' || !dirty} onClick={save}>{busy === 'save' ? th.editor.saving : th.editor.save}</Button3D>
            </div>
            {msg && (
              <p role={msg.kind === 'err' ? 'alert' : 'status'} className={`w-full font-semibold ${msg.kind === 'err' ? 'text-[#FF8A85]' : 'text-[#9BE070]'}`}>
                {msg.text}
              </p>
            )}
          </>
      )}
    >
        {!qs ? (
          <BlossomPanel size="sm"><p className="py-4 text-center font-semibold">{msg ? msg.text : th.editor.loading}</p></BlossomPanel>
        ) : (
          qs.map((q, qi) => (
            <BlossomPanel key={q.id} title={th.editor.questionN(qi + 1)} className="space-y-3">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <IconBtn label={th.editor.up} onClick={() => move(qi, -1)} disabled={qi === 0}>↑</IconBtn>
                <IconBtn label={th.editor.down} onClick={() => move(qi, 1)} disabled={qi === qs.length - 1}>↓</IconBtn>
                <button
                  onClick={() => {
                    if (deleting !== q.id) return setDeleting(q.id);
                    setDeleting(null);
                    edit(qs.filter((_, k) => k !== qi));
                  }}
                  onBlur={() => setDeleting(null)}
                  className="h-10 rounded-lg border-[3px] border-ink bg-stop px-3 font-semibold text-white"
                >
                  {deleting === q.id ? th.editor.confirmDelete : th.editor.remove}
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">{th.editor.prompt}</span>
                  <input
                    value={q.prompt}
                    onChange={(e) => patch(qi, { prompt: e.target.value })}
                    placeholder={th.editor.promptPlaceholder}
                    className="h-11 w-full rounded-xl border-[3px] border-ink bg-white px-3 text-lg outline-none focus:ring-4 focus:ring-[#FFE600]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">{th.editor.timeLimit}</span>
                  <input
                    type="number"
                    min={3}
                    max={120}
                    value={q.timeLimitSec}
                    onChange={(e) => patch(qi, { timeLimitSec: Math.min(120, Math.max(3, Number(e.target.value) || DEFAULT_TIME)) })}
                    className="h-11 w-full rounded-xl border-[3px] border-ink bg-white px-3 text-lg outline-none focus:ring-4 focus:ring-[#FFE600]"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {q.images.map((im, ii) => {
                  const slot = `${qi}:${ii}`;
                  const correct = q.correctImageId === im.id;
                  return (
                    <div key={im.id} className="space-y-2">
                      <p className="text-sm font-semibold">{ii === 0 ? th.editor.imageA : th.editor.imageB}</p>
                      <div className={`grid aspect-square place-items-center overflow-hidden rounded-xl border-[3px] bg-white ${correct ? 'border-go shadow-[0_0_0_3px_var(--color-go)]' : 'border-ink'}`}>
                        {im.src ? <img src={im.src} alt="" className="size-full object-cover" /> : <span className="text-sm opacity-60">{th.editor.noImage}</span>}
                      </div>
                      <label className="block cursor-pointer rounded-lg border-[3px] border-ink bg-alt py-1.5 text-center font-semibold">
                        {busy === slot ? th.editor.uploading : th.editor.upload}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          disabled={busy === slot}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = '';
                            if (f) void upload(qi, ii as 0 | 1, f);
                          }}
                        />
                      </label>
                      <label className="flex items-center gap-2 text-sm font-semibold">
                        <input
                          type="radio"
                          name={`correct-${q.id}`}
                          checked={correct}
                          onChange={() => patch(qi, { correctImageId: im.id })}
                          className="size-5 accent-[#6BCB3C]"
                        />
                        {th.editor.isCorrect}
                      </label>
                    </div>
                  );
                })}
              </div>
            </BlossomPanel>
          ))
        )}
    </AdminPage>
  );
}

function IconBtn({ label, ...rest }: { label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      title={label}
      className="size-10 rounded-lg border-[3px] border-ink bg-white text-lg font-semibold disabled:opacity-40"
      {...rest}
    />
  );
}
