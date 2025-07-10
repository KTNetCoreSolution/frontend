import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';

export default defineConfig(({ mode }) => {
  // 환경 변수 로드
  const env = loadEnv(mode, path.resolve(fileURLToPath(new URL('.', import.meta.url)), '.'));
  const envType = env.VITE_ENV || 'local';

  // 필수 환경 변수 검증
  if (!env.VITE_CLIENT_URL || !env.VITE_SERVER_API_URL || !env.VITE_MOBILE_CLIENT_URL) {
    throw new Error('VITE_CLIENT_URL, VITE_MOBILE_CLIENT_URL, and VITE_SERVER_API_URL must be defined in .env.[mode]');
  }

  // 공통 설정
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

  // 환경별 설정
  let envConfig = {};

  if (envType === 'local') {
    // 로컬 PC: HTTP, 프록시
    envConfig = {
      server: {
        host: '0.0.0.0',
        port: 5173,
        proxy: {
          '/api': {
            target: env.VITE_SERVER_API_URL, // http://localhost:8080/api
            changeOrigin: true,
            secure: false,
          },
          '/Mobile': {
            target: env.VITE_CLIENT_URL, // http://localhost:5173
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/Mobile/, ''),
            secure: false,
          },
        },
      },
    };
  } else if (envType === 'dev' || envType === 'prod') {
    // 개발/운영 서버: 빌드만 수행 (Nginx가 서빙)
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