import { useEffect, useRef } from 'react';
import type { Media } from '../../data/projects';

// One image or looping clip. Clips carry no controls and no sound: they're
// moving screenshots, so they play only while on screen and hold their
// poster otherwise (and always, under reduced motion).
export default function MediaView({ media, sizes }: { media: Media; sizes?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // preload="none" until now; play() kicks off the fetch.
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  if (media.type === 'video') {
    return (
      <video
        ref={videoRef}
        className="cs-media"
        width={media.w}
        height={media.h}
        poster={media.poster}
        muted
        loop
        playsInline
        preload="none"
        aria-label={media.alt}
      >
        <source src={media.src} type="video/mp4" />
      </video>
    );
  }

  return (
    <img
      className="cs-media"
      src={media.src}
      srcSet={media.small ? `${media.small} ${Math.round(media.w / 2)}w, ${media.src} ${media.w}w` : undefined}
      sizes={media.small ? sizes ?? '(max-width: 900px) 100vw, 1180px' : undefined}
      width={media.w}
      height={media.h}
      alt={media.alt}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}
