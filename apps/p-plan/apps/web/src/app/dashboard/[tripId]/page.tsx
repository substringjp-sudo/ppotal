import DashboardDetailPageClient from './DashboardDetailPageClient';

export function generateStaticParams() {
    return [{ tripId: 'placeholder' }];
}

export default async function Page({ params }: { params: Promise<{ tripId: string }> }) {
    await params;
    return <DashboardDetailPageClient />;
}
