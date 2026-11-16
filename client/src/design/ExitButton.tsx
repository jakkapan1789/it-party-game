import { motion } from 'framer-motion';
import { sfx } from '../lib/sfx';
import { th } from '../i18n/th';
import { exitButtonUrl } from '../lobby/assets';

/** "ออกจากห้อง" button: the red-and-gold plaque art (the label is painted into it). */
export function ExitButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      aria-label={th.lobby.leave}
      onClick={() => {
        sfx.click();
        onClick();
      }}
      whileTap={{ scale: 0.95, y: 2 }}
      whileHover={{ scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      className="exit-btn"
      style={{ backgroundImage: `url(${exitButtonUrl})` }}
    />
  );
}
