import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { alertBannerUrl } from './assets';

export interface AlertMessage {
  /** Changes for every new alert, so the same text shown twice replays the animation and the timer. */
  id: number;
  text: string;
}

const SHOW_MS = 3000;

/** Temporarily switched off: the lobby doesn't render the toast. Set to true to bring it back. */
export const ALERTS_ENABLED = false;

/**
 * Floating alert on the "Ornate Red Alert Banner" artwork. position: fixed at the bottom of the
 * screen, so it never pushes the inputs or the button (and lets taps through). Slides up a little
 * while fading in over 250 ms, stays ~3 s, then fades out and calls onDone.
 */
export function AlertToast({ alert, onDone }: { alert: AlertMessage | null; onDone: () => void }) {
  useEffect(() => {
    if (!alert) return;
    const t = window.setTimeout(onDone, SHOW_MS);
    return () => window.clearTimeout(t);
  }, [alert, onDone]);

  return (
    <div className="alert-toast-wrap" aria-live="assertive">
      <AnimatePresence>
        {alert && (
          <motion.div
            key={alert.id}
            role="alert"
            className="alert-toast"
            style={{ backgroundImage: `url(${alertBannerUrl})` }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <p className="alert-toast-text">{alert.text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
