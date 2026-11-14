'use client';
// Official videos, played here. Nothing is loaded from YouTube's player until a video is
// started; until then each one is a still picture and a title.
import { useState } from 'react';
import type { Video } from '@/data/media';

const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

export function VideoShelf({ videos }: { videos: Video[] }) {
  const [current, setCurrent] = useState(videos[0]);
  const [playing, setPlaying] = useState(false);
  const choose = (v: Video) => { setCurrent(v); setPlaying(true); };
  return (
    <div className="vid grid">
      <div className="vid__stage">
        <div className="vid__frame">
          {playing ? (
            <iframe
              key={current.id}
              src={`https://www.youtube-nocookie.com/embed/${current.id}?autoplay=1&rel=0&modestbranding=1`}
              title={current.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <button type="button" className="vid__poster" onClick={() => setPlaying(true)} aria-label={`Play: ${current.title}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(current.id)} alt="" loading="lazy" decoding="async" />
              <span className="vid__play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 4l14 8-14 8z" /></svg></span>
            </button>
          )}
        </div>
        <p className="vid__now"><strong>{current.title}</strong><span>{current.by}. {current.about}</span></p>
      </div>
      <ul className="vid__list" aria-label="More videos">
        {videos.map((v) => (
          <li key={v.id}>
            <button type="button" onClick={() => choose(v)} aria-pressed={v.id === current.id && playing} className={v.id === current.id ? 'is-current' : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(v.id)} alt="" loading="lazy" decoding="async" width={120} height={68} />
              <span><b>{v.title}</b><i>{v.by}</i></span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
