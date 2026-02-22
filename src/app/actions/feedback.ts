'use server';

import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function submitFeedback(formData: FormData) {
    const content = formData.get('content') as string;
    const author = formData.get('author') as string;
    const type = formData.get('type') as string || 'General';

    if (!content || content.trim().length === 0) {
        return { success: false, error: '내용을 입력해주세요.' };
    }

    try {
        await db.collection('feedbacks').add({
            content,
            author: author || 'Anonymous',
            type,
            createdAt: FieldValue.serverTimestamp(),
            status: 'new'
        });

        return { success: true };
    } catch (error) {
        console.error('Feedback submission error:', error);
        return { success: false, error: '저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' };
    }
}
