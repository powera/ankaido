
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react({
      // Configure JSX runtime to use automatic runtime
      jsxRuntime: 'automatic',
      // Ensure we don't need explicit imports for JSX
      jsxImportSource: 'react',
      // Disable fast refresh during development if causing issues
      fastRefresh: true,
    }),
    viteSingleFile()
  ],
  root: 'react',
  publicDir: 'public',
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
        manualChunks: undefined,
        assetFileNames: '[name].[ext]',
        entryFileNames: '[name].js'
      }
    },
    // Inline all CSS and JS into the HTML file
    assetsInlineLimit: 100000000, // Very large limit to inline everything
    cssCodeSplit: false,
    minify: 'esbuild'
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    proxy: {
      '/api': {
        target: 'http://localhost:9123',
        changeOrigin: true,
        secure: false
      }
    }
  },
  css: {
    modules: {
      localsConvention: 'camelCase'
    },
    preprocessorOptions: {
      scss: {
        // Remove the incorrect CSS import
      }
    }
  },
  resolve: {
    alias: {
      // Add an alias for the Components directory to make imports cleaner
      '@components': resolve(__dirname, 'react/Components'),
      '@modes': resolve(__dirname, 'react/Modes')
    }
  },
  esbuild: {
    // Ensure JSX is properly handled
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment'
  }
})
