import { motion } from 'framer-motion';
import { sfx } from '../lib/sfx';
import { th } from '../i18n/th';
import { joinButtonUrl } from './assets';

interface Props {
  /** Request in flight. */
  loading: boolean;
  form?: string;
}

/**
 * Submit button drawn by the "Ornate Thai Join Button" artwork (the label is painted into the art).
 * Always enabled and green (incomplete fields are flagged by the form, not by this button);
 * loading = dimmed with a spinner, pressed = sinks.
 */
export function JoinButton({ loading, form }: Props) {
  const inactive = loading;
  return (
    <motion.button
      type="submit"
      form={form}
      disabled={inactive}
      aria-label={loading ? th.join.joining : th.join.submit}
      aria-busy={loading || undefined}
      onClick={() => sfx.click()}
      whileHover={inactive ? undefined : { scale: 1.02 }}
      whileTap={inactive ? undefined : { scale: 0.95, y: 3 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      className={`join-art ${loading ? 'is-loading' : ''}`}
      style={{ backgroundImage: `url(${joinButtonUrl})` }}
    >
      {loading && <span className="join-art-spinner" aria-hidden />}
    </motion.button>
  );
}
