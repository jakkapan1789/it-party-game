import type { ClientGameModule } from '../../core/GameModule';
import PlayerView from './PlayerView';
import HostView from './HostView';

export const quizClient: ClientGameModule = { id: 'quiz', PlayerView, HostView };
