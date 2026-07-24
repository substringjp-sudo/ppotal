'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TripEditorApp from '@/components/edit-trip/TripEditorApp';

export default function EditTripByIdPage() {
    const params = useParams();
    const router = useRouter();

    const idParam = params.id;
    let id = Array.isArray(idParam) ? idParam[0] : (idParam as string);
    const isServer = typeof window === 'undefined';

    // Firebase Hosting의 Static Export 리라이트([id]=placeholder) 대응
    if (id === 'placeholder') {
        if (!isServer) {
            const pathSegments = window.location.pathname.split('/').filter(Boolean);
            if (pathSegments[0] === 'edit-trip' && pathSegments[1]) {
                id = pathSegments[1];
            }
        } else {
            id = '';
        }
    }

    // id가 없으면 목록으로 리다이렉트
    useEffect(() => {
        if (!id) {
            router.replace('/trips');
        }
    }, [id, router]);

    if (!id) return null;

    return <TripEditorApp id={id} />;
}
