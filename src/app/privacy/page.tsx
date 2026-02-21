import React from 'react';
import Link from 'next/link';

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
                    <span>←</span> Back to Map
                </Link>

                <h1 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '20px' }}>Privacy Policy</h1>

                <section style={{ marginBottom: '30px', lineHeight: '1.6' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '15px' }}>개인정보 처리방침 (Korean)</h2>
                    <p>JapanRailNote는 사용자의 개인정보를 소중하게 생각합니다.</p>
                    <ul style={{ paddingLeft: '20px' }}>
                        <li><strong>데이터 수집:</strong> 본 서비스는 Google Analytics를 사용하여 방문자의 이용 행태를 분석합니다.</li>
                        <li><strong>쿠키 사용:</strong> 맞춤형 광고 제공을 위해 Google AdSense를 사용하며, 이 과정에서 쿠키가 사용될 수 있습니다.</li>
                        <li><strong>경로 기록:</strong> 사용자가 작성한 이동 경로는 브라우저의 로컬 스토리지(LocalStorage)에 저장되며, 서버로 전송되거나 수집되지 않습니다.</li>
                    </ul>
                </section>

                <section style={{ marginBottom: '30px', lineHeight: '1.6' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '15px' }}>プライバシーポリシー (Japanese)</h2>
                    <p>JapanRailNoteは、利用者の個人情報を保護하기 위해 최선을 다합니다.</p>
                    <ul style={{ paddingLeft: '20px' }}>
                        <li><strong>Google アナリティクス:</strong> 当サイトでは、サイトの利用状況を把握するためにGoogle アナリティクスを使用しています。</li>
                        <li><strong>Google アドセンス:</strong> 第三者配信事業者（Googleなど）がクッキーを使用して、ユーザーが当サイトや他の 사이트을 방문한 정보를 기반으로 광고를 게재합니다.</li>
                    </ul>
                </section>

                <section style={{ marginBottom: '30px', lineHeight: '1.6' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '15px' }}>Privacy Policy (English)</h2>
                    <p>Your privacy is important to us.</p>
                    <ul style={{ paddingLeft: '20px' }}>
                        <li><strong>AdSense:</strong> Third party vendors, including Google, use cookies to serve ads based on a user's prior visits to your website or other websites.</li>
                        <li><strong>Analytics:</strong> This site uses Google Analytics to track and report website traffic.</li>
                    </ul>
                </section>

                <footer style={{ marginTop: '60px', textAlign: 'center', fontSize: '12px', color: '#999' }}>
                    Last updated: 2026.02.22
                </footer>
            </div>
        </main>
    );
}
