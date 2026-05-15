import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * PPLANER: Web 전용 루트 HTML 템플릿
 * 모바일 브라우저에서 데스크탑 사이즈로 보이는 현상을 방지하기 위해 
 * 올바른 viewport 설정과 기본 CSS를 주입합니다.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />

        {/* 
          웹에서 react-native의 ScrollView가 정상 작동하도록 스타일 초기화 
          및 루트 컨테이너를 전체 화면으로 설정합니다.
        */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: responsiveStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveStyles = `
body {
  overflow: hidden;
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
}

#root, body, html {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* react-native-web 루트 스타일 강제 적용 */
[data-contents="true"], .css-view-175oi2r {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100% !important;
  height: 100% !important;
}
`;
