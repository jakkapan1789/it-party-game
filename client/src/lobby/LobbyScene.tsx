import { useLayoutEffect, useState, type ReactNode } from 'react';
import { MotionConfig, motion } from 'framer-motion';
import { bootDelaySec } from '../lib/boot';
import { useThemeColor } from '../lib/themeColor';
import { FantasyBackground } from './FantasyBackground';
import { GameHeader } from './GameHeader';
import { heroBoyUrl, heroCatUrl, heroGirlUrl } from './assets';
import { usePageVisible } from './useLobbyMotion';
import './lobby.css';

interface Props {
  /** The panels that stand in front of the characters; gets the entrance delay (s) to start its own animations after the scene's. */
  children: (delay: number) => ReactNode;
  /** Rendered outside the transformed scroll area, so position: fixed is relative to the screen (alerts, banners). */
  overlay?: ReactNode;
  /** The banner at the top (default: the party title). */
  header?: ReactNode;
  /** The three characters behind the panels (default: shown). */
  heroes?: boolean;
  /** Content placed right under the banner, above the stage (e.g. the room code); gets the entrance delay. */
  top?: (delay: number) => ReactNode;
  /** Content filling the space between the top and the panels (where the characters stand); gets the entrance delay. */
  stage?: (delay: number) => ReactNode;
  /** The screen never scrolls as a whole (only lists inside it do). */
  lockScroll?: boolean;
}

/**
 * The fantasy scene shared by the join screen and the waiting room: painted background with its
 * effects, the title banner, and the three characters standing behind whatever panels `children`
 * renders (those panels cover the characters' lower bodies).
 */
export function LobbyScene({ children, overlay, header = <GameHeader />, heroes = true, top, stage, lockScroll }: Props) {
  const visible = usePageVisible();
  const [delay] = useState(bootDelaySec);

  // The browser's status/address bars take the colour of the scene's night sky at the top edge.
  useThemeColor('#0B1FA0');

  // This screen brings its own scene; hide the app-wide one underneath so it isn't painted twice.
  useLayoutEffect(() => {
    document.documentElement.classList.add('lobby-active');
    return () => document.documentElement.classList.remove('lobby-active');
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className={`lobby-root ${visible ? '' : 'is-paused'}`}>
        <FantasyBackground running={visible} />
        <motion.div
          className={`lobby-scroll ${lockScroll ? 'is-locked' : ''}`}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="lobby-column">
            {header}
            {top?.(delay + 0.1)}
            {/* the characters stand here (when shown), partly hidden behind the first panel */}
            <div className="lobby-stage">
              {stage?.(delay + 0.2)}
              {heroes && (
                <motion.div
                  aria-hidden
                  className="heroes"
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: delay + 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                  <img src={heroBoyUrl} alt="" className="hero hero-boy" draggable={false} />
                  <img src={heroGirlUrl} alt="" className="hero hero-girl" draggable={false} />
                  <img src={heroCatUrl} alt="" className="hero hero-cat" draggable={false} />
                </motion.div>
              )}
            </div>
            {children(delay + 0.25)}
          </div>
        </motion.div>
        {overlay}
      </div>
    </MotionConfig>
  );
}
