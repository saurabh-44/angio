import { useEffect, useState } from 'react';

// Reactive media-query match. Defaults to "below Tailwind's lg breakpoint"
// (i.e. phones + tablets) — used by the dashboard charts to thin crowded
// time-axis labels on small screens without changing the desktop (lg+) view.
export function useIsMobile(query = '(max-width: 1023px)') {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}
