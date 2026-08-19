/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // The resume templates are plain .tex files read at runtime; tracing does
    // not pick them up on its own.
    outputFileTracingIncludes: {
      '/api/generate': ['./lib/templates/**/*.tex'],
      '/api/compile': ['./lib/templates/**/*.tex'],
      '/resume/[id]': ['./lib/templates/**/*.tex'],
    },
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'lh3.googleusercontent.com' }],
  },
}

export default nextConfig
