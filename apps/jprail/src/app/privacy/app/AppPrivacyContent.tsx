'use client';

import React, { useState } from 'react';
import Link from 'next/link';

type Language = 'ko' | 'en' | 'ja';

export default function AppPrivacyContent() {
    const [lang, setLang] = useState<Language>('ko');

    return (
        <main className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-10">
                {/* Header navigation */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/app"
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition"
                        >
                            <span>←</span> JapanRailNote App
                        </Link>
                        <span className="text-slate-300">|</span>
                        <Link
                            href="/"
                            className="text-sm text-slate-500 hover:text-slate-700 transition"
                        >
                            Web Map
                        </Link>
                    </div>

                    {/* Language Switcher */}
                    <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => setLang('ko')}
                            className={`px-3 py-1.5 rounded-lg transition ${lang === 'ko' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            한국어
                        </button>
                        <button
                            type="button"
                            onClick={() => setLang('en')}
                            className={`px-3 py-1.5 rounded-lg transition ${lang === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            English
                        </button>
                        <button
                            type="button"
                            onClick={() => setLang('ja')}
                            className={`px-3 py-1.5 rounded-lg transition ${lang === 'ja' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            日本語
                        </button>
                    </div>
                </div>

                {/* Badge & Title */}
                <div className="mb-8">
                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full mb-3">
                        {lang === 'ko' && '모바일 앱 개인정보처리방침 (Android)'}
                        {lang === 'en' && 'Mobile App Privacy Policy (Android)'}
                        {lang === 'ja' && 'モバイルアプリ プライバシーポリシー (Android)'}
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                        {lang === 'ko' && 'JapanRailNote 앱 개인정보처리방침'}
                        {lang === 'en' && 'Privacy Policy for JapanRailNote App'}
                        {lang === 'ja' && 'JapanRailNote アプリ プライバシーポリシー'}
                    </h1>
                    <p className="text-xs text-slate-400 mt-2">
                        {lang === 'ko' && '최종 수정일: 2026년 10월 13일 | 시행일: 2026년 10월 13일'}
                        {lang === 'en' && 'Last Updated: October 13, 2026 | Effective Date: October 13, 2026'}
                        {lang === 'ja' && '最終更新日: 2026年10月13日 | 施行日: 2026年10月13日'}
                    </p>
                </div>

                {/* Content - Korean */}
                {lang === 'ko' && (
                    <div className="space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed">
                        <section className="bg-blue-50/50 p-4 sm:p-5 rounded-2xl border border-blue-100">
                            <h2 className="text-base font-bold text-blue-900 mb-2">개요 요약</h2>
                            <p className="text-sm text-blue-800/90 leading-relaxed">
                                JapanRailNote(이하 &apos;앱&apos;, 패키지명: <code className="bg-blue-100/80 px-1.5 py-0.5 rounded text-xs font-mono">com.pplan.jprail</code>)는 일본 철도 여행 기록 및 완승 관리를 위한 서비스입니다.
                                이용자의 개인정보를 매우 소중하게 다루며, <strong>기기 간 기록 동기화</strong>를 위한 최소한의 데이터만을 안전하게 처리합니다.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">1. 수집하는 개인정보 항목 및 수집 방법</h2>
                            <p className="mb-2">본 앱은 다음과 같은 목적으로 최소한의 정보를 처리합니다:</p>
                            <div className="space-y-3 mt-3">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <h3 className="font-semibold text-slate-900 text-sm mb-1">A. Google 로그인 계정 정보 (Firebase Authentication)</h3>
                                    <p className="text-xs text-slate-600">
                                        • 수집 항목: Google 계정 고유 식별자(UID), 이메일 주소, 기본 프로필 이름<br />
                                        • 수집 목적: 기기 간 탑승 기록의 안전한 클라우드 동기화 및 이용자 식별<br />
                                        • 비로그인 시: 사용자가 구글 로그인을 하지 않을 경우 기기 내부 로컬 DB에만 저장되며 외부 서버로 전송되지 않습니다.
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <h3 className="font-semibold text-slate-900 text-sm mb-1">B. 철도 탑승 및 여행 기록 데이터 (Cloud Firestore)</h3>
                                    <p className="text-xs text-slate-600">
                                        • 수집 항목: 탑승한 노선 및 역 ID, 탑승 시작/종료 일시, 완승률 통계 데이터<br />
                                        • 수집 목적: 로그인한 계정의 기기 간 백업 및 복원, 웹/앱 연동
                                    </p>
                                </div>
                                <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200/70">
                                    <h3 className="font-semibold text-amber-950 text-sm mb-1">C. Google 타임라인(위치 기록) 처리 방식 안내 (중요)</h3>
                                    <p className="text-xs text-amber-900/90 leading-relaxed">
                                        • 이용자가 타임라인 JSON 파일을 앱으로 가져올 경우, <strong>모든 데이터는 이용자의 기기(로컬) 내부 메모리에서만 파싱</strong>되어 철도 탑승 여부를 판정합니다.<br />
                                        • 이용자의 상세 GPS 좌표, 이동 경로 원본, 위치 이력은 <strong>절대로 외부 서버로 전송되거나 저장되지 않습니다.</strong>
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">2. 개인정보의 이용 및 제3자 제공</h2>
                            <p className="text-sm leading-relaxed mb-3">
                                본 앱은 수집한 정보를 명시된 목적(계정 인증 및 탑승 기록 동기화) 이외의 용도로 사용하거나, 이용자의 동의 없이 제3자에게 판매하거나 제공하지 않습니다.
                                안정적인 서비스 운영을 위해 신뢰할 수 있는 다음의 글로벌 인프라 SDK를 활용합니다:
                            </p>
                            <ul className="list-disc list-inside text-sm space-y-1.5 text-slate-600 pl-2">
                                <li><strong>Google Firebase Authentication</strong>: 사용자 계정 인증 및 토큰 관리</li>
                                <li><strong>Google Cloud Firestore</strong>: 탑승 기록 데이터의 암호화된 저장 및 실시간 동기화</li>
                                <li><strong>Google Play Services</strong>: Google 계정 연동 간편 로그인</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">3. 개인정보의 보유 기간 및 파기</h2>
                            <p className="text-sm leading-relaxed">
                                • 이용자의 탑승 데이터는 계정 탈퇴 또는 삭제 요청 시까지 안전하게 보관됩니다.<br />
                                • 앱 내 &apos;설정&apos; 화면에서 언제든지 로그아웃할 수 있으며, 기기 내 로컬 데이터 초기화 기능을 통해 단말기 내 저장된 기록을 즉시 삭제할 수 있습니다.
                            </p>
                        </section>

                        <section className="bg-red-50/50 p-5 rounded-2xl border border-red-100">
                            <h2 className="text-lg font-bold text-red-950 mb-2">4. 계정 및 데이터 삭제 요청 권리 (Data Deletion)</h2>
                            <p className="text-sm text-red-900/90 leading-relaxed mb-3">
                                이용자는 Google Play 정책 및 개인정보보호 규정에 따라 언제든지 자신의 계정과 클라우드(Firebase)에 보관된 모든 탑승 기록의 영구 삭제를 요청할 수 있습니다.
                            </p>
                            <div className="bg-white p-3.5 rounded-xl border border-red-200/80 text-xs sm:text-sm text-slate-800 space-y-1.5">
                                <p><strong>삭제 신청 방법:</strong> 아래 이메일로 가입한 구글 계정 이메일 주소와 함께 삭제를 요청해 주세요.</p>
                                <p><strong>이메일:</strong> <a href="mailto:substring.jp@gmail.com" className="text-blue-600 underline font-medium">substring.jp@gmail.com</a></p>
                                <p><strong>처리 기한:</strong> 접수일로부터 영업일 기준 7일 이내에 Firebase DB의 모든 레코드 및 인증 계정이 영구 파기되며 확인 회신을 드립니다.</p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">5. 아동의 개인정보 보호</h2>
                            <p className="text-sm leading-relaxed">
                                본 앱은 만 13세 미만 아동을 대상으로 하지 않으며, 13세 미만 아동의 개인정보를 고의로 수집하지 않습니다.
                            </p>
                        </section>

                        <section className="pt-4 border-t border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900 mb-2">6. 문의 및 관리자 연락처</h2>
                            <p className="text-sm text-slate-600">
                                개인정보 처리방침과 관련된 질문이나 의견, 데이터 열람/삭제 문의는 언제든 아래로 연락해 주시기 바랍니다.
                            </p>
                            <p className="text-sm text-slate-800 font-semibold mt-2">
                                개발 및 운영: substring (<a href="mailto:substring.jp@gmail.com" className="text-blue-600 underline">substring.jp@gmail.com</a>)
                            </p>
                        </section>
                    </div>
                )}

                {/* Content - English */}
                {lang === 'en' && (
                    <div className="space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed">
                        <section className="bg-blue-50/50 p-4 sm:p-5 rounded-2xl border border-blue-100">
                            <h2 className="text-base font-bold text-blue-900 mb-2">Summary Overview</h2>
                            <p className="text-sm text-blue-800/90 leading-relaxed">
                                JapanRailNote (Package ID: <code className="bg-blue-100/80 px-1.5 py-0.5 rounded text-xs font-mono">com.pplan.jprail</code>) is an application designed for tracking and managing Japan railway journeys and completion rates.
                                We value your privacy and process only the minimum necessary information required for <strong>cross-device cloud synchronization</strong>.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Information We Collect and Purpose</h2>
                            <div className="space-y-3 mt-3">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <h3 className="font-semibold text-slate-900 text-sm mb-1">A. Google Account Information (Firebase Authentication)</h3>
                                    <p className="text-xs text-slate-600">
                                        • Data: Google Unique ID (UID), Email address, display name.<br />
                                        • Purpose: Secure authentication and cross-device sync of railway ride records.<br />
                                        • Guest Mode: If you choose not to log in, all records remain stored strictly on your local device.
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <h3 className="font-semibold text-slate-900 text-sm mb-1">B. Ride & Travel History Data (Cloud Firestore)</h3>
                                    <p className="text-xs text-slate-600">
                                        • Data: Travelled railway lines, station IDs, travel timestamps, completion percentages.<br />
                                        • Purpose: Encrypted cloud backup, restore, and synchronization across devices.
                                    </p>
                                </div>
                                <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200/70">
                                    <h3 className="font-semibold text-amber-950 text-sm mb-1">C. Google Timeline (Location History) Processing</h3>
                                    <p className="text-xs text-amber-900/90 leading-relaxed">
                                        • When importing Timeline JSON exports, <strong>all processing occurs entirely on your local device</strong>.<br />
                                        • Raw GPS coordinates and location histories are <strong>NEVER transmitted or stored on external servers</strong>.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Third-Party Services & SDKs</h2>
                            <p className="text-sm leading-relaxed mb-3">
                                We do not sell or lease user data to third parties. We use industry-standard Google cloud infrastructure to provide our services:
                            </p>
                            <ul className="list-disc list-inside text-sm space-y-1.5 text-slate-600 pl-2">
                                <li><strong>Google Firebase Authentication</strong>: Account security and token verification.</li>
                                <li><strong>Google Cloud Firestore</strong>: Encrypted database storage for your railway records.</li>
                                <li><strong>Google Play Services</strong>: Streamlined Google sign-in integration.</li>
                            </ul>
                        </section>

                        <section className="bg-red-50/50 p-5 rounded-2xl border border-red-100">
                            <h2 className="text-lg font-bold text-red-950 mb-2">3. Account & Data Deletion Request (Play Store Compliance)</h2>
                            <p className="text-sm text-red-900/90 leading-relaxed mb-3">
                                In compliance with Google Play Data Safety policies, you have the right to request full deletion of your account and all associated cloud data at any time.
                            </p>
                            <div className="bg-white p-3.5 rounded-xl border border-red-200/80 text-xs sm:text-sm text-slate-800 space-y-1.5">
                                <p><strong>How to request deletion:</strong> Send an email with the Google account email used to sign in.</p>
                                <p><strong>Email:</strong> <a href="mailto:substring.jp@gmail.com" className="text-blue-600 underline font-medium">substring.jp@gmail.com</a></p>
                                <p><strong>Retention & Processing:</strong> Within 7 business days of receiving your request, all your Firebase authentication records and stored railway history will be permanently deleted.</p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Children’s Privacy</h2>
                            <p className="text-sm leading-relaxed">
                                The app is not directed toward children under 13, and we do not knowingly collect personal information from children under 13.
                            </p>
                        </section>

                        <section className="pt-4 border-t border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900 mb-2">5. Contact Information</h2>
                            <p className="text-sm text-slate-600">
                                If you have any inquiries regarding this policy, please contact:
                            </p>
                            <p className="text-sm text-slate-800 font-semibold mt-2">
                                Developer: substring (<a href="mailto:substring.jp@gmail.com" className="text-blue-600 underline">substring.jp@gmail.com</a>)
                            </p>
                        </section>
                    </div>
                )}

                {/* Content - Japanese */}
                {lang === 'ja' && (
                    <div className="space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed">
                        <section className="bg-blue-50/50 p-4 sm:p-5 rounded-2xl border border-blue-100">
                            <h2 className="text-base font-bold text-blue-900 mb-2">概要</h2>
                            <p className="text-sm text-blue-800/90 leading-relaxed">
                                JapanRailNote（パッケージ名: <code className="bg-blue-100/80 px-1.5 py-0.5 rounded text-xs font-mono">com.pplan.jprail</code>）は、日本の鉄道乗車記録および完乗率を管理するためのアプリです。
                                当アプリでは、ユーザーのプライバシーを尊重し、<strong>複数端末間での乗車記録同期</strong>に必要な最小限の情報のみを安全に取り扱います。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">1. 収集する情報および利用目的</h2>
                            <div className="space-y-3 mt-3">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <h3 className="font-semibold text-slate-900 text-sm mb-1">A. Googleアカウント情報 (Firebase Authentication)</h3>
                                    <p className="text-xs text-slate-600">
                                        • 収集項目: Googleアカウント固有識別子(UID)、メールアドレス、ユーザー名<br />
                                        • 目的: 端末間での乗車記録クラウド同期およびユーザー認証<br />
                                        • 未ログイン時: ログインせずに利用する場合、すべてのデータは端末ローカルにのみ保存され、外部サーバーには送信されません。
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <h3 className="font-semibold text-slate-900 text-sm mb-1">B. 鉄道乗車記録データ (Cloud Firestore)</h3>
                                    <p className="text-xs text-slate-600">
                                        • 収集項目: 乗車路線・駅識別子、乗車日時、完乗率データ<br />
                                        • 目的: クラウドバックアップおよび端末間のリアルタイム同期
                                    </p>
                                </div>
                                <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200/70">
                                    <h3 className="font-semibold text-amber-950 text-sm mb-1">C. Googleタイムライン（位置情報）のローカル処理について</h3>
                                    <p className="text-xs text-amber-900/90 leading-relaxed">
                                        • タイムラインJSONファイルをインポートする場合、<strong>すべての解析処理は端末のローカル環境内でのみ実行</strong>されます。<br />
                                        • 詳細なGPS座標や生の移動履歴が外部サーバーに送信または保存されることは一切ありません。
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">2. 第三者提供および利用SDK</h2>
                            <p className="text-sm leading-relaxed mb-3">
                                当アプリは、個人情報を第三者に販売・提供することはありません。信頼性の高いGoogleのクラウド基盤を利用しています：
                            </p>
                            <ul className="list-disc list-inside text-sm space-y-1.5 text-slate-600 pl-2">
                                <li><strong>Google Firebase Authentication</strong>: アカウント認証・セキュリティ管理</li>
                                <li><strong>Google Cloud Firestore</strong>: 乗車記録データの暗号化保存および同期</li>
                                <li><strong>Google Play Services</strong>: ログイン連携機能</li>
                            </ul>
                        </section>

                        <section className="bg-red-50/50 p-5 rounded-2xl border border-red-100">
                            <h2 className="text-lg font-bold text-red-950 mb-2">3. アカウントおよびデータの削除リクエスト</h2>
                            <p className="text-sm text-red-900/90 leading-relaxed mb-3">
                                Google Playのポリシーに基づき、ユーザーはいつでも自身のアカウントおよびクラウドに保存されたすべての乗車データの完全削除を要求できます。
                            </p>
                            <div className="bg-white p-3.5 rounded-xl border border-red-200/80 text-xs sm:text-sm text-slate-800 space-y-1.5">
                                <p><strong>削除の申請方法:</strong> ログインに使用したGoogleアカウントのメールアドレスを明記の上、下記メール宛にご連絡ください。</p>
                                <p><strong>連絡先:</strong> <a href="mailto:substring.jp@gmail.com" className="text-blue-600 underline font-medium">substring.jp@gmail.com</a></p>
                                <p><strong>対応期間:</strong> 受付後、7営業日以内にFirestore上のすべてのレコードおよび認証情報を完全に消去いたします。</p>
                            </div>
                        </section>

                        <section className="pt-4 border-t border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900 mb-2">4. お問い合わせ</h2>
                            <p className="text-sm text-slate-600">
                                本ポリシーに関するお問い合わせは、下記までご連絡ください。
                            </p>
                            <p className="text-sm text-slate-800 font-semibold mt-2">
                                開発・運営: substring (<a href="mailto:substring.jp@gmail.com" className="text-blue-600 underline">substring.jp@gmail.com</a>)
                            </p>
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}
