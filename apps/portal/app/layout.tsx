import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PPLANER | The Value of Documenting Travel',
  description: 'Personally record and cherish every moment of your travels. We provide various travel documentation services like jpRail and Regionevel.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
