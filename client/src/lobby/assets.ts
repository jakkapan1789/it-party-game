import avatar0 from './assets/avatar-0.webp';
import avatar1 from './assets/avatar-1.webp';
import avatar2 from './assets/avatar-2.webp';
import avatar3 from './assets/avatar-3.webp';
import avatar4 from './assets/avatar-4.webp';
import avatar5 from './assets/avatar-5.webp';
// Player avatars: gold-framed portraits, 256px. 0–2 from prep-asset/Chibi Cheer Squad Avatars.png (boy, girl, lucky cat),
// 3–5 from prep-asset/Chibi Fantasy Trio Avatars.png (silver-haired knight, witch, aviator panda).
export const avatarUrls = [avatar0, avatar1, avatar2, avatar3, avatar4, avatar5];
// Painted lobby scene (from prep-asset/background.png, 966×1628, re-encoded to WebP).
export { default as sceneUrl } from './assets/bg-scene.webp';
// Cherry-blossom branch for the top-left corner (from prep-asset/Cherry Blossom Corner with Falling Petals.png, cropped to the branch, 720px wide).
export { default as blossomCornerUrl } from './assets/blossom-corner.webp';
// Characters (from prep-asset/Cheerful Chibi Adventurers and Lucky Cat.png, cut into three, 0.75x). Composed in lobby.css (.heroes).
export { default as heroBoyUrl } from './assets/hero-boy.webp';
export { default as heroCatUrl } from './assets/hero-cat.webp';
export { default as heroGirlUrl } from './assets/hero-girl.webp';
// Alert banner (from prep-asset/Ornate Red Alert Banner with Cherry Blossoms.png, trimmed, 1000px wide).
export { default as alertBannerUrl } from './assets/alert-banner.webp';
// Host players panel: gold cherry-blossom frame (9-slice, tab removed) + the red title tab, from prep-asset/Glossy Golden Cherry Blossom UI Frame.png.
export { default as playersFrameUrl } from './assets/players-frame.webp';
export { default as playersTabUrl } from './assets/players-tab.webp';
// Player waiting room / profile dialog frame: prep-asset/Chibi Chinese Dragon Game Frame.png, trimmed to 1048×1398 and
// saved 760px wide, with its two lanterns cut out (refilled with plain border) and saved as separate overlays. See DragonFrame.
export { default as dragonFrameUrl } from './assets/dragon-frame.webp';
export { default as dragonLanternLUrl } from './assets/dragon-lantern-l.webp';
export { default as dragonLanternRUrl } from './assets/dragon-lantern-r.webp';
// In-game scoreboard frame (from prep-asset/Ornate Chinese-Inspired Scoreboard UI Frame.png, trimmed 2102×681, saved 900px wide).
export { default as scoreboardFrameUrl } from './assets/scoreboard-frame.webp';
// Quiz picture frames A and B (from prep-asset/Ornate A and B Quiz Frames.png): cream window made transparent, 640px wide. See QuizFrame.
export { default as quizFrameAUrl } from './assets/quiz-frame-a.webp';
export { default as quizFrameBUrl } from './assets/quiz-frame-b.webp';
// Answer/submit banner (from prep-asset/Glossy Golden Dragon Game Banner.png, trimmed 2079×577, 900px wide; the green panel is blank, text goes on top).
export { default as submitBannerUrl } from './assets/submit-banner.webp';
// Result card frame (from prep-asset/Glossy Gold-and-Red Game UI Frame.png, trimmed 1709×858, 760px wide; no text in the art). See ResultFrame.
export { default as resultFrameUrl } from './assets/result-frame.webp';
// Question banner (from prep-asset/Chinese Festival Game Banner Frame.png, trimmed 2016×444, 900px wide; blank red plate). See PromptBanner.
export { default as promptBannerUrl } from './assets/prompt-banner.webp';
// "Waiting for the host" banner (from prep-asset/Ornate Gold and Purple Game Banner.png: black background keyed out, trimmed 1996×527, 800px wide; blank purple plate). See WaitBanner.
export { default as waitBannerUrl } from './assets/wait-banner.webp';
// Countdown bar frame (from prep-asset/Glossy Gold Progress Bar with Five Rings.png, trimmed 1961×200, 900px wide): the purple track and ring interiors are transparent so the fill shows through. See TimerBar.
export { default as timerFrameUrl } from './assets/timer-frame.webp';
// Notice card (from prep-asset/Chibi Hero Ornate Message Banner.png, trimmed 1210×1138, 700px wide; no text in the art). See NoticeBanner.
export { default as noticeBannerUrl } from './assets/notice-banner.webp';
// Leave-room button (from prep-asset/Ornate Red Exit Room Button.png, trimmed 2068×392, 800px wide; the label is painted in). See ExitButton.
export { default as exitButtonUrl } from './assets/exit-button.webp';
// Final leaderboard frame (from prep-asset/Chibi Cat Leaderboard Frame.png, trimmed 1179×1269, 720px wide). See LeaderFrame.
export { default as leaderFrameUrl } from './assets/leader-frame.webp';
import rank1 from './assets/rank-1.webp';
import rank2 from './assets/rank-2.webp';
import rank3 from './assets/rank-3.webp';
import rank4 from './assets/rank-4.webp';
// Rank medals (from prep-asset/Glossy Game Rank Badge Collection.png): 1st crown, 2nd silver, 3rd bronze, 4th+ coin; 510×572 art, disc centred at 50% / 59.4%. See RankBadge.
export const rankBadgeUrls = [rank1, rank2, rank3, rank4];
// Room-code entry panel (from prep-asset/Festive Thai Room Code Panel.png, trimmed, 1000px wide).
export { default as roomCodePanelUrl } from './assets/room-code-panel.webp';
// Nickname entry panel (from prep-asset/Thai Fantasy Nickname Input Panel.png, trimmed, 1000px wide).
export { default as nicknamePanelUrl } from './assets/nickname-panel.webp';
// Join button: the dragon "เข้าร่วม" plaque (from prep-asset/Chibi Dragon Join Button.png, trimmed, 1000px wide; the label is part of the art).
export { default as joinButtonUrl } from './assets/join-button.webp';
// Waiting-room banner (from prep-asset/Ornate Thai Game Lobby Banner.png, trimmed, 1000px wide; says "ห้องรอเข้าร่วมเกม").
export { default as lobbyBannerUrl } from './assets/lobby-banner.webp';
// Title banner: the IT PARTY logo (from prep-asset/Neon IT Party Tech Banner.png, trimmed, 1000px wide).
export { default as titleBannerUrl } from './assets/title-banner.webp';

