import { Metadata } from 'next';
import JourneyAtlasClient from './JourneyAtlasClient';

export const metadata: Metadata = {
  title: 'Journey Atlas - 나의 여행 결산 지도 | PPLANER',
  description: '당신의 모든 여행 발자취를 하나의 인터랙티브 지도로 확인하세요.',
};

export default function JourneyAtlasPage() {
  return <JourneyAtlasClient />;
}
