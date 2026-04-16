import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { build as esbuildBuild } from 'esbuild';
import { defineConfig } from 'vitest/config';

const root = import.meta.dirname;

function buildExtensionScriptsPlugin() {
  return {
    name: 'build-extension-scripts',
    async closeBundle() {
      const distDir = resolve(root, 'dist');
      if (!existsSync(distDir)) {
        mkdirSync(distDir, { recursive: true });
      }

      await Promise.all([
        esbuildBuild({
          bundle: true,
          entryPoints: [resolve(root, 'src/background/main.ts')],
          format: 'esm',
          legalComments: 'none',
          outfile: resolve(distDir, 'background.js'),
          platform: 'browser',
          sourcemap: true,
          target: ['chrome120'],
          tsconfig: resolve(root, 'tsconfig.json'),
        }),
        esbuildBuild({
          bundle: true,
          entryPoints: [resolve(root, 'src/content/main.ts')],
          format: 'iife',
          legalComments: 'none',
          outfile: resolve(distDir, 'content.js'),
          platform: 'browser',
          sourcemap: true,
          target: ['chrome120'],
          tsconfig: resolve(root, 'tsconfig.json'),
        }),
      ]);

      copyFileSync(
        resolve(root, 'manifest.json'),
        resolve(distDir, 'manifest.json')
      );

      // Copy icons
      const iconsDir = resolve(root, 'icons');
      const distIconsDir = resolve(distDir, 'icons');
      if (existsSync(iconsDir)) {
        if (!existsSync(distIconsDir)) {
          mkdirSync(distIconsDir, { recursive: true });
        }
        for (const file of readdirSync(iconsDir)) {
          copyFileSync(resolve(iconsDir, file), resolve(distIconsDir, file));
        }
      }
    },
  };
}

export default defineConfig({
  root,
  build: {
    emptyOutDir: true,
    outDir: resolve(root, 'dist'),
    rollupOptions: {
      input: {
        popup: resolve(root, 'popup.html'),
      },
    },
    target: 'chrome120',
  },
  plugins: [buildExtensionScriptsPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
