import { Metadata } from 'next';
import { firebaseConfig } from '../config';

interface SeoConfig {
  title: string;
  description: string;
  url: string;
  ogImage?: string;
  keywords?: string[];
}

export function constructMetadata({
  title,
  description,
  url,
  ogImage = '/og-image.png',
  keywords = []
}: SeoConfig): Metadata {
  return {
    metadataBase: new URL(url),
    title,
    description,
    keywords: [...new Set(['PPLANER', 'Travel Tracker', ...keywords])],
    openGraph: {
      title,
      description,
      url,
      siteName: 'PPLANER',
      images: [{ url: ogImage }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    verification: {
      google: process.env.NEXT_PUBLIC_GSC_VERIFICATION || firebaseConfig.googleSearchConsoleVerification,
    },
  };
}
