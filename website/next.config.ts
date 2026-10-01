import type { NextConfig } from 'next';

// Static export: `npm run build` writes plain HTML/JS/CSS to out/, which any
// static host (Render static site, Netlify, Vercel, GitHub Pages) can serve.
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
  devIndicators: false,
};

export default nextConfig;
