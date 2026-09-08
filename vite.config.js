import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/* The Claude preview launcher assigns a free port via the PORT environment
   variable. Honour it when present, otherwise fall back to 5183 — that is the
   port the Cloudflare Tunnel below forwards to, so `npm run dev` on its own
   keeps working exactly as before. */
const assignedPort = Number(process.env.PORT) || 0;

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: assignedPort || 5183,
    /* Only pin the port when one was assigned to us — if that exact port is
       taken the launcher needs to hear about it rather than silently landing
       on a different one. */
    strictPort: Boolean(assignedPort),

    // Allow Cloudflare Tunnel hostnames
    allowedHosts: [
      'partner-truth-finest-trainer.trycloudflare.com'
    ],
  },
});
