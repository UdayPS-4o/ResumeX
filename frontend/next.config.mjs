/** @type {import('next').NextConfig} */
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendPort = process.env.PORT || process.env.FRONTEND_PORT || 3000;

// Pre-compile routes on startup to eliminate cold-start latency
if (process.env.NODE_ENV === 'development') {
  let attempts = 0;
  const ping = () => {
    if (attempts++ > 30) return; // Stop after 15 seconds
    fetch(`http://localhost:${frontendPort}`)
      .then(res => {
        if (!res.ok) setTimeout(ping, 500);
      })
      .catch(() => setTimeout(ping, 500));
  };
  setTimeout(ping, 300);
}

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  // /api/* is proxied by the app/api/[...path] route handler instead of
  // rewrites(): rewrite destinations are resolved at `next build` time, but
  // BACKEND_URL is only set at container runtime, so a rewrite here would
  // permanently bake in the http://localhost fallback.
};

export default nextConfig;
