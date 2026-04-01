/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.freesound.org' },
    ],
  },
};

module.exports = nextConfig;
