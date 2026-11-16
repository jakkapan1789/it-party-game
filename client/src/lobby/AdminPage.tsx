import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { HostShell } from './HostShell';
import { PageBanner } from '../design/PageBanner';

interface Props {
  title: string;
  /** Pills above the banner (e.g. back to the room). */
  back?: { to: string; label: string }[];
  /** Pinned bar at the bottom (save buttons…). */
  footer?: ReactNode;
  wide?: boolean;
  /** Art banner replacing the red title plate (the title is then only its alt text). */
  bannerUrl?: string;
  /** Extra class for the art banner (size). */
  bannerClass?: string;
  /** Laid over the art banner (e.g. a button on a painted pill), positioned in % of the art. */
  bannerOverlay?: ReactNode;
  /** Put the back pills under the content, centred, instead of above the banner. */
  backBelow?: boolean;
  children: ReactNode;
}

/**
 * Host sub-pages (games, packages, question editors, reports): the same painted scene as the player screens
 * behind, a red-and-gold title plate, and the content in blossom panels.
 */
export function AdminPage({ title, back, footer, wide, bannerUrl, bannerClass = '', bannerOverlay, backBelow, children }: Props) {
  const nav = back && back.length > 0 && (
    <nav className={`no-print flex flex-wrap gap-2 ${backBelow ? 'justify-center pt-2' : ''}`}>
      {back.map((b, i) => (
        <Link key={b.to} to={b.to} className="gold-pill">
          {b.to === '/admin' ? (
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="currentColor"><path d="M12 3 2 11.5h3V21h5.5v-6h3v6H19v-9.5h3L12 3Z" /></svg>
          ) : i === 0 ? '← ' : ''}
          {b.label}
        </Link>
      ))}
    </nav>
  );
  return (
    <HostShell calm>
      <div className="flex min-h-dvh flex-col">
        <main className={`mx-auto w-full flex-1 space-y-5 px-4 pb-8 pt-4 ${wide ? 'max-w-5xl' : 'max-w-3xl'} print:max-w-none print:p-0`}>
          {!backBelow && nav}
          <div className="no-print">
            {bannerUrl ? (
              <div className={`art-banner ${bannerClass}`}>
                <img src={bannerUrl} alt={title} className="block h-auto w-full" draggable={false} />
                {bannerOverlay}
              </div>
            ) : (
              <PageBanner>{title}</PageBanner>
            )}
          </div>
          {children}
          {backBelow && nav}
        </main>
        {/* sticky is inline: .night-bar sets position: relative, which beats the Tailwind utility */}
        {footer && (
          <footer className="no-print night-bar night-bar-bottom z-10 px-4 pb-3 pt-5" style={{ position: 'sticky', bottom: 0 }}>
            <div className="gold-trim absolute inset-x-0 top-0" />
            <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3">{footer}</div>
          </footer>
        )}
      </div>
    </HostShell>
  );
}

/** Shown on any host sub-page opened without the PIN. */
export function NeedLogin({ title, text, cta }: { title: string; text: string; cta: string }) {
  return (
    <AdminPage title={title}>
      <div className="mx-auto max-w-md space-y-4 text-center">
        <p className="card-solid p-4 font-semibold">{text}</p>
        <Link to="/admin" className="gold-pill">{cta}</Link>
      </div>
    </AdminPage>
  );
}
