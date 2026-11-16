import { z } from 'zod';
import { AVATAR_COUNT, NICKNAME_MAX, ROOM_CODE_LENGTH } from './types';

const roomCode = z.string().regex(new RegExp(`^\\d{${ROOM_CODE_LENGTH}}$`));

export const playerJoinSchema = z.object({
  roomCode,
  nickname: z.string().trim().min(1).max(NICKNAME_MAX),
  // lenient on purpose: saved sessions and old clients may carry ids from the former 8-avatar set
  avatarId: z.number().int().min(0).max(31),
  playerId: z.string().max(64).optional(),
});

/** Change your name/avatar while waiting in the lobby. Strict on the avatar: only ids that exist now. */
export const playerUpdateSchema = z.object({
  nickname: z.string().trim().min(1).max(NICKNAME_MAX),
  avatarId: z.number().int().min(0).max(AVATAR_COUNT - 1),
});

export const adminAuthSchema = z.object({ pin: z.string().min(1).max(64) });
export const adminReconnectSchema = z.object({ roomCode });
/** `packageId` = a saved package; otherwise every question of `moduleId` (default game if none). */
export const adminStartSchema = z.object({ moduleId: z.string().min(1).max(40).optional(), packageId: z.string().min(1).max(64).optional() }).nullish();
export const packageSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(40),
  moduleId: z.string().min(1).max(40),
  questionIds: z.array(z.string().min(1).max(64)).min(1).max(100),
  shuffle: z.boolean(),
  /** Last saved (ms), shown on the packages page. */
  updatedAt: z.number().int().nonnegative().optional(),
});
export const packagesSchema = z
  .array(packageSchema)
  .max(60)
  .refine((ps) => new Set(ps.map((p) => p.id)).size === ps.length, { message: 'duplicate package id' });
export const adminKickSchema = z.object({ playerId: z.string().min(1).max(64) });

export type AdminStartPayload = z.infer<typeof adminStartSchema>;
export type PlayerJoinPayload = z.infer<typeof playerJoinSchema>;
export type PlayerUpdatePayload = z.infer<typeof playerUpdateSchema>;

export const playerAnswerSchema = z.object({
  questionId: z.string().min(1).max(64),
  /** Picture games send `imageId`, text-choice games `choiceId`; each module validates its own. */
  imageId: z.string().min(1).max(64).optional(),
  choiceId: z.string().min(1).max(64).optional(),
});
export const gameSettingsSchema = z.object({ autoRevealWhenAllAnswered: z.boolean() });

export type PlayerAnswerPayload = z.infer<typeof playerAnswerSchema>;
