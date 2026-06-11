/** Pure-CSS macOS-style layered purple/pink gradient background. */
export function MacWallpaperBg() {
  return (
    <div className="mac-bg" aria-hidden>
      <div className="mac-bg__base" />
      <div className="mac-bg__layer mac-bg__layer--left" />
      <div className="mac-bg__layer mac-bg__layer--right" />
      <div className="mac-bg__layer mac-bg__layer--mid" />
      <div className="mac-bg__layer mac-bg__layer--pink" />
      <div className="mac-bg__glow" />
    </div>
  );
}
