import { useEffect, useState } from 'react';

export function useDetachedHeader(offset = 16) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const nextScrolled = window.scrollY > offset;
      setScrolled(current => (current === nextScrolled ? current : nextScrolled));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [offset]);

  return scrolled;
}
