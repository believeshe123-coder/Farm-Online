import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const withTrailingSlash = (value) => {
  if (!value) return '/';
  return value.endsWith('/') ? value : `${value}/`;
};

export default defineConfig({
  base: withTrailingSlash(process.env.VITE_BASE_PATH || '/'),
  plugins: [react()],
});
