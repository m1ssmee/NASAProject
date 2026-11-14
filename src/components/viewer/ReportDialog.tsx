'use client';
// Report a candidate: a short form that turns a marked position into a complete report and
// hands it to the people who follow these up.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Hop } from '@/components/Hop';
import { formatDec, formatRa } from '@/lib/astro';

const BOARD = 'https://www.zooniverse.org/projects/marckuchner/backyard-worlds-planet-9/talk';
const KINDS = [
  { v: 'moved', l: 'It moved between plates' },
  { v: 'changed', l: 'It got brighter or fainter' },
  { v: 'once', l: 'It shows in one plate only' },
  { v: 'other', l: 'Something else' },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  sky: { ra: number; dec: number } | null;
  seenIn: string;
  plates: string[];
  link: string;
}

export function ReportDialog({ open, onClose, sky, seenIn, plates, link }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<(typeof KINDS)[number]['v']>('moved');
  const [notes, setNotes] = useState('');
  const [who, setWho] = useState('');
  const [sent, setSent] = useState('');

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const text = useMemo(() => {
    if (!sky) return '';
    const simbad = `https://simbad.cfa.harvard.edu/simbad/sim-coo?Coord=${sky.ra.toFixed(5)}+${sky.dec.toFixed(5)}&Radius=20&Radius.unit=arcsec`;
    return [
      'SPHEREx candidate, found with Blinkscope',
      '',
      `What I saw: ${KINDS.find((k) => k.v === kind)!.l}${notes.trim() ? `. ${notes.trim()}` : ''}`,
      `Position (ICRS): ${formatRa(sky.ra)} ${formatDec(sky.dec)}`,
      `               = ${sky.ra.toFixed(5)}, ${sky.dec >= 0 ? '+' : ''}${sky.dec.toFixed(5)} degrees`,
      `Seen in: ${seenIn}`,
      `Plates: ${plates.join(', ')}`,
      `Blink it yourself: ${link}`,
      `Known objects within 20 arcseconds (SIMBAD): ${simbad}`,
      ...(who.trim() ? [`Reported by: ${who.trim()}`] : []),
    ].join('\n');
  }, [sky, kind, notes, who, seenIn, plates, link]);

  const post = async () => {
    try { await navigator.clipboard.writeText(text); setSent('The report is on your clipboard. Start a new discussion on the board that just opened and paste it in.'); }
    catch { setSent('The board has opened in a new tab. Select the report below, copy it, and paste it into a new discussion.'); }
    window.open(BOARD, '_blank', 'noopener');
  };
  const save = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = `spherex-candidate-${sky ? `${sky.ra.toFixed(3)}_${sky.dec.toFixed(3)}` : 'report'}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    setSent('Saved as a text file.');
  };

  return (
    <dialog ref={ref} className="report" onClose={onClose} aria-labelledby="report-h">
      {sky && (
        <form method="dialog" className="report__in" onSubmit={(e) => e.preventDefault()}>
          <header>
            <h2 id="report-h" className="h-l">Report a candidate</h2>
            <button type="button" className="inline-link" onClick={onClose}>Close</button>
          </header>
          <p className="coords">{formatRa(sky.ra)} {formatDec(sky.dec)}</p>
          <p className="note">Most things that move are already known. Before sending, open the SIMBAD link in the report and see whether something is listed at this spot.</p>

          <fieldset>
            <legend>What did you see?</legend>
            {KINDS.map((k) => (
              <label key={k.v} className="check"><input type="radio" name="kind" checked={kind === k.v} onChange={() => setKind(k.v)} />{k.l}</label>
            ))}
          </fieldset>
          <label className="report__field"><span>Anything to add (optional)</span>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="For example: steps about one pixel west between each pass" /></label>
          <label className="report__field"><span>Your name or handle (optional)</span>
            <input value={who} onChange={(e) => setWho(e.target.value)} autoComplete="nickname" /></label>

          <label className="report__field"><span>The report</span>
            <textarea className="report__text" readOnly rows={9} value={text} onFocus={(e) => e.currentTarget.select()} /></label>

          <div className="report__go">
            <button type="button" className="btn" onClick={post}><Hop tick={false}>Post it on Backyard Worlds</Hop></button>
            <a className="btn btn--quiet" href={`mailto:?subject=${encodeURIComponent('SPHEREx candidate')}&body=${encodeURIComponent(text)}`}><Hop tick={false}>Email it</Hop></a>
            <button type="button" className="btn btn--quiet" onClick={save}><Hop tick={false}>Save as a file</Hop></button>
          </div>
          <p className="note" role="status">{sent || 'Backyard Worlds is the NASA-funded volunteer project that follows up moving objects found in infrared surveys. Posting opens its discussion board in a new tab.'}</p>
        </form>
      )}
    </dialog>
  );
}
