import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  base: '/', // served at the root of set.shan.wtf
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
