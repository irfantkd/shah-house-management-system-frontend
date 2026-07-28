/**
 * Shah House brand mark — elegant gold outline house.
 *
 * A pure line-art mark: roof, body, arched entrance, finial.
 * No solid fills — just clean gold strokes on dark backgrounds.
 *
 *   ShahHouseIconMark  — bare mark, for dark surfaces
 *   ShahHouseIconBadge — mark in a navy badge, for light surfaces
 *   ShahHouseLogo      — mark + wordmark row, for the sidebar
 */

const G  = "#C9A84C";
const GL = "#E8C870";
const BG = "#0b1d3a";

// ── House mark (internal) ─────────────────────────────────────────────────────
// 56×56 viewBox.
// Elegant pitched-roof house: a gold line-art silhouette.
//   • Roof (with 4-px eave overhang on each side)
//   • Rectangular body
//   • Arched entrance door (Moorish semicircle)
//   • Finial gem at the roof peak
function HouseMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden="true">

      {/* ── Roof ── eave extends 4 px beyond body on each side */}
      <path
        d="M8,26 L28,8 L48,26"
        stroke={G} strokeWidth="3.5"
        strokeLinejoin="round" strokeLinecap="round"
      />

      {/* ── Body ── */}
      <rect x="10" y="25.5" width="36" height="26.5" rx="0.5"
        stroke={G} strokeWidth="3.5" fill="none" />

      {/* ── Arched entrance ── semicircle arch + two jamb lines */}
      {/* arc from (21,43) to (35,43) sweeping upward (CCW), radius=7, top of arch at y=36 */}
      <path
        d="M21,52 L21,43 A7,7 0 0,0 35,43 L35,52"
        stroke={G} strokeWidth="2.5" strokeLinecap="round"
      />

      {/* ── Finial gem at roof apex ── */}
      <circle cx="28" cy="8" r="4" fill={GL} />
      <circle cx="28" cy="8" r="1.8" fill="white" opacity="0.85" />

    </svg>
  );
}

// ── Public exports ────────────────────────────────────────────────────────────

export function ShahHouseIconMark({ size = 40, style = {}, className = "" }) {
  return (
    <div style={{ lineHeight: 0, ...style }} className={className}>
      <HouseMark size={size} />
    </div>
  );
}

export function ShahHouseIconBadge({ size = 40, rx = 13, style = {}, className = "" }) {
  return (
    <div
      className={className}
      style={{
        width:          size,
        height:         size,
        borderRadius:   rx,
        background:     BG,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        flexShrink:     0,
        ...style,
      }}
    >
      <HouseMark size={Math.round(size * 0.72)} />
    </div>
  );
}

export default function ShahHouseLogo({ size = 32, collapsed = false }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className="shrink-0 flex items-center justify-center rounded-xl"
        style={{
          width:      size,
          height:     size,
          background: "rgba(255,255,255,0.07)",
          border:     `1px solid ${G}28`,
        }}
      >
        <HouseMark size={Math.round(size * 0.72)} />
      </div>

      {!collapsed && (
        <div className="min-w-0 leading-none">
          <p className="text-white font-bold text-[13px] leading-tight tracking-wide whitespace-nowrap">
            Shah House
          </p>
          <p
            className="text-[9px] whitespace-nowrap tracking-[0.18em] uppercase font-medium mt-0.5"
            style={{ color: G, opacity: 0.65 }}
          >
            Management System
          </p>
        </div>
      )}
    </div>
  );
}
