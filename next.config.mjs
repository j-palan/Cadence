/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep the Node PDF parser in node_modules. Bundling it into a generated
    // server chunk breaks PDF.js's relative lookup for pdf.worker.mjs.
    serverComponentsExternalPackages: ['pdfjs-dist'],
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
