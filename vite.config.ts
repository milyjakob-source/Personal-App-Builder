import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Relative base: works at <user>.github.io/Personal-App-Builder/ regardless of the repo name's casing.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173 },
});
