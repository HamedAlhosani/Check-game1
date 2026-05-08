/**
 * Aurora — single solid colour. No orbs, no gradient, no dust, no
 * halo. Just one quiet tone behind the page chrome. The user's
 * explicit ask: "ماباها شي بس لون".
 */
export function Aurora() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, background: '#100A05' }}
    />
  );
}
