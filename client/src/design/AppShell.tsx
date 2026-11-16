import { createContext, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { th } from '../i18n/th';
import { GameBackdrop } from '../lobby/GameBackdrop';

const SlotContext = createContext<HTMLElement | null>(null);

interface ShellProps {
  /** Left side of the top bar (room code, score pills…). The mute button is always added on the right. */
  header: ReactNode;
  children: ReactNode;
}

/**
 * Phone app layout: top bar and bottom bar are pinned, the content sits between them and
 * does not scroll on screens it fits (it only scrolls as a fallback, e.g. keyboard open).
 * Screens put their main action in the bottom bar with <BottomAction>.
 */
export function AppShell({ header, children }: ShellProps) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  return (
    <SlotContext.Provider value={slot}>
      <GameBackdrop />
      <div className="app-shell">
        {/* no bar behind the header: the scoreboard frame (StatBar) sits straight on the painted scene */}
        <header className="app-bar-top z-10 shrink-0">
          <div className="mx-auto w-full max-w-md px-3 pt-1">{header}</div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-4 px-4 py-4">{children}</div>
        </main>

        {/* hidden while no screen has put anything in the slot */}
        <footer className="app-bar-bottom night-bar night-bar-bottom z-10 shrink-0 has-[>.bar-slot:empty]:hidden">
          <div className="gold-trim" />
          <div ref={setSlot} className="bar-slot mx-auto w-full max-w-md px-4 pt-3" />
        </footer>
      </div>
    </SlotContext.Provider>
  );
}

/** Renders its children in the pinned bottom bar of the surrounding AppShell (a transparent bar: the scene shows through). */
export function BottomAction({ children }: { children: ReactNode }) {
  const slot = useContext(SlotContext);
  return slot ? createPortal(children, slot) : null;
}

/** Plain outlined screen heading (replaces the old ribbon on the player side). */
export function ScreenTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="text-center">
      <h1 className="text-outline text-4xl leading-tight">{children}</h1>
      {sub && <p className="mt-1 font-semibold text-white [text-shadow:0_2px_0_var(--color-ink)]">{sub}</p>}
    </div>
  );
}

/** Room code chip for the top bar: small label above big monospace-ish digits. */
export function RoomChip({ code }: { code: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs leading-tight text-white/70">{th.lobby.roomCode}</span>
      <span className="rounded-lg border-[3px] border-ink bg-cream px-2 font-display text-2xl leading-8 tracking-[0.12em]">{code}</span>
    </div>
  );
}
