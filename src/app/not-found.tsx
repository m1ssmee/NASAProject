import type { Metadata } from 'next';
import Link from 'next/link';
import { Hop } from '@/components/Hop';

export const metadata: Metadata = { title: 'Nothing moved here', description: 'This page does not exist. Go back to the comparator.' };

export default function NotFound() {
  return (
    <section className="nf wrap grid">
      <div className="nf__copy">
        <p className="mono muted">Plate 404</p>
        <h1 className="display">Nothing moved here.</h1>
        <p className="lede">Both plates are blank. The page you asked for is not in this part of the sky.</p>
        <Link href="/" className="btn"><Hop tick={false}>Back to the comparator</Hop></Link>
      </div>
      <div className="nf__plate">
        <div className="plate" role="img" aria-label="An empty photographic plate">
          <div className="plate__edge" aria-hidden="true"><span>A no exposure</span><span>B no exposure</span></div>
        </div>
      </div>
    </section>
  );
}
