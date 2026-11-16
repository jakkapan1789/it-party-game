import type { ComponentType } from 'react';
import type { PlayerAnswerPayload } from '@ng/shared';
import type { FeedState } from './useGameFeed';

export interface PlayerViewProps {
  feed: FeedState;
  submitAnswer: (payload: PlayerAnswerPayload) => void;
}
export interface HostViewProps {
  feed: FeedState;
}

/** Client half of a mini-game: renders QUESTION and REVEAL; the core renders everything else. */
export interface ClientGameModule {
  id: string;
  PlayerView: ComponentType<PlayerViewProps>;
  HostView: ComponentType<HostViewProps>;
}
