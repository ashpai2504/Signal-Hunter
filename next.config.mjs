/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The /api/mentions route reads data/mentions.json at runtime via fs.
  // Tell Next to bundle that file into the serverless function on Vercel.
  outputFileTracingIncludes: {
    "/api/mentions": ["./data/mentions.json"],
  },
};

export default nextConfig;
