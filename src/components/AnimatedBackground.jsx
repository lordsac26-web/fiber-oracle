// AnimatedBackground replaced with a static solid color to save CPU/GPU resources.
// The dark background color matches the previous canvas gradient center color.
export default function AnimatedBackground() {
  return (
    <div
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ background: '#0a0a23' }}
    />
  );
}