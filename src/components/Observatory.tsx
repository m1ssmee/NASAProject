'use client';
// The model beside a list of its parts. Choosing a part turns the model to show it.
import { useState } from 'react';
import { CraftView, type CraftAngle } from './CraftView';
import { Hop } from './Hop';

interface Part { id: string; name: string; view: CraftAngle; fact: string; note: string }

const PARTS: Part[] = [
  { id: 'shields', name: 'Photon shields', view: { x: 0.95, y: 0.45 }, fact: 'Three cones, the widest 3.2 m across',
    note: 'Three cones, one inside the next, keep sunlight and the Earth’s heat off the telescope. Each gap between them is a layer of shade. They are why SPHEREx looks like nothing else in orbit.' },
  { id: 'telescope', name: 'Telescope', view: { x: 1.3, y: 0.2 }, fact: '20 cm aperture, 3.5° by 11.3° field',
    note: 'A small telescope with a very wide view. Its 20 centimetre mirror takes in a strip of sky about 22 full Moons long in every exposure, which is how it covers everything twice a year.' },
  { id: 'radiators', name: 'V-groove radiators', view: { x: 0.02, y: 0.9 }, fact: 'Cools to about −210 °C with no coolant',
    note: 'Three mirrored rings under the shields bounce heat sideways out to space. With nothing to run out, the detectors stay near minus 210 degrees Celsius for as long as the mission lasts.' },
  { id: 'bus', name: 'Spacecraft bus', view: { x: -0.3, y: 3.75 }, fact: 'Power, pointing, radio and computers',
    note: 'Everything that is not the telescope: batteries, reaction wheels, radios and computers, wrapped in gold insulation. The ring underneath is where it sat on the rocket.' },
  { id: 'trackers', name: 'Star trackers', view: { x: 0.12, y: 0.55 }, fact: 'Two small cameras that find north',
    note: 'Two small cameras photograph the stars and compare them with a catalogue, so the spacecraft knows which way it points. Every image in the viewer is aligned starting from that solution.' },
  { id: 'array', name: 'Solar array', view: { x: 0.12, y: 1.57 }, fact: 'One panel, always facing the Sun',
    note: 'A single flat panel on the sunward side. The spacecraft keeps it pointed at the Sun and keeps the open end of the cones pointed away from both Sun and Earth, all the way round each orbit.' },
];

export function Observatory() {
  const [open, setOpen] = useState<string | null>(null);
  const part = PARTS.find((p) => p.id === open) ?? null;
  return (
    <div className="obs grid">
      <div className="obs__model">
        <CraftView explodable focus={part ? ({ shields: 'shield1', trackers: 'bus' } as Record<string, string>)[part.id] ?? part.id : null} target={part?.view ?? null} onUserTurn={() => setOpen(null)} />
        <p className="small muted" style={{ marginTop: '0.6rem' }}>Drag to turn it, or pick a part.</p>
      </div>
      <ul className="obs__parts">
        {PARTS.map((p) => (
          <li key={p.id} className={p.id === open ? 'is-open' : undefined}>
            <button type="button" aria-expanded={p.id === open} aria-controls={`part-${p.id}`} onClick={() => setOpen(p.id === open ? null : p.id)}>
              <span className="h-m"><Hop>{p.name}</Hop></span>
              <span className="obs__fact">{p.fact}</span>
            </button>
            <p id={`part-${p.id}`} className="obs__note" hidden={p.id !== open}>{p.note}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
