import { useEffect, useRef } from 'react';

export default function SignaturePad({ onChange }) {
  const ref = useRef(); const drawing = useRef(false);
  useEffect(() => { const c = ref.current.getContext('2d'); c.lineWidth = 2.5; c.lineCap = 'round'; c.strokeStyle = '#123'; }, []);
  const pos = (e) => { const r = ref.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const down = (e) => { drawing.current = true; ref.current.setPointerCapture(e.pointerId); const c = ref.current.getContext('2d'); c.beginPath(); c.moveTo(...pos(e)); };
  const move = (e) => { if (!drawing.current) return; const c = ref.current.getContext('2d'); c.lineTo(...pos(e)); c.stroke(); };
  const up = () => { if (drawing.current) { drawing.current = false; onChange(ref.current.toDataURL('image/png')); } };
  const clear = () => { const cv = ref.current; cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); onChange(''); };
  return (
    <div>
      <canvas ref={ref} width={420} height={150} className="sig" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
      <button type="button" className="ghost" onClick={clear}>Clear</button>
    </div>
  );
}
