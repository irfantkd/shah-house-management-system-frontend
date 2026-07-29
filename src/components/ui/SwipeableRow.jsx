import { forwardRef, useRef } from 'react';
import { motion } from 'framer-motion';

const THRESHOLD = 72;  // px before action fires
const MAX_DRAG  = 110; // max slide distance

const SwipeableRowBase = forwardRef(function SwipeableRowBase(
  {
    onSwipeLeft,                                         // right→left: delete
    onSwipeRight,                                        // left→right: edit
    leftIcon,  leftLabel  = 'Edit',   leftBg  = '#eff6ff', leftColor  = '#2563eb',
    rightIcon, rightLabel = 'Delete', rightBg = '#fef2f2', rightColor = '#dc2626',
    children, className = '', style,
  },
  ref,
) {
  const slideRef = useRef(null);
  const g = useRef({ x0: 0, y0: 0, dx: 0, axis: null });

  const setX = (x, animated = false) => {
    const el = slideRef.current;
    if (!el) return;
    el.style.transition = animated ? 'transform 0.22s cubic-bezier(0.4,0,0.2,1)' : 'none';
    el.style.transform  = `translateX(${x}px)`;
  };

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`} style={style}>

      {/* Left reveal strip — visible when user swipes right (edit action) */}
      {onSwipeRight && (
        <div
          className="absolute inset-y-0 left-0 w-[80px] flex flex-col items-center justify-center gap-1.5 select-none"
          style={{ background: leftBg }}
        >
          {leftIcon}
          <span className="text-[10px] font-black tracking-wide leading-none" style={{ color: leftColor }}>
            {leftLabel}
          </span>
        </div>
      )}

      {/* Right reveal strip — visible when user swipes left (delete action) */}
      {onSwipeLeft && (
        <div
          className="absolute inset-y-0 right-0 w-[80px] flex flex-col items-center justify-center gap-1.5 select-none"
          style={{ background: rightBg }}
        >
          {rightIcon}
          <span className="text-[10px] font-black tracking-wide leading-none" style={{ color: rightColor }}>
            {rightLabel}
          </span>
        </div>
      )}

      {/* Sliding content layer — bg-white + z-[1] fully covers the strips until dragged */}
      <div
        ref={slideRef}
        className="relative z-1 bg-white"
        onTouchStart={(e) => {
          g.current = { x0: e.touches[0].clientX, y0: e.touches[0].clientY, dx: 0, axis: null };
        }}
        onTouchMove={(e) => {
          const s  = g.current;
          const dx = e.touches[0].clientX - s.x0;
          const dy = e.touches[0].clientY - s.y0;
          // Determine dominant axis on first meaningful movement
          if (!s.axis) {
            if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
            s.axis = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
          }
          if (s.axis === 'v') return; // let browser scroll vertically
          let x = dx;
          if (x > 0 && !onSwipeRight) x = 0; // no right handler → block right drag
          if (x < 0 && !onSwipeLeft)  x = 0; // no left handler  → block left drag
          x = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, x));
          s.dx = x;
          setX(x);
        }}
        onTouchEnd={() => {
          const { dx, axis } = g.current;
          if (axis === 'h') {
            if (dx < -THRESHOLD && onSwipeLeft)  onSwipeLeft();
            if (dx >  THRESHOLD && onSwipeRight) onSwipeRight();
          }
          setX(0, true); // always snap back
        }}
      >
        {children}
      </div>
    </div>
  );
});

// Motion-enhanced version for use inside framer-motion <AnimatePresence>
export const MotionSwipeableRow = motion(SwipeableRowBase);

export default SwipeableRowBase;
