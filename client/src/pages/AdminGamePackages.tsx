import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { GameInfo, GamePackage } from '@ng/shared';
import { adminPin } from '../lib/session';
import { GAME_META, savePackages, saveSelection, startOnReturn, loadSelection, useCatalog } from '../lib/packages';
import { th } from '../i18n/th';
import { BlossomPanel, Button3D, Card, NeonPanel } from '../design';
import { AdminPage, NeedLogin } from '../lobby/AdminPage';
import { gameBtnPickUrl, gameBtnQuizUrl, pickPackagesBannerUrl } from '../lobby/assets';

const GAME_THUMB: Record<string, string> = { pickImage: gameBtnPickUrl, quiz: gameBtnQuizUrl };
import { sfx } from '../lib/sfx';

/** Games whose packages page has its own title art, with a blank painted pill for the "จัดการชุดเกม" label (box in % of the art). */
const PACKAGES_BANNER: Record<string, { url: string; pill: { l: number; t: number; w: number; h: number } }> = {
  pickImage: { url: pickPackagesBannerUrl, pill: { l: 35.5, t: 63.7, w: 46.6, h: 25.3 } },
};

const ALL = 'all';
const newId = () => `p${Math.random().toString(36).slice(2, 8)}`;
const input = 'h-11 w-full rounded-xl border-[3px] border-ink bg-white px-3 text-lg outline-none focus:ring-4 focus:ring-[#FFE600]';

