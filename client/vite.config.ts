import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

const target = `http://localhost:${process.env.PORT ?? 3000}`;

export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    host: true,
    proxy: {
      '/socket.io': { target, ws: true },
      '/api': target,
      '/uploads': target,
    },
  },
});
