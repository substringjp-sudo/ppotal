import { constructMetadata } from '@ppotal/ui';

export const metadata = constructMetadata({
  title: 'PPOTAL 통합 계정 관리 - PPLANER Unified Account',
  description: 'PPOTAL 통합 계정 프로필 관리, 비밀번호 재설정, 연동 서비스(JP Rail, Regionevel, P-Plan) 확인 및 회원 탈퇴를 진행할 수 있습니다.',
  url: 'https://www.pplaner.com/account',
});

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
