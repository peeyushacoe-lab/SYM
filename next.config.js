/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pg', 'pdfkit'],
  outputFileTracingRoot: __dirname,
  // Lets the phone's IP talk to the dev server's hot-reload socket
  // when testing the mobile app over local Wi-Fi.
  allowedDevOrigins: ['192.168.5.247'],
};

module.exports = nextConfig;
