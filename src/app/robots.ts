import type { MetadataRoute } from 'next';

const robots = (): MetadataRoute.Robots => ({
  rules: {
    userAgent: '*',
    allow: '/',
    disallow: [
      '/api/',
      '/overview',
      '/expenses',
      '/income',
      '/assets',
      '/reports',
      '/debts',
      '/settings',
      '/welcome',
      '/verify-email',
      '/reset-password',
      '/offline',
    ],
  },
  sitemap: 'https://kharji.app/sitemap.xml',
});

export default robots;
