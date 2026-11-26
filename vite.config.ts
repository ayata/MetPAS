import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  const devHost = env.VITE_DEV_HOST ?? 'http://localhost';
  const devPort = Number(env.VITE_DEV_PORT ?? 5173);
  const hostUrl = new URL(devHost);

  if (hostUrl.protocol !== 'http:' || !Number.isInteger(devPort) || devPort < 1 || devPort > 65535) {
    throw new Error('VITE_DEV_HOST must be an HTTP URL and VITE_DEV_PORT must be a valid port number.');
  }

  return {
    plugins: [react()],
    server: {
      host: hostUrl.hostname,
      port: devPort,
      strictPort: true,
    },
  };
});
