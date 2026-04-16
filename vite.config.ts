import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { build as esbuildBuild } from 'esbuild';
import { defineConfig } from 'vite';

function buildExtensionScriptsPlugin() {
  return {
    name: 'build-extension-scripts',
    async closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      if (!existsSync(distDir)) {
        mkdirSync(distDir, { recursive: true });
      }

      await Promise.all([
        esbuildBuild({
          bundle: true,
          entryPoints: [resolve(__dirname, 'src/background/main.ts')],
          format: 'esm',
          legalComments: 'none',
          outfile: resolve(distDir, 'background.js'),
          platform: 'browser',
          sourcemap: true,
          target: ['chrome120'],
          tsconfig: resolve(__dirname, 'tsconfig.json'),
        }),
        esbuildBuild({
          bundle: true,
          entryPoints: [resolve(__dirname, 'src/content/main.ts')],
          format: 'iife',
          legalComments: 'none',
          outfile: resolve(distDir, 'content.js'),
          platform: 'browser',
          sourcemap: true,
          target: ['chrome120'],
          tsconfig: resolve(__dirname, 'tsconfig.json'),
        }),
      ]);

      copyFileSync(
        resolve(__dirname, 'manifest.json'),
        resolve(distDir, 'manifest.json')
      );

      // Copy icons
      const iconsDir = resolve(__dirname, 'icons');
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
  build: {
    emptyOutDir: true,
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
      },
    },
    target: 'chrome120',
  },
  plugins: [buildExtensionScriptsPlugin()],
  test: {
    globals: true,
  },
});
