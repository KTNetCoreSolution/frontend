import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(fileURLToPath(new URL('.', import.meta.url)), '.'));
  const envType = env.VITE_ENV || 'local';

  if (!env.VITE_CLIENT_URL || !env.VITE_SERVER_API_URL || !env.VITE_MOBILE_CLIENT_URL) {
    throw new Error('VITE_CLIENT_URL, VITE_MOBILE_CLIENT_URL, and VITE_SERVER_API_URL must be defined in .env.[mode]');
  }

  const baseConfig = {
    plugins: [react()],
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
    base: env.VITE_BASE_NAME ? `/${env.VITE_BASE_NAME}/` : '/',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: env.VITE_DEBUG === 'true',
      minify: 'esbuild',
      chunkSizeWarningLimit: 1000,
    },
  };

  let envConfig = {};

  if (envType === 'local') {
    envConfig = {
      server: {
        host: '0.0.0.0',
        port: 5173,
        proxy: {
          '/api': {
            target: env.VITE_SERVER_API_URL, // http://localhost:8080/api
            changeOrigin: true,
            secure: env.VITE_CERT_SECURE === 'true' || false,
          },
          '/mobile': {
            target: env.VITE_CLIENT_URL, // http://localhost:5173
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/mobile/, ''),
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
  };
});