/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker optimization
  output: 'standalone',
  
  // Optimize webpack configuration
  webpack: (config, { isServer }) => {
    // Reduce memory usage by limiting cache size
    config.cache = {
      type: 'filesystem',
      maxMemoryGenerations: 1,
    }
    
    return config
  },
  
  images: {
    /**
     * Remote patterns for book cover images
     * - books.google.com: Google Books API thumbnails
     * - covers.openlibrary.org: Open Library covers (legacy)
     * - images.pexels.com: Pexels stock photos
     * - images.unsplash.com: Unsplash stock photos
     * 
     * Note: Google Books returns http:// URLs but we upgrade to https://
     * in the API route for security. Both protocols included as fallback.
     */
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'books.google.com',
        pathname: '/books/**',
      },
      {
        protocol: 'http',
        hostname: 'books.google.com',
        pathname: '/books/**',
      },
      {
        protocol: 'https',
        hostname: 'covers.openlibrary.org',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}

module.exports = nextConfig


