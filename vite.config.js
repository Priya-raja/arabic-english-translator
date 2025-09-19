import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: 'public/manifest.json', dest: '.' },
        { src: 'public/icons', dest: '.' },
        { src: 'src/gemini-service.js', dest: '.' },
        { src: 'src/content/content.css', dest: '.' }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'src/popup/main.jsx'),
        background: path.resolve(__dirname, 'src/background/background.js'),
        content: path.resolve(__dirname, 'src/content/content.js'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background.js'
          if (chunkInfo.name === 'content') return 'content.js'
          if (chunkInfo.name === 'popup') return 'assets/popup.js'
          return 'assets/[name].js'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name][extname]'
      }
    }
  }
})