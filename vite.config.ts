
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'url'; // Import for ES module __dirname equivalent

// ES module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    // Load .env files from the project root
    const env = loadEnv(mode, '.', '');
    const isProd = mode === 'production';
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      base: isProd ? '/' : '/',
      server: {
        host: true,
        port: 5173,
        proxy: {
          '/api': {
            target: isProd ? 'https://backendpos.manouar.eu' : 'http://192.168.3.192:3001',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, '/api'),
          }
        }
      },
      preview: {
        port: 4173,
      }
    };
});