export type Language = 'ja' | 'en' | 'ko';

export const JR_GROUP_PREFIX_MAP: Record<string, string> = {
    北海道: "Hokkaido",
    東日本: "East",
    東海: "Central",
    西日本: "West",
    四国: "Shikoku",
    九州: "Kyushu",
    貨物: "Freight",
};

export const UI_TRANSLATIONS = {
    about_credits: {
        en: 'About / Credits',
        ko: '정보 / 크레딧',
        ja: '情報 / クレジット',
    },
    feedback_title: {
        en: 'User Feedback 📮',
        ko: '사용자 건의함 📮',
        ja: 'ユーザーの声 📮',
    },
    feedback_button: {
        en: 'Feedback',
        ko: '건의사항',
        ja: 'フィードバック',
    },
    feedback_description: {
        en: 'Please feel free to leave your suggestions, bug reports, and other opinions.',
        ko: '기능 제안, 버그 보고 등 의견을 자유롭게 남겨주세요.',
        ja: '機能提案やバグ報告など、ご意見を自由にお寄せください。',
    },
    feedback_content_label: {
        en: 'Feedback Content',
        ko: '의견 내용',
        ja: 'フィードバック内容',
    },
    feedback_placeholder: {
        en: 'Please describe how we can improve or what features you would like to see added.',
        ko: '개선되었으면 하는 점이나 추가되었으면 하는 기능을 적어주세요.',
        ja: '改善してほしい点や追加してほしい機能などを記入してください。',
    },
    feedback_author_label: {
        en: 'Name or Nickname (Optional)',
        ko: '성함 또는 닉네임 (선택)',
        ja: 'お名前またはニックネーム（任意）',
    },
    feedback_author_placeholder: {
        en: 'Anonymous',
        ko: '익명',
        ja: '匿名',
    },
    feedback_submit: {
        en: 'Submit Feedback',
        ko: '의견 보내기',
        ja: '送信する',
    },
    feedback_submitting: {
        en: 'Sending...',
        ko: '전송 중...',
        ja: '送信中...',
    },
    feedback_success: {
        en: 'Your feedback has been successfully submitted. Thank you!',
        ko: '건의사항이 성공적으로 전달되었습니다. 감사합니다!',
        ja: 'フィードバックが正常に送信されました。ありがとうございます！',
    },
    feedback_error: {
        en: 'An error occurred while saving. Please try again later.',
        ko: '저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        ja: '保存中にエラーが発生しました。後でもう一度お試しください。',
    },
    feedback_empty_content: {
        en: 'Please enter the content.',
        ko: '내용을 입력해주세요.',
        ja: '内容を入力してください.',
    },
    auth_login: {
        en: 'Login',
        ko: '로그인',
        ja: 'ログイン',
    },
    auth_logout: {
        en: 'Logout',
        ko: '로그아웃',
        ja: 'ログアウト',
    },
    auth_signup: {
        en: 'Sign Up',
        ko: '회원가입',
        ja: '新規登録',
    },
    auth_email: {
        en: 'Email',
        ko: '이메일',
        ja: 'メールアドレス',
    },
    auth_password: {
        en: 'Password',
        ko: '비밀번호',
        ja: 'パスワード',
    },
    auth_confirm_password: {
        en: 'Confirm Password',
        ko: '비밀번호 확인',
        ja: 'パスワード確認',
    },
    auth_welcome: {
        en: 'Welcome back!',
        ko: '다시 오신 것을 환영합니다!',
        ja: 'お帰りなさい！',
    },
    auth_syncing: {
        en: 'Syncing your travels...',
        ko: '여행 기록을 동기화 중입니다...',
        ja: '移動履歴を同期中...',
    },
    auth_no_account: {
        en: "Don't have an account?",
        ko: '계정이 없으신가요?',
        ja: 'アカウントをお持ちでないですか？',
    },
    auth_have_account: {
        en: 'Already have an account?',
        ko: '이미 계정이 있으신가요?',
        ja: '既にアカウントをお持ちですか？',
    },
    auth_save_cloud: {
        en: 'Create an account to save your travels forever.',
        ko: '계정을 만들고 소중한 기록을 클라우드에 영구 보관하세요.',
        ja: 'アカウントを作成して、移動履歴を永久に保存しましょう。',
    }
};
