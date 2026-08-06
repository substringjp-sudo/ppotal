import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: [
                '/',
                '/about',
                '/discover',
                '/spot/*',
                '/travelogs/*',
            ],
            disallow: [
                '/wishlist/',
                '/saved/',
                '/trips/',
                '/dashboard/',
                '/profile/',
                '/stats/',
                '/friends/',
                '/edit-trip/',
                '/invite/',
            ],
        },
    };
}
