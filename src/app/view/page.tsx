import type { Metadata } from 'next';
import { ViewerRoute, type Query } from '@/components/viewer/ViewerRoute';

export const metadata: Metadata = {
  title: 'Viewer',
  description: 'Blink SPHEREx infrared images of any sky position across time. Choose a detector, subtract plates, overlay Gaia stars and measure a spectrum across 102 bands.',
};

export default async function View({ searchParams }: { searchParams: Promise<Query> }) {
  return <ViewerRoute query={await searchParams} />;
}
