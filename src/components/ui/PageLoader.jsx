import { motion } from 'framer-motion';

const ARC_R    = 34;
const ARC_CIRC = 2 * Math.PI * ARC_R;

/**
 * Universal full-page loader used across all modules.
 * Props:
 *   text      — loading message (default "Loading…")
 *   icon      — optional lucide-react icon component shown inside the logo mark
 *   className — override the container class (default "min-h-[56vh]" for full-page)
 *               pass "py-12" for in-tab/section usage
 */
export default function PageLoader({
  text      = 'Loading…',
  icon: Icon,
  className = 'min-h-[56vh]',
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-6 ${className}`} aria-busy="true">

      {/* ── Spinning arc + logo mark ── */}
      <div className="relative w-18 h-18">

        <motion.svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 80 80"
          fill="none"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}>
          {/* Track */}
          <circle cx="40" cy="40" r={ARC_R} stroke="#e2e8f0" strokeWidth="3.5" />
          {/* Arc */}
          <circle
            cx="40" cy="40" r={ARC_R}
            stroke="#0b1d3a"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={`${ARC_CIRC * 0.26} ${ARC_CIRC * 0.74}`}
            transform="rotate(-90 40 40)"
          />
        </motion.svg>

        {/* Logo mark */}
        <div
          className="absolute flex items-center justify-center rounded-2xl"
          style={{ inset: 11, background: 'linear-gradient(135deg, #0b1d3a 0%, #1e3a6e 100%)' }}>
          {Icon ? (
            <Icon className="w-5 h-5 text-white" strokeWidth={2} />
          ) : (
            <div className="grid grid-cols-2 gap-0.75">
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="w-1.75 h-1.75 rounded-xs"
                  style={{ background: j % 2 === 0 ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.38)' }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Text + bouncing dots ── */}
      <div className="flex flex-col items-center gap-2.5">
        <p className="text-[13px] font-semibold text-slate-600 tracking-wide">{text}</p>
        <div className="flex gap-1.25">
          {[0, 1, 2].map((i) => (
            <motion.span key={i}
              className="block w-1.5 h-1.5 rounded-full"
              style={{ background: '#0b1d3a' }}
              animate={{ y: [0, -6, 0], opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
