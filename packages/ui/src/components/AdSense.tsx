import Script from 'next/script';

interface AdSenseProps {
  /**
   * AdSense 게시자 ID (예: "ca-pub-2007288082586284").
   * 지정하지 않으면 PPLANER 기본 게시자 ID를 사용합니다.
   */
  client?: string;
}

const DEFAULT_CLIENT = 'ca-pub-2007288082586284';

/**
 * Google AdSense 로더 스크립트.
 *
 * 사이트를 AdSense 심사에 연결하려면 이 컴포넌트를 루트 레이아웃 <head>에
 * 배치해야 합니다. 실제 광고 슬롯(<ins class="adsbygoogle">)은 별도로 배치합니다.
 */
export const AdSense: React.FC<AdSenseProps> = ({ client = DEFAULT_CLIENT }) => {
  if (!client) return null;

  return (
    <Script
      id="google-adsense"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      strategy="afterInteractive"
      crossOrigin="anonymous"
    />
  );
};
