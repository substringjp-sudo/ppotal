import Script from 'next/script';
import { firebaseConfig } from '../config';

interface AnalyticsProps {
  gaId?: string | undefined;
}

export const Analytics: React.FC<AnalyticsProps> = ({ gaId = firebaseConfig.googleAnalyticsId }) => {
  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
};
