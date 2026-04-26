/**
 * Patches console.error at module-load time (before any React rendering)
 * to suppress hydration warnings caused by browser extensions that inject
 * attributes like fdprocessedid, bis_skin_checked, data-gr-ext-installed, etc.
 *
 * Import this file once at the top of app/layout.tsx.
 */

const EXTENSION_ATTRS = [
  'fdprocessedid',
  'bis_skin_checked',
  'data-lt-installed',
  'data-new-gr-c-s-check-loaded',
  'data-gr-ext-installed',
  'data-dashlane',
  'data-1p-',
];

if (typeof window !== 'undefined') {
  const _consoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const msg = args.map((a) => (typeof a === 'string' ? a : '')).join(' ');
    const isHydration =
      msg.includes('Hydration') ||
      msg.includes('hydrat') ||
      msg.includes('did not match') ||
      msg.includes('server rendered HTML');

    if (isHydration) {
      const hasExtensionAttr = EXTENSION_ATTRS.some((attr) =>
        args.some((a) => typeof a === 'string' && a.includes(attr))
      );
      if (hasExtensionAttr) return;
    }

    _consoleError(...args);
  };
}
