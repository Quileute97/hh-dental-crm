import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Plugin tự động tạo 200.html từ index.html cho Cloudflare Pages SPA fallback
function spaFallbackPlugin() {
  return {
    name: 'spa-fallback-plugin',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const indexPath = path.join(distDir, 'index.html');
      const fallbackPath = path.join(distDir, '200.html');
      if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, fallbackPath);
        console.log('✓ Generated 200.html for Cloudflare Pages SPA fallback');
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), spaFallbackPlugin()],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://cbumyrnukqqznfizcgwi.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('sb_publishable_9HMdUlPmoyyVvGClSVUG7Q_pYyxErsI')
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-supabase': ['@supabase/supabase-js']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: false
  }
});