/** Host page, step 2: the packages of one game. Pick one to read its details, then start (or just use it), or make/edit/delete packages. */
export default function AdminGamePackages() {
  const { gameId = '' } = useParams();
  const nav = useNavigate();
  const pin = adminPin.get();
  const { games, packages, failed, reload } = useCatalog(!!pin);
  const [open, setOpen] = useState<string | null>(null); // package id, or ALL
  const [editing, setEditing] = useState<GamePackage | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null); // row whose ⋮ menu is open
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState(loadSelection);

  if (!pin) return <NeedLogin title={th.games.title} text={th.editor.needLogin} cta={th.editor.goLogin} />;
  const game = games?.find((g) => g.id === gameId);
  const title = game?.title ?? th.games.title;
  const back = [{ to: '/admin/games', label: th.games.allGames }, { to: '/admin', label: th.admin.backToRoom }];
  if (!games || !packages || !game) {
    return (
      <AdminPage title={title} back={back} bannerUrl={PACKAGES_BANNER[gameId]?.url} bannerClass="is-wide">
        <BlossomPanel size="sm"><p className="py-4 text-center font-semibold">{failed || (games && !game) ? th.packages.loadFailed : th.editor.loading}</p></BlossomPanel>
      </AdminPage>
    );
  }

  const mine = packages.filter((p) => p.moduleId === game.id);
  const newPackage = () => setEditing({ id: newId(), name: '', moduleId: game.id, questionIds: game.questions.map((q) => q.id), shuffle: false });
  const art = PACKAGES_BANNER[game.id];
  const canAdd = mine.length < 30;
  const use = (pkg: GamePackage | null, start: boolean) => {
    saveSelection({ moduleId: game.id, packageId: pkg?.id ?? null });
    if (start) startOnReturn.set();
    nav('/admin');
  };
  const persist = async (next: GamePackage[]) => {
    setBusy(true);
    setMsg(null);
    try {
      await savePackages(next);
      reload();
      return true;
    } catch (e) {
      setMsg(`${th.editor.saveFailed}${e instanceof Error ? e.message : ''}`);
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <PackageEditor
        game={game}
        title={title}
        back={back}
        pkg={editing}
        isNew={!packages.some((p) => p.id === editing.id)}
        busy={busy}
        msg={msg}
        onCancel={() => { setEditing(null); setMsg(null); }}
        onSave={async (p) => {
          const saved = { ...p, updatedAt: Date.now() };
          const next = packages.some((x) => x.id === p.id) ? packages.map((x) => (x.id === p.id ? saved : x)) : [...packages, saved];
          if (await persist(next)) { setEditing(null); setOpen(p.id); }
        }}
      />
    );
  }

  const all: { id: string; name: string; pkg: GamePackage | null }[] = [
    { id: ALL, name: th.games.allQuestions, pkg: null },
    ...mine.map((p) => ({ id: p.id, name: p.name, pkg: p })),
  ];
  const q = query.trim().toLowerCase();
  const shown = q ? all.filter((r) => r.name.toLowerCase().includes(q)) : all;
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const pg = Math.min(page, pages - 1);
  const isCurrent = (id: string | null) => (sel?.moduleId ?? games[0].id) === game.id && (sel?.packageId ?? null) === id;
  const labelOf = (id: string) => game.questions.find((x) => x.id === id)?.label;
  const choose = (pkg: GamePackage | null) => {
    sfx.click();
    const next = { moduleId: game.id, packageId: pkg?.id ?? null };
    saveSelection(next);
    setSel(next);
  };

  const row = ({ id, name, pkg }: (typeof all)[number]) => {
    const ids = pkg ? pkg.questionIds.filter((x) => labelOf(x) !== undefined) : game.questions.map((x) => x.id);
    const expanded = open === id;
    const current = isCurrent(pkg?.id ?? null);
    const menuOpen = menu === id;
    return (
      <li key={id} className={`pk-row ${current ? 'is-current' : ''} ${menuOpen ? 'is-menu' : ''}`}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setOpen(expanded ? null : id)} aria-expanded={expanded} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <GameThumb gameId={game.id} />
            <span className="min-w-0 flex-1">
              <span className="pk-name">{name}</span>
              <span className="pk-meta"><LayersIcon />{th.games.questionsN(ids.length)}{pkg?.shuffle ? ` · ${th.games.shuffled}` : ''}</span>
              <span className="pk-meta"><CalendarIcon />{pkg ? (pkg.updatedAt ? th.games.updated(thaiDate(pkg.updatedAt)) : '–') : th.games.wholeBank}</span>
            </span>
          </button>
          {current ? (
            <span className="pk-chosen">{th.games.selected} ✓</span>
          ) : (
            <button type="button" className="pk-use" disabled={ids.length === 0} onClick={() => choose(pkg)}>{th.games.useThis}</button>
          )}
          <div className="relative">
            <button type="button" className="pk-more" aria-label={th.games.more} aria-expanded={menuOpen} onClick={() => { setMenu(menuOpen ? null : id); setDeleting(null); }}>
              <svg viewBox="0 0 4 16" width="5" height="18" aria-hidden><circle cx="2" cy="2" r="2" /><circle cx="2" cy="8" r="2" /><circle cx="2" cy="14" r="2" /></svg>
            </button>
            {menuOpen && (
              <div className="pk-menu" role="menu">
                <button role="menuitem" disabled={ids.length === 0} onClick={() => use(pkg, true)}>▶ {th.admin.start}</button>
                <button role="menuitem" onClick={() => { setOpen(expanded ? null : id); setMenu(null); }}>{expanded ? th.games.hideDetails : th.games.showDetails}</button>
                {pkg && <button role="menuitem" onClick={() => { setMenu(null); setEditing(pkg); }}>✎ {th.games.edit}</button>}
                {pkg && (
                  <button
                    role="menuitem"
                    className="is-danger"
                    onClick={() => {
                      if (deleting !== pkg.id) return setDeleting(pkg.id);
                      setDeleting(null);
                      setMenu(null);
                      void persist(packages.filter((x) => x.id !== pkg.id)).then((ok) => ok && setOpen(null));
                    }}
                  >
                    {deleting === pkg.id ? th.editor.confirmDelete : `🗑 ${th.editor.remove}`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {expanded && (
          <div className="pk-details">
            <p className="text-sm font-bold">{th.games.details}</p>
            <ol className="max-h-56 space-y-1 overflow-y-auto overscroll-contain pr-1">
              {ids.map((qid, i) => (
                <li key={qid} className="flex gap-2 text-sm"><span className="w-6 shrink-0 text-right font-display opacity-60">{i + 1}</span><span className="min-w-0 break-words">{labelOf(qid)}</span></li>
              ))}
            </ol>
            {pkg && pkg.questionIds.length > ids.length && <p className="text-xs font-semibold text-[#B3141C]">{th.games.missing(pkg.questionIds.length - ids.length)}</p>}
            <Button3D className="!min-h-11 !px-5 !text-base" disabled={ids.length === 0} onClick={() => use(pkg, true)}>▶ {th.admin.start}</Button3D>
          </div>
        )}
      </li>
    );
  };

  return (
    <AdminPage
      title={title}
      back={back}
      bannerUrl={art?.url}
      bannerClass="is-wide"
      bannerOverlay={
        art && (
          <span className="art-banner-label" style={{ left: `${art.pill.l}%`, top: `${art.pill.t}%`, width: `${art.pill.w}%`, height: `${art.pill.h}%` }}>
            {th.games.manage}
          </span>
        )
      }
    >
      <p className="text-center text-lg font-bold text-white [text-shadow:0_2px_0_var(--color-ink)]">{th.games.manageFor(game.title)}</p>
      {msg && <p role="alert" className="card-solid p-3 font-semibold text-[#B3141C]">{msg}</p>}
      <NeonPanel title={<><LayersIcon size={22} />{th.games.packagesN(all.length)}</>} className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="pk-search">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>
            <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder={th.games.search} aria-label={th.games.search} />
          </label>
          <button type="button" className="pk-new" disabled={!canAdd} onClick={() => { sfx.click(); newPackage(); }}>
            <span aria-hidden className="text-xl leading-none">+</span>
            {th.games.newPackage.replace(/^\+\s*/, '')}
          </button>
        </div>
        {shown.length === 0 ? (
          <p className="py-6 text-center font-semibold text-[#BFE9FF]">{th.games.noMatch}</p>
        ) : (
          <ul className="space-y-3">{shown.slice(pg * PAGE, pg * PAGE + PAGE).map(row)}</ul>
        )}
        {pages > 1 && (
          <nav className="pk-pages" aria-label="pages">
            <button type="button" aria-label={th.games.prevPage} disabled={pg === 0} onClick={() => setPage(pg - 1)}>‹</button>
            {Array.from({ length: pages }, (_, i) => (
              <button type="button" key={i} aria-label={th.games.page(i + 1)} aria-current={i === pg ? 'page' : undefined} className={i === pg ? 'is-on' : ''} onClick={() => setPage(i)}>{i + 1}</button>
            ))}
            <button type="button" aria-label={th.games.nextPage} disabled={pg === pages - 1} onClick={() => setPage(pg + 1)}>›</button>
          </nav>
        )}
      </NeonPanel>
      <div className="text-center">
        <Link to={GAME_META[game.id]?.editPath ?? '/admin'} className="purple-pill">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="currentColor"><path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25Zm17.7-10.2a1 1 0 0 0 0-1.42l-2.33-2.33a1 1 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.83-1.83Z" /></svg>
          {th.games.editBank}
        </Link>
      </div>
    </AdminPage>
  );
}

const PAGE = 5;
const thaiDate = (t: number) => new Date(t).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

/** The game's own icon, cut out of its button art (the picture / question cards on the left of the button). */
function GameThumb({ gameId }: { gameId: string }) {
  const url = GAME_THUMB[gameId];
  return (
    <span className="pk-thumb" aria-hidden>
      {url ? <span className="pk-thumb-art" style={{ backgroundImage: `url(${url})` }} /> : <span className="text-3xl">{GAME_META[gameId]?.icon ?? '🎮'}</span>}
    </span>
  );
}
function LayersIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden fill="currentColor" className="shrink-0">
      <path d="M12 2 1.5 7.5 12 13l10.5-5.5L12 2Z" /><path d="m3.6 11.3-2.1 1.1L12 18l10.5-5.6-2.1-1.1L12 15.8l-8.4-4.5Z" /><path d="m3.6 15.8-2.1 1.1L12 22.5l10.5-5.6-2.1-1.1L12 20.3l-8.4-4.5Z" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.4" className="shrink-0">
      <rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}

function PackageEditor({ game, title, back, pkg, isNew, busy, msg, onCancel, onSave }: {
  game: GameInfo;
  title: string;
  back: { to: string; label: string }[];
  pkg: GamePackage;
  isNew: boolean;
  busy: boolean;
  msg: string | null;
  onCancel: () => void;
  onSave: (p: GamePackage) => void;
}) {
  const [name, setName] = useState(pkg.name);
  const [shuffle, setShuffle] = useState(pkg.shuffle);
  const [picked, setPicked] = useState(() => new Set(pkg.questionIds));
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const ids = game.questions.filter((q) => picked.has(q.id)).map((q) => q.id); // the game's own order
  const ok = name.trim().length > 0 && ids.length > 0;

  return (
    <AdminPage
      title={title}
      back={back}
      footer={
        <>
          <Button3D variant="alt" className="ml-auto" onClick={onCancel}>{th.games.cancel}</Button3D>
          <Button3D disabled={!ok || busy} onClick={() => onSave({ ...pkg, name: name.trim(), shuffle, questionIds: ids })}>{busy ? th.editor.saving : th.editor.save}</Button3D>
        </>
      }
    >
        <BlossomPanel title={isNew ? th.games.newPackage : th.games.edit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">{th.packages.name}</span>
            <input value={name} maxLength={40} autoFocus onChange={(e) => setName(e.target.value)} placeholder={th.packages.namePlaceholder} className={input} />
          </label>
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} className="size-5 accent-[#6BCB3C]" />
            {th.games.shuffleOption}
          </label>
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="mr-auto text-sm font-semibold">{th.games.pickQuestions(ids.length, game.questions.length)}</span>
              <button onClick={() => setPicked(new Set(game.questions.map((q) => q.id)))} className="h-9 rounded-lg border-[3px] border-ink bg-white px-3 text-sm font-semibold">{th.games.selectAll}</button>
              <button onClick={() => setPicked(new Set())} className="h-9 rounded-lg border-[3px] border-ink bg-white px-3 text-sm font-semibold">{th.games.selectNone}</button>
            </div>
            <ul className="space-y-1">
              {game.questions.map((q, i) => (
                <li key={q.id}>
                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-2 ${picked.has(q.id) ? 'border-[#F7B733] bg-[#FFF3C4]' : 'border-ink/15 bg-white/60'}`}>
                    <input type="checkbox" checked={picked.has(q.id)} onChange={() => toggle(q.id)} className="mt-0.5 size-6 shrink-0 accent-[#2E9B2E]" />
                    <span className="w-6 shrink-0 text-right font-display opacity-60">{i + 1}</span>
                    <span className="min-w-0 break-words">{q.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </BlossomPanel>
        {msg && <p role="alert" className="card-solid p-3 font-semibold text-[#B3141C]">{msg}</p>}
    </AdminPage>
  );
}
