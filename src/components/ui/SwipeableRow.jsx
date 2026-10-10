import { forwardRef, useRef } from 'react';
import { motion } from 'framer-motion';

const THRESHOLD = 72;  // px before action fires
const MAX_DRAG  = 110; // max slide distance
const haptic = () => { try { navigator.vibrate?.(8); } catch { /**/ } };

const SwipeableRowBase = forwardRef(function SwipeableRowBase(
  {
    onSwipeLeft,                                         // right→left: delete
    onSwipeRight,                                        // left→right: edit
    leftIcon,  leftLabel  = 'Edit',   leftBg  = '#fffdf0', leftColor  = '#9a6500',
    rightIcon, rightLabel = 'Delete', rightBg = '#fef2f2', rightColor = '#dc2626',
    children, className = '', style,
  },
  ref,
) {
  const slideRef  = useRef(null);
  const leftRef   = useRef(null);
  const rightRef  = useRef(null);
  const armed     = useRef(false);      // true once threshold crossed
  const g         = useRef({ x0: 0, y0: 0, dx: 0, axis: null });

  const setX = (x, animated = false) => {
    const el = slideRef.current;
    if (!el) return;
    el.style.transition = animated ? 'transform 0.22s cubic-bezier(0.4,0,0.2,1)' : 'none';
    el.style.transform  = `translateX(${x}px)`;
  };

  const setRevealScale = (leftScale, rightScale) => {
    if (leftRef.current)  leftRef.current.style.transform  = `scale(${leftScale})`;
    if (rightRef.current) rightRef.current.style.transform = `scale(${rightScale})`;
  };

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`} style={style}>

      {/* Left reveal strip — visible when user swipes right (edit action) */}
      {onSwipeRight && (
        <div
          className="absolute inset-y-0 left-0 w-[80px] flex flex-col items-center justify-center gap-1.5 select-none"
          style={{ background: leftBg }}
        >
          <div ref={leftRef} className="flex flex-col items-center gap-1.5 transition-transform duration-100">
            {leftIcon}
            <span className="text-[10px] font-black tracking-wide leading-none" style={{ color: leftColor }}>
              {leftLabel}
            </span>
          </div>
        </div>
      )}

      {/* Right reveal strip — visible when user swipes left (delete action) */}
      {onSwipeLeft && (
        <div
          className="absolute inset-y-0 right-0 w-[80px] flex flex-col items-center justify-center gap-1.5 select-none"
          style={{ background: rightBg }}
        >
          <div ref={rightRef} className="flex flex-col items-center gap-1.5 transition-transform duration-100">
            {rightIcon}
            <span className="text-[10px] font-black tracking-wide leading-none" style={{ color: rightColor }}>
              {rightLabel}
            </span>
          </div>
        </div>
      )}

      {/* Sliding content layer */}
      <div
        ref={slideRef}
        className="relative z-1 bg-white"
        onTouchStart={(e) => {
          armed.current = false;
          g.current = { x0: e.touches[0].clientX, y0: e.touches[0].clientY, dx: 0, axis: null };
        }}
        onTouchMove={(e) => {
          const s  = g.current;
          const dx = e.touches[0].clientX - s.x0;
          const dy = e.touches[0].clientY - s.y0;
          if (!s.axis) {
            if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
            s.axis = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
          }
          if (s.axis === 'v') return;
          let x = dx;
          if (x > 0 && !onSwipeRight) x = 0;
          if (x < 0 && !onSwipeLeft)  x = 0;
          x = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, x));
          s.dx = x;
          setX(x);

          /* Haptic + visual pop when threshold first crossed */
          const crossed = Math.abs(x) >= THRESHOLD;
          if (crossed && !armed.current) {
            armed.current = true;
            haptic();
            setRevealScale(x > 0 ? 1.15 : 1, x < 0 ? 1.15 : 1);
          } else if (!crossed && armed.current) {
            armed.current = false;
            setRevealScale(1, 1);
          }
        }}
        onTouchEnd={() => {
          const { dx, axis } = g.current;
          if (axis === 'h') {
            if (dx < -THRESHOLD && onSwipeLeft)  onSwipeLeft();
            if (dx >  THRESHOLD && onSwipeRight) onSwipeRight();
          }
          armed.current = false;
          setRevealScale(1, 1);
          setX(0, true);
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
