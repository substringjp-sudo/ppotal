import { constructMetadata } from '@ppotal/ui';

export const metadata = constructMetadata({
  title: 'PPOTAL 통합 계정 정책 및 운영 방침 - PPLANER Unified Account Policy',
  description: 'PPOTAL 통합 계정의 생성, 유지, 패밀리 서비스(JP Rail, Regionevel, P-Plan) 간 연동, 그리고 계정 삭제 시의 데이터 영구 파기 방침을 안내합니다.',
  url: 'https://www.pplaner.com/account/policy',
});

export default function AccountPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
