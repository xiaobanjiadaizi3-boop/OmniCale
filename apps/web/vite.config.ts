import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages は https://<user>.github.io/OmniCale/ で配信されるため、
  // アセットの参照先をリポジトリ名のサブパスに合わせる必要がある。
  base: '/OmniCale/',
  server: { port: 5173 },
});
