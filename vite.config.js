import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // host: true permite acessar pelo celular na mesma rede Wi-Fi
    // (use o endereço "Network" que aparece no terminal)
    host: true,
    open: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
});
