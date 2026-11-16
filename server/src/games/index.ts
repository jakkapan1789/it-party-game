import type { GameModule } from '../core/GameModule';
import { pickImage } from './pickImage';
import { quiz } from './quiz';

// Register new mini-games here.
export const gameModules = new Map<string, GameModule<any>>([
  [pickImage.id, pickImage],
  [quiz.id, quiz],
]);
export const DEFAULT_GAME_ID = pickImage.id;
