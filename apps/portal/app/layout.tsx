import { constructMetadata } from '@ppotal/ui';
import { Analytics } from '@ppotal/ui';

export const metadata = constructMetadata({
  title: 'PPLANER | Unified Travel Portal',
  description: 'The master portal for pplaner.com - Access JP Rail, Region Level, and P-Plan.',
  url: 'https://www.pplaner.com',
});

import { AuthProvider } from '@ppotal/ui';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet" />
        <Analytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
