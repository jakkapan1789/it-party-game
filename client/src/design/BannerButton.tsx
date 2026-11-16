import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { sfx } from '../lib/sfx';
import { submitBannerUrl } from '../lobby/assets';

interface Props {
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

/**
 * Wide green-and-gold dragon banner used as a button: the label is real text laid over the banner's
 * (blank) green panel and sized with the banner (cqw). Disabled = washed out.
 */
export function BannerButton({ disabled, onClick, children }: Props) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={() => {
        sfx.click();
        onClick?.();
      }}
      whileTap={disabled ? undefined : { scale: 0.96, y: 2 }}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      className="banner-btn"
      style={{ backgroundImage: `url(${submitBannerUrl})` }}
    >
      <span className="banner-btn-text">{children}</span>
    </motion.button>
  );
}
