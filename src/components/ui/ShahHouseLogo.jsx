/**
 * Shah House brand mark — two variants:
 *   ShahHouseIconMark  → no background, for use on dark surfaces (sidebar, letterhead header)
 *   ShahHouseIconBadge → with navy rounded-square background, for light surfaces / standalone
 *
 * Default export: logo icon + "SHAH HOUSE" text row, used in the sidebar.
 */

export function ShahHouseIconMark({ size = 40, style = {}, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 56 56"
      width={size}
      height={size}
      fill="none"
      style={style}
      className={className}
    >
      {/* House silhouette */}
      <path d="M7 27L28 10L49 27V50H7Z" fill="white"/>
      {/* Gold finial */}
      <path d="M28 4L31.5 8.5L28 11L24.5 8.5Z" fill="#C9A227"/>
      {/* Gold belt */}
      <rect x="7" y="27" width="42" height="1.8" fill="#C9A227" opacity="0.78"/>
      {/* Left window */}
      <rect x="9" y="30.5" width="8" height="6" rx="1" fill="#0b1d3a" opacity="0.50"/>
      {/* Right window */}
      <rect x="39" y="30.5" width="8" height="6" rx="1" fill="#0b1d3a" opacity="0.50"/>
      {/* Arch door */}
      <path d="M22 50V42Q22 35.5 28 35.5Q34 35.5 34 42V50Z" fill="#0b1d3a"/>
      {/* Gold arch accent */}
      <path d="M22 42.5Q22 36 28 36Q34 36 34 42.5" stroke="#C9A227" strokeWidth="1.6" opacity="0.82"/>
    </svg>
  );
}

export function ShahHouseIconBadge({ size = 40, rx = 13, style = {}, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 56 56"
      width={size}
      height={size}
      fill="none"
      style={style}
      className={className}
    >
      {/* Navy background */}
      <rect width="56" height="56" rx={rx} fill="#0b1d3a"/>
      {/* House silhouette */}
      <path d="M7 27L28 10L49 27V50H7Z" fill="white"/>
      {/* Gold finial */}
      <path d="M28 4L31.5 8.5L28 11L24.5 8.5Z" fill="#C9A227"/>
      {/* Gold belt */}
      <rect x="7" y="27" width="42" height="1.8" fill="#C9A227" opacity="0.78"/>
      {/* Left window */}
      <rect x="9" y="30.5" width="8" height="6" rx="1" fill="#0b1d3a" opacity="0.30"/>
      {/* Right window */}
      <rect x="39" y="30.5" width="8" height="6" rx="1" fill="#0b1d3a" opacity="0.30"/>
      {/* Arch door */}
      <path d="M22 50V42Q22 35.5 28 35.5Q34 35.5 34 42V50Z" fill="#0b1d3a"/>
      {/* Gold arch accent */}
      <path d="M22 42.5Q22 36 28 36Q34 36 34 42.5" stroke="#C9A227" strokeWidth="1.6" opacity="0.82"/>
    </svg>
  );
}

/** Full logo: icon mark + wordmark, for use in the sidebar. */
export default function ShahHouseLogo({ size = 30, collapsed = false }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className="shrink-0 flex items-center justify-center rounded-xl"
        style={{
          width: size,
          height: size,
          background: 'rgba(255,255,255,0.09)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <ShahHouseIconMark size={Math.round(size * 0.7)} />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="text-white font-bold text-[13px] leading-tight tracking-wide whitespace-nowrap">
            SHAH HOUSE
          </p>
          <p className="text-white/35 text-[10px] whitespace-nowrap">Property Manager</p>
        </div>
      )}
    </div>
  );
}
