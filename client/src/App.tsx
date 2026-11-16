import { lazy, Suspense } from 'react';
import { MotionConfig } from 'framer-motion';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Join from './pages/Join';
import PlayerRoom from './pages/PlayerRoom';
// Host/dev pages load on demand so phones only download the player bundle.
const AdminRoom = lazy(() => import('./pages/AdminRoom'));
const AdminQuestions = lazy(() => import('./pages/AdminQuestions'));
const AdminQuizQuestions = lazy(() => import('./pages/AdminQuizQuestions'));
const AdminGames = lazy(() => import('./pages/AdminGames'));
const AdminGamePackages = lazy(() => import('./pages/AdminGamePackages'));
const AdminReport = lazy(() => import('./pages/AdminReport'));
const PingPage = lazy(() => import('./pages/PingPage'));
const Styleguide = lazy(() => import('./pages/Styleguide'));
import { NightScene } from './design';
import { installAudioUnlock } from './lib/sfx';

installAudioUnlock();

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
    <BrowserRouter>
      <NightScene />
      <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Join />} />
        <Route path="/play" element={<PlayerRoom />} />
        <Route path="/admin" element={<AdminRoom />} />
        <Route path="/admin/questions" element={<AdminQuestions />} />
        <Route path="/admin/quiz-questions" element={<AdminQuizQuestions />} />
        <Route path="/admin/games" element={<AdminGames />} />
        <Route path="/admin/games/:gameId" element={<AdminGamePackages />} />
        <Route path="/admin/report" element={<AdminReport />} />
        <Route path="/ping" element={<PingPage />} />
        <Route path="/styleguide" element={<Styleguide />} />
        <Route path="*" element={<Join />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
    </MotionConfig>
  );
}
