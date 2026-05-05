import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/m16-fsm-editor/',
  plugins: [react()],
})