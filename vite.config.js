import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, path.resolve(fileURLToPath(new URL('.', import.meta.url)), '.'));
  const envType = env.VITE_ENV || 'local';
  const baseName = env.VITE_BASE_NAME || ''; // 빈 값 허용
  
  let mobileDomain = env.VITE_MOBILE_DOMAIN || (envType === 'local' ? 'localhost:9090' : null);
  if (envType !== 'local' && !env.VITE_MOBILE_DOMAIN) {
    throw new Error('VITE_MOBILE_DOMAIN must be defined in .env.[mode] for dev or prod environments');
  }

  if (!env.VITE_CLIENT_URL || !env.VITE_SERVER_API_URL || !env.VITE_MOBILE_CLIENT_URL) {
    throw new Error('VITE_CLIENT_URL, VITE_MOBILE_CLIENT_URL, and VITE_SERVER_API_URL must be defined in .env.[mode]');
  }

  const baseConfig = {
    plugins: [
      react(),
    ],
    css: {
      modules: {
        localsConvention: 'camelCase',
      },
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    base: baseName || '/', // VITE_BASE_NAME이 빈 값이면 /
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: env.VITE_DEBUG === 'true',
      minify: 'esbuild',
      chunkSizeWarningLimit: 1000,
    },
    define: {
      __BUILD_HASH__: `'${Date.now()}'`, // 또는 보다 정교한 해시 생성 방법
    },
  };

  let envConfig = {};

  if (envType === 'local') {
    envConfig = {
      server: {
        host: '0.0.0.0',
        port: command === 'serve' && env.npm_lifecycle_event === 'dev:mobile' ? 9090 : 5173,
        proxy: {
          [`${baseName || ''}/api`]: {
            target: env.VITE_SERVER_API_URL,
            changeOrigin: true,
            rewrite: (path) => path.replace(new RegExp(`^${baseName || ''}/api`), '/api'),
            secure: env.VITE_CERT_SECURE === 'true' || false,
          },
        },
      },
    };
  } else if (envType === 'dev' || envType === 'prod') {
    envConfig = {
      build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: env.VITE_DEBUG === 'true',
        minify: 'esbuild',
        chunkSizeWarningLimit: 1000,
      },
    };
  }

  return {
    ...baseConfig,
    ...envConfig,
    define: {
      'import.meta.env.VITE_MOBILE_DOMAIN': JSON.stringify(mobileDomain),
      'import.meta.env.VITE_BASE_NAME': JSON.stringify(baseName),
    },
  };
});