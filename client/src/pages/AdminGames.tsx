import { useNavigate } from 'react-router-dom';
import { adminPin } from '../lib/session';
import { GAME_META, useCatalog } from '../lib/packages';
import { th } from '../i18n/th';
import { BlossomPanel } from '../design';
import { AdminPage, NeedLogin } from '../lobby/AdminPage';
import { gameBtnPickUrl, gameBtnQuizUrl, gamesBannerUrl } from '../lobby/assets';

/** Games that have their own button art (title painted in; the counts go on its blank pill). */
const GAME_ART: Record<string, string> = { pickImage: gameBtnPickUrl, quiz: gameBtnQuizUrl };

/** Host page, step 1: pick which game to play. */
export default function AdminGames() {
  const nav = useNavigate();
  const pin = adminPin.get();
  const { games, packages, failed } = useCatalog(!!pin);

  if (!pin) return <NeedLogin title={th.games.title} text={th.editor.needLogin} cta={th.editor.goLogin} />;

  return (
    <AdminPage title={th.games.title} bannerUrl={gamesBannerUrl} backBelow back={[{ to: '/admin', label: th.admin.backToRoom }]}>
      <p className="text-center font-semibold text-white [text-shadow:0_2px_0_var(--color-ink)]">{th.games.help}</p>
      {!games ? (
        <BlossomPanel size="sm"><p className="py-4 text-center font-semibold">{failed ? th.packages.loadFailed : th.editor.loading}</p></BlossomPanel>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2">
          {games.map((g) => {
            const meta = GAME_META[g.id];
            const n = (packages ?? []).filter((p) => p.moduleId === g.id).length;
            const art = GAME_ART[g.id];
            if (art) {
              return (
                <li key={g.id} className="flex items-center">
                  <button onClick={() => nav(`/admin/games/${g.id}`)} aria-label={g.title} className="game-art-btn" style={{ backgroundImage: `url(${art})` }}>
                    <span className="game-art-count">{th.games.counts(g.questions.length, n)}</span>
                  </button>
                </li>
              );
            }
            return (
              <li key={g.id}>
                <button onClick={() => nav(`/admin/games/${g.id}`)} className="block w-full text-left transition hover:-translate-y-0.5 active:translate-y-0.5">
                  <BlossomPanel title={g.title} className="h-full">
                    <span className="flex items-center gap-4">
                      <span className="grid size-16 shrink-0 place-items-center rounded-2xl border-[3px] border-[#E9B44C] bg-white text-4xl shadow-[0_3px_0_#C98A12]" aria-hidden>{meta?.icon ?? '🎮'}</span>
                      <span className="min-w-0 flex-1">
                        {meta && <span className="block text-sm font-semibold opacity-80">{meta.blurb}</span>}
                        <span className="mt-1 block text-sm font-bold text-[#8A4B00]">{th.games.counts(g.questions.length, n)}</span>
                      </span>
                      <span aria-hidden className="font-display text-3xl text-[#C4161C]">›</span>
                    </span>
                  </BlossomPanel>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </AdminPage>
  );
}
