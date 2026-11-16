import type { ClientGameModule } from '../../core/GameModule';
import PlayerView from './PlayerView';
import HostView from './HostView';

export const pickImageClient: ClientGameModule = { id: 'pickImage', PlayerView, HostView };
