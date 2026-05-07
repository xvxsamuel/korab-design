import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  plugins: [react(), svgr()],
  server: { port: 5173, open: true },
  build: {
    // Modern target — drops a lot of legacy syntax transforms.
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    // Split React out of the app chunk so it can be cached separately and
    // the app code can be invalidated without re-downloading the framework.
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) {
            return 'react';
          }
        },
      },
    },
  },
});
