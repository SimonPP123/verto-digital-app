/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true
  },
  images: {
    domains: ['lh3.googleusercontent.com'], // Allow Google profile images
  }
};

module.exports = nextConfig; 