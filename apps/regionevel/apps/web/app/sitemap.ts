import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: 'https://rgnevel.pplaner.com',
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: 'https://rgnevel.pplaner.com/map',
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: 'https://rgnevel.pplaner.com/list',
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: 'https://rgnevel.pplaner.com/pplaner',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        }
    ];
}
