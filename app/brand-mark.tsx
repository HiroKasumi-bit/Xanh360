// Xanh360's mark: a leaf over a ripple of the Saigon river, drawn in the current colour (foam on the river tile, see
// .brand-symbol in app/visuals.css) with the leaf's vein cut in the tile's colour. public/favicon.svg is the same drawing.
export function BrandMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.8 17.2C4.4 9.2 9.3 4.2 19.6 3.8c.4 8.6-4.3 13-11.2 13.4Z" fill="currentColor" />
      <path d="M7.6 16.2c3-4.2 5.8-7 9.4-9.6" style={{stroke: 'var(--river-700)'}} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M2.8 20.2c1.55 0 1.55-1.3 3.1-1.3s1.55 1.3 3.1 1.3 1.55-1.3 3.1-1.3 1.55 1.3 3.1 1.3 1.55-1.3 3.1-1.3 1.55 1.3 3.1 1.3"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
