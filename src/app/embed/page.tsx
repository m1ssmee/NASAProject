import type { Metadata } from 'next';
import { ViewerRoute, type Query } from '@/components/viewer/ViewerRoute';

export const metadata: Metadata = {
  title: 'Embedded viewer',
  description: 'The Second Plate SPHEREx blink viewer without site navigation, for use inside an iframe.',
  robots: { index: false },
};

export default async function Embed({ searchParams }: { searchParams: Promise<Query> }) {
  return <ViewerRoute query={await searchParams} embed />;
}
