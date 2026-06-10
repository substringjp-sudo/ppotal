import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: 'https://www.pplaner.com',
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: 'https://www.pplaner.com/pplaner',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        }
    ];
}
