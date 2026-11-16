import { useLayoutEffect } from 'react';
import { FantasyBackground } from './FantasyBackground';
import { usePageVisible } from './useLobbyMotion';
import './lobby.css';

interface Props {
  /** Calm scene (in-game): no fireworks, lanterns or corner branches. false = the full lobby scene. */
  calm?: boolean;
  /** How much the scene is darkened behind the content. */
  dim?: 'full' | 'light' | 'none';
}

/**
 * Backdrop for pages that sit on the painted scene (in-game player pages, host screens): the lobby's
 * scene, dimmed so cards and text stay easy to read.
 */
export function GameBackdrop({ calm = true, dim = 'full' }: Props) {
  const visible = usePageVisible();

  // The scene replaces the app-wide night scene (hidden by .lobby-active).
  useLayoutEffect(() => {
    document.documentElement.classList.add('lobby-active');
    return () => document.documentElement.classList.remove('lobby-active');
  }, []);

  return (
    <div className={`lobby-root ${visible ? '' : 'is-paused'}`} aria-hidden>
      <FantasyBackground running={visible} calm={calm} dim={dim} />
    </div>
  );
}
