
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'react',
  publicDir: '../css',
  build: {
    outDir: '../build',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'react/index.html')
      },
      output: {
        // Generate a single HTML file with inlined assets
        inlineDynamicImports: true,
        manualChunks: undefined
      }
    },
    // Inline all CSS and JS into the HTML file
    assetsInlineLimit: 100000000, // Very large limit to inline everything
    cssCodeSplit: false
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: 'all'
  },
  css: {
    modules: {
      localsConvention: 'camelCase'
    },
    preprocessorOptions: {
      scss: {
        additionalData: `@import "./css/common.css";`
      }
    }
  }
})
