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
