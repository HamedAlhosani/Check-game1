import { defineConfig } from 'tsup';
import path from 'path';

export default defineConfig({
  entry: ['src/server.ts'],
  outDir: 'dist',
  format: ['cjs'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  sourcemap: false,
  minify: false,
  esbuildOptions(options) {
    options.alias = {
      '@check-game/shared': path.resolve(__dirname, '../shared/index.ts'),
    };
  },
  noExternal: ['@check-game/shared'],
});
