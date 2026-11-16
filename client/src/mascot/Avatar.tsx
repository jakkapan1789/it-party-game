import { AVATAR_COUNT } from '@ng/shared';
import { avatarUrls } from '../lobby/assets';
export { AVATAR_COUNT };

/**
 * The cheer-squad avatars: three gold-framed portraits (boy, girl, lucky cat). Ids wrap around
 * (`id % AVATAR_COUNT`), so ids from the former 8-avatar set still show something.
 */
export function Avatar({ id, size = 64 }: { id: number; size?: number }) {
  const i = ((id % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT;
  return <img src={avatarUrls[i]} width={size} height={size} alt={`avatar ${i + 1}`} draggable={false} className="avatar-img" style={{ objectFit: 'contain' }} />;
}
