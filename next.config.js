/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pg', 'pdfkit'],
  outputFileTracingRoot: __dirname,
};

module.exports = nextConfig;
