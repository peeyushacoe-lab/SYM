/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3', 'pdfkit'],
  outputFileTracingRoot: __dirname,
};

module.exports = nextConfig;
