import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "About & Credits | JapanRailNote",
    description: "JapanRailNote 서비스 소개 및 데이터 출처 정보",
};

export default function CreditsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
