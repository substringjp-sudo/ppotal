import InvitePageClient from './InvitePageClient';

export function generateStaticParams() {
    return [{ token: 'placeholder' }];
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
    await params;
    return <InvitePageClient />;
}
