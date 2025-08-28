import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [glsl()],
  server: {
    host: true, // listen on all addresses, equivalent to 0.0.0.0
    port: 5173,
    strictPort: false,
    hmr: {
      host: 'localhost'
    }
  }
});
