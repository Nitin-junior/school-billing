'use client';

/**
 * Patches console.error at CLIENT MODULE-LOAD time — before React hydration —
 * to silence browser-extension-caused hydration mismatches (fdprocessedid, etc.).
 *
 * The patch lives at module scope (not inside useEffect) so it runs the moment
 * this chunk is evaluated by the browser, which is before React.hydrateRoot().
 */

const EXTENSION_ATTRS = [
  'fdprocessedid',
  'bis_skin_checked',
  'data-lt-installed',
  'data-new-gr-c-s-check-loaded',
  'data-gr-ext-installed',
  'data-dashlane-rid',
  'data-1p-ignore',
];

if (typeof window !== 'undefined') {
  const _orig = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const flat = args.map((a) => (typeof a === 'string' ? a : '')).join(' ');

    const isHydrationMsg =
      flat.includes('Hydration') ||
      flat.includes('hydrat') ||
      flat.includes('did not match') ||
      flat.includes('server rendered HTML') ||
      flat.includes('Warning: Prop');

    if (isHydrationMsg) {
      const fromExtension = EXTENSION_ATTRS.some((attr) =>
        args.some((a) => typeof a === 'string' && a.includes(attr))
      );
      if (fromExtension) return; // swallow silently
    }

    _orig(...args);
  };
}

export default function HydrationSuppressor() {
  // No useEffect needed — patch already applied at module load time above.
  return null;
}
