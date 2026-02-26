export type Language = 'en';

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
    about_credits: { en: 'About / Credits' },
    feedback_title: { en: 'User Feedback 📮' },
    feedback_button: { en: 'Feedback' },
    feedback_description: { en: 'Please feel free to leave your suggestions, bug reports, and other opinions.' },
    feedback_content_label: { en: 'Feedback Content' },
    feedback_placeholder: { en: 'Please describe how we can improve or what features you would like to see added.' },
    feedback_author_label: { en: 'Name or Nickname (Optional)' },
    feedback_author_placeholder: { en: 'Anonymous' },
    feedback_submit: { en: 'Submit Feedback' },
    feedback_submitting: { en: 'Sending...' },
    feedback_success: { en: 'Your feedback has been successfully submitted. Thank you!' },
    feedback_error: { en: 'An error occurred while saving. Please try again later.' },
    feedback_empty_content: { en: 'Please enter the content.' },
    auth_login: { en: 'Login' },
    auth_logout: { en: 'Logout' },
    auth_signup: { en: 'Sign Up' },
    auth_email: { en: 'Email' },
    auth_password: { en: 'Password' },
    auth_confirm_password: { en: 'Confirm Password' },
    auth_welcome: { en: 'Welcome back!' },
    auth_syncing: { en: 'Syncing your travels...' },
    auth_no_account: { en: "Don't have an account?" },
    auth_have_account: { en: 'Already have an account?' },
    auth_save_cloud: { en: 'Create an account to save your travels forever.' }
};
