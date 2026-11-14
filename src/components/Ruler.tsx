// The six SPHEREx detectors laid out along the spectrum, 17 channels each: 102 bands.
import { DETECTORS } from '@/lib/frames';

interface Props { selected?: number; onSelect?: (det: number) => void; counts?: Record<number, number> }

export function Ruler({ selected, onSelect, counts }: Props) {
  return (
    <div className="ruler">
      <div className="ruler__bar" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }} role={onSelect ? 'group' : undefined} aria-label={onSelect ? 'Detector' : undefined}>
        {DETECTORS.map((d) => {
          const inner = (
            <>
              <b>D{d.det}</b>
              <span>{counts ? `${counts[d.det] ?? 0} img` : `${d.min.toFixed(2)} to ${d.max.toFixed(2)}`}</span>
            </>
          );
          return onSelect ? (
            <button key={d.det} type="button" className="ruler__seg" aria-pressed={selected === d.det}
              aria-label={`Detector ${d.det}, ${d.min} to ${d.max} microns${counts ? `, ${counts[d.det] ?? 0} images` : ''}`}
              onClick={() => onSelect(d.det)}>{inner}</button>
          ) : <div key={d.det} className="ruler__seg">{inner}</div>;
        })}
      </div>
      <div className="ruler__axis" aria-hidden="true"><span>0.75 µm</span><span>near infrared, 102 bands</span><span>5.0 µm</span></div>
    </div>
  );
}