import scorePill from './assets/score-pill.webp';
// Score pill (from prep-asset/Glossy Purple Star Badge Frame.png): gold-rimmed purple capsule with a star on the left; the number is HTML over it.
export const scorePillUrl = scorePill;

import playersSheet from './assets/players-sheet.webp';
// Full-screen player-info sheet (from prep-asset/Chibi Girl Waving in Ornate Gold Frame.png): trimmed 1199×1288, saved at 800 wide. Slices: top 640 / bottom 288 art units. See PlayersSheet.
export const playersSheetUrl = playersSheet;

import gamesBanner from './assets/games-banner.webp';
// Host "pick a game" page title (from prep-asset/Chibi Game Selection Banner.png, trimmed, 900px wide; the label "เลือกเกม" is painted in).
export const gamesBannerUrl = gamesBanner;

import gameBtnPick from './assets/game-btn-pick.webp';
// Host games page: the "เกมเลือกภาพ" card (from prep-asset/Neon Thai Image Selection Game Button.png, trimmed 2038×651, 900px wide).
// The counts pill was painted over (blank) so the live "N ข้อ · M ชุดเกม" text goes on top. See .game-art-btn.
export const gameBtnPickUrl = gameBtnPick;
import gameBtnQuiz from './assets/game-btn-quiz.webp';
// Same for "เกมตอบคำถาม" (from prep-asset/Neon Thai Quiz Game Banner.png, trimmed 2044×651, 900px wide; counts pill blanked).
export const gameBtnQuizUrl = gameBtnQuiz;
import pickPackagesBanner from './assets/pick-packages-banner.webp';
// "เกมเลือกภาพ" packages page title (from prep-asset/Neon Thai Picture Game Badge.png, trimmed 2081×651, 900px wide).
// Its yellow "สร้างชุดเกมใหม่" pill (x 35.5–82.1%, y 63.7–89%) is a button over the art. See AdminGamePackages.
export const pickPackagesBannerUrl = pickPackagesBanner;
import neonPanel from './assets/neon-panel.webp';
// Packages panel (from prep-asset/Futuristic Neon Game UI Panel.png, trimmed 1137×1238, kept at full size so the
// 9-slice numbers are art pixels: top 300 (tab + chamfers), bottom 270 (wave corners), sides not sliced). See NeonPanel.
export const neonPanelUrl = neonPanel;
