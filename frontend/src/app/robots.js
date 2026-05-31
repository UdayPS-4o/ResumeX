// Server-generated robots.txt via Next.js Metadata API.
// Accessible at /robots.txt — no physical file needed.
//
// Rules:
//   • Allow indexing of marketing-facing pages: /, /showcase
//   • Block API routes (no value in crawling JSON endpoints)
//   • Block Next.js internals (_next/*)

export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/showcase'],
        disallow: ['/api/', '/_next/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
