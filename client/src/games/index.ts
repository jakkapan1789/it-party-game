import type { ClientGameModule } from '../core/GameModule';
import { pickImageClient } from './pickImage';
import { quizClient } from './quiz';

// Register new mini-games here.
const modules: Record<string, ClientGameModule> = {
  [pickImageClient.id]: pickImageClient,
  [quizClient.id]: quizClient,
};
export const getGameModule = (id: string | undefined) => (id ? modules[id] : undefined);
