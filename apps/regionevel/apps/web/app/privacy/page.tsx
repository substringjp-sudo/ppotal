import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy — Regionevel | 개인정보처리방침 | プライバシーポリシー',
    description: 'Privacy policy for Regionevel — how we handle your data with Google Analytics and AdSense.',
    robots: {
        index: true,
        follow: true,
    },
    other: {
        'google': 'nositelinkssearchbox',
    },
};

export default function PrivacyPage() {
    return (
        <main style={{
            minHeight: '100vh',
            padding: '40px 20px',
            backgroundColor: '#f8f9fa',
            color: '#2c3e50',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
        }}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto',
                backgroundColor: '#fff',
                padding: '40px',
                borderRadius: '24px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
            }}>
                <Link href="/" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    marginBottom: '30px',
                    color: '#3498db',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    gap: '5px'
                }}>
                    <span>←</span> Back to Home
                </Link>

                <h1 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '20px' }}>Privacy Policy</h1>

                <section style={{ marginBottom: '30px', lineHeight: '1.6' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '15px' }}>개인정보 처리방침 (Korean)</h2>
                    <p>Regionevel은 사용자의 개인정보를 소중하게 생각합니다.</p>
                    <ul style={{ paddingLeft: '20px' }}>
                        <li><strong>데이터 수집:</strong> 본 서비스는 Google Analytics를 사용하여 방문자의 이용 행태를 분석합니다.</li>
                        <li><strong>쿠키 및 광고:</strong> 맞춤형 광고 제공을 위해 Google AdSense를 사용하며, 이 과정에서 쿠키가 사용될 수 있습니다. Google의 광고 쿠키 사용으로 Google 및 파트너사는 사용자의 본 사이트 및 타 사이트 방문 정보를 기반으로 맞춤형 광고를 제공합니다.</li>
                        <li><strong>광고 차단:</strong> 사용자는 <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" style={{ color: '#3498db' }}>Google 광고 설정</a> 또는 <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" style={{ color: '#3498db' }}>aboutads.info</a>를 방문하여 개인 맞춤형 광고를 거부할 수 있습니다.</li>
                        <li><strong>여행 기록:</strong> 사용자가 선택하고 입력한 여행 방문 내역(경현치 기록)은 브라우저의 로컬 스토리지 또는 로그인 시 Firebase 데이터베이스에 안전하게 보관되며, 마케팅 등의 다른 용도로 제3자에게 전송 또는 공유되지 않습니다.</li>
                    </ul>
                </section>

                <section style={{ marginBottom: '30px', lineHeight: '1.6' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '15px' }}>プライバシーポリシー (Japanese)</h2>
                    <p>Regionevelは、利用者の個人情報を保護するために最善を尽くします。</p>
                    <ul style={{ paddingLeft: '20px' }}>
                        <li><strong>Google アナリティクス:</strong> 当サイトでは、サイトの利用状況を把握するためにGoogle アナリティクスを使用しています。</li>
                        <li><strong>Google アドセンス:</strong> 当サイトでは、第三者配信事業者（Googleなど）の広告配信サービス「Googleアドセンス」を利用しています。広告クッキーを使用することにより、Googleやそのパートナーはユーザーが当サイトや他のサイトにアクセスした情報に基づいて適切な広告を表示します。</li>
                        <li><strong>広告の無効化:</strong> ユーザーは、<a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" style={{ color: '#3498db' }}>Googleの広告設定</a>または<a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" style={{ color: '#3498db' }}>aboutads.info</a>にアクセスし、パーソナライズ広告を無効にすることができます。</li>
                    </ul>
                </section>

                <section style={{ marginBottom: '30px', lineHeight: '1.6' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '15px' }}>Privacy Policy (English)</h2>
                    <p>Your privacy is important to us.</p>
                    <ul style={{ paddingLeft: '20px' }}>
                        <li><strong>AdSense:</strong> Third party vendors, including Google, use cookies to serve ads based on a user&apos;s prior visits to your website or other websites. Google&apos;s use of advertising cookies enables it and its partners to serve ads to users based on their visit to this site and/or other sites on the Internet.</li>
                        <li><strong>Opt-out:</strong> Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" style={{ color: '#3498db' }}>Google Ads Settings</a> or <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" style={{ color: '#3498db' }}>aboutads.info</a>.</li>
                        <li><strong>Analytics:</strong> This site uses Google Analytics to track and report website traffic.</li>
                    </ul>
                </section>

                <footer style={{ marginTop: '60px', textAlign: 'center', fontSize: '12px', color: '#999' }}>
                    Last updated: 2026.07.08
                </footer>
            </div>
        </main>
    );
}
