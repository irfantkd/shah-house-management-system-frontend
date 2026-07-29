import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiMailLine,
  RiEyeLine,
  RiEyeOffLine,
  RiShieldCheckLine,
  RiCalendarCheckLine,
  RiHammerLine,
  RiArrowRightLine,
  RiMapPin2Line,
  RiLockLine,
} from "react-icons/ri";
import {
  loginUser,
  selectIsAuthenticated,
  selectAuthError,
  clearAuthError,
} from "../../store/slices/authSlice";
import { ShahHouseIconMark } from "../../components/ui/ShahHouseLogo";

// ─── Brand tokens ────────────────────────────────────────────────────────────
const G = "#C9A84C"; // gold
const GL = "#E8C870"; // gold light
const GD = "#A8863A"; // gold dark
const DARK = "#060D1F"; // right panel bg

// ─── Diamond SVG watermark pattern ──────────────────────────────────────────
function DiamondPattern() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.028, pointerEvents: "none" }}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="dm"
          x="0"
          y="0"
          width="32"
          height="32"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M16 2 L30 16 L16 30 L2 16 Z"
            fill="none"
            stroke={G}
            strokeWidth="0.6"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dm)" />
    </svg>
  );
}

// ─── Left-panel features ─────────────────────────────────────────────────────
const FEATURES = [
  { Icon: RiCalendarCheckLine, label: "Maintenance & service scheduling" },
  {
    Icon: RiShieldCheckLine,
    label: "Contracts, warranties & expiry monitoring",
  },
  { Icon: RiHammerLine, label: "Repairs, expenses & full service history" },
];

// ─── Floating-label input ─────────────────────────────────────────────────────
function FloatField({
  id,
  label,
  type = "text",
  value,
  onChange,
  suffix,
  hasError,
  autoComplete,
}) {
  const [focus, setFocus] = useState(false);
  const lifted = focus || value.length > 0;

  return (
    <div className="relative group">
      {/* Label */}
      <label
        htmlFor={id}
        style={{
          position: "absolute",
          left: 16,
          zIndex: 10,
          pointerEvents: "none",
          transition: "all 0.18s ease",
          top: lifted ? 10 : "50%",
          transform: lifted ? "none" : "translateY(-50%)",
          fontSize: lifted ? 9.5 : 14,
          letterSpacing: lifted ? "0.18em" : "0.01em",
          textTransform: lifted ? "uppercase" : "none",
          fontWeight: lifted ? 700 : 400,
          color: hasError ? "#f87171" : focus ? GL : "rgba(255,255,255,0.3)",
          userSelect: "none",
        }}
      >
        {label}
      </label>

      {/* Input */}
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={onChange}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        className="block w-full outline-none text-[14px] text-white"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "none",
          borderBottom: `2px solid ${hasError ? "#f87171" : focus ? G : "rgba(255,255,255,0.1)"}`,
          borderRadius: "10px 10px 0 0",
          padding: lifted ? "24px 52px 8px 16px" : "18px 52px 18px 16px",
          transition: "border-color 0.18s, background 0.18s",
        }}
      />

      {/* Bottom gold slide bar — only when focused */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 2,
          background: `linear-gradient(90deg, ${G}, ${GL})`,
          transition: "width 0.25s ease",
          width: focus ? "100%" : "0%",
          borderRadius: "0 0 0 0",
        }}
      />

      {/* Suffix icon */}
      {suffix && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {suffix}
        </div>
      )}
    </div>
  );
}

// ─── Shimmer button ──────────────────────────────────────────────────────────
function GoldButton({ loading, children }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="submit"
      disabled={loading}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative w-full overflow-hidden flex items-center justify-center gap-2.5 font-bold text-[12px] uppercase tracking-[0.28em] transition-all duration-200"
      style={{
        height: 56,
        borderRadius: 12,
        background: loading
          ? `linear-gradient(135deg, ${GD}, ${G})`
          : `linear-gradient(135deg, ${G} 0%, ${GL} 50%, ${G} 100%)`,
        color: DARK,
        boxShadow: loading
          ? "none"
          : hover
            ? `0 8px 36px ${G}55, 0 2px 8px rgba(0,0,0,0.3)`
            : `0 4px 24px ${G}40`,
        transform: hover && !loading ? "translateY(-1px)" : "none",
        opacity: loading ? 0.7 : 1,
        cursor: loading ? "default" : "pointer",
      }}
    >
      {/* Shimmer sweep */}
      {!loading && (
        <span
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.28) 50%, transparent 60%)`,
            backgroundSize: "200% 100%",
            backgroundPosition: hover ? "0% 0%" : "200% 0%",
            transition: "background-position 0.55s ease",
          }}
        />
      )}
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuth = useSelector(selectIsAuthenticated);
  const authError = useSelector(selectAuthError);

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (isAuth) {
      const from = location.state?.from?.pathname ?? "/";
      navigate(from, { replace: true });
    }
  }, [isAuth, navigate, location.state?.from?.pathname]);

  useEffect(
    () => () => {
      dispatch(clearAuthError());
    },
    [dispatch],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !pass.trim()) return;
    setBusy(true);
    dispatch(clearAuthError());
    await dispatch(loginUser({ email: email.trim(), password: pass }));
    setBusy(false);
  };

  return (
    <>
      {/* ── Signing-in overlay ── */}
      <AnimatePresence>
        {busy && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex flex-col items-center justify-center"
            style={{
              background: "rgba(4,9,20,0.93)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="relative w-[72px] h-[72px] mb-8">
              <svg
                className="absolute inset-0 animate-spin"
                width="72"
                height="72"
                viewBox="0 0 72 72"
                fill="none"
                style={{ animationDuration: "1.6s" }}
              >
                <circle
                  cx="36"
                  cy="36"
                  r="30"
                  stroke={`${G}1E`}
                  strokeWidth="2.5"
                />
                <path
                  d="M36 6 a30 30 0 0 1 30 30"
                  stroke={G}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <ShahHouseIconMark size={26} />
              </div>
            </div>
            <p
              className="text-[10px] tracking-[0.36em] uppercase font-black"
              style={{ color: G }}
            >
              Signing you in
            </p>
            <p
              className="mt-2 text-[9px] tracking-[0.24em] uppercase"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              Shah House Management System
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page shell ── */}
      <div
        className="fixed inset-0 flex overflow-hidden"
        style={{ background: DARK }}
      >
        {/* ══════ LEFT — Villa hero panel ══════ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.1 }}
          className="hidden lg:flex relative flex-col overflow-hidden"
          style={{ width: "56%", minWidth: 380 }}
        >
          {/* Full-bleed villa image */}
          <img
            src="https://t3.ftcdn.net/jpg/03/35/26/84/360_F_335268468_WhuECjWCoOfQOovIMq7VASxI0imSrnTE.jpg"
            alt="Shah House · Dubai"
            className="absolute inset-0 w-full h-full object-cover object-center"
            style={{ filter: "brightness(0.58) saturate(1.15)" }}
          />

          {/* Multi-layer cinematic veil */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg,
              rgba(6,13,31,0.82) 0%,
              rgba(6,13,31,0.42) 35%,
              rgba(6,13,31,0.30) 55%,
              rgba(6,13,31,0.78) 100%)`,
            }}
          />

          {/* Gold warmth wash at bottom */}
          <div
            className="absolute bottom-0 inset-x-0 h-80"
            style={{
              background: `linear-gradient(0deg, rgba(201,168,76,0.1) 0%, transparent 100%)`,
            }}
          />

          {/* Top edge accent */}
          <div
            className="absolute top-0 inset-x-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${G}60 35%, ${G}90 50%, ${G}60 65%, transparent 100%)`,
            }}
          />
          {/* Bottom edge accent */}
          <div
            className="absolute bottom-0 inset-x-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${G}40 50%, transparent 100%)`,
            }}
          />

          {/* Content */}
          <div className="relative z-10 h-full flex flex-col justify-between p-12 xl:p-16">
            {/* Logo mark */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : -10 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="flex items-center gap-4"
            >
              <ShahHouseIconMark size={38} />
              <div>
                <p className="text-white font-bold text-[19px] leading-none tracking-wide">
                  Shah House
                </p>
                <p
                  className="text-[8.5px] tracking-[0.38em] uppercase mt-1.5 font-medium"
                  style={{ color: `${G}80` }}
                >
                  Management System
                </p>
              </div>
            </motion.div>

            {/* Hero copy */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 24 }}
              transition={{
                duration: 0.8,
                delay: 0.2,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {/* Gold rule */}
              <div className="flex items-center gap-4 mb-7">
                <div
                  className="h-px flex-1"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${G}50)`,
                  }}
                />
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <rect
                    x="4"
                    y="0.3"
                    width="5.2"
                    height="5.2"
                    rx="0.4"
                    transform="rotate(45 4 0.3)"
                    fill="none"
                    stroke={G}
                    strokeWidth="0.8"
                    opacity="0.65"
                  />
                </svg>
                <div
                  className="h-px flex-1"
                  style={{
                    background: `linear-gradient(90deg, ${G}50, transparent)`,
                  }}
                />
              </div>

              <p
                className="text-[10px] font-black tracking-[0.32em] uppercase mb-5"
                style={{ color: `${G}` }}
              >
                Private Residence · Dubai, UAE
              </p>

              <h1
                className="leading-[1.12] tracking-tight"
                style={{ color: "rgba(255,255,255,0.95)" }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: "clamp(2rem, 2.8vw, 2.9rem)",
                    fontWeight: 200,
                  }}
                >
                  Your residence,
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: "clamp(2.1rem, 3vw, 3.1rem)",
                    fontWeight: 900,
                  }}
                >
                  always in
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: "clamp(2.1rem, 3vw, 3.1rem)",
                    fontWeight: 900,
                    color: GL,
                  }}
                >
                  perfect order.
                </span>
              </h1>

              <p
                className="mt-5 text-[12.5px] leading-[1.75] max-w-[300px]"
                style={{ color: "rgba(255,255,255,0.38)" }}
              >
                A private dashboard for Shah House — contracts, maintenance,
                warranties, expenses, and more in one secure portal.
              </p>

              {/* Feature list */}
              <div className="mt-8 space-y-4">
                {FEATURES.map(({ Icon, label }) => (
                  <div key={label} className="flex items-center gap-3.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: `${G}14`,
                        border: `1px solid ${G}28`,
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: G }} />
                    </div>
                    <span
                      className="text-[11.5px]"
                      style={{ color: "rgba(255,255,255,0.44)" }}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Rule */}
              <div
                className="h-px mt-8 mb-6"
                style={{
                  background: `linear-gradient(90deg, ${G}35, transparent)`,
                }}
              />

              {/* Location pill */}
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full"
                style={{ background: `${G}10`, border: `1px solid ${G}25` }}
              >
                <RiMapPin2Line style={{ width: 11, height: 11, color: G }} />
                <span
                  className="text-[9px] font-black tracking-[0.34em] uppercase"
                  style={{ color: `${G}90` }}
                >
                  Emirates Hills · Dubai
                </span>
              </div>
            </motion.div>

            {/* Footer */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: ready ? 1 : 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-[8.5px] tracking-[0.22em] uppercase"
              style={{ color: "rgba(255,255,255,0.15)" }}
            >
              © 2026 Shah House — Private & Confidential
            </motion.p>
          </div>
        </motion.div>

        {/* ══════ RIGHT — Form panel ══════ */}
        <div
          className="flex-1 relative flex items-center justify-center overflow-y-auto"
          style={{ background: DARK }}
        >
          {/* Diamond watermark */}
          <DiamondPattern />

          {/* Ambient glow */}
          <div
            className="absolute pointer-events-none"
            style={{
              width: 520,
              height: 520,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: `radial-gradient(circle, ${G}08 0%, transparent 68%)`,
              borderRadius: "50%",
            }}
          />
          {/* Top-right glow */}
          <div
            className="absolute pointer-events-none"
            style={{
              width: 300,
              height: 300,
              top: 0,
              right: 0,
              background: `radial-gradient(circle, ${G}07 0%, transparent 70%)`,
              transform: "translate(20%, -20%)",
              borderRadius: "50%",
            }}
          />

          {/* Form container */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 28 }}
            transition={{
              duration: 0.7,
              delay: 0.15,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="w-full relative z-10 px-6 py-10 sm:px-0"
            style={{ maxWidth: 400 }}
          >
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-10">
              <ShahHouseIconMark size={32} />
              <div>
                <p className="text-white font-bold text-[16px] leading-none">
                  Shah House
                </p>
                <p
                  className="text-[8px] tracking-[0.3em] uppercase mt-1 font-semibold"
                  style={{ color: `${G}70` }}
                >
                  Management System
                </p>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-9">
              {/* Live status indicator */}
              <div className="flex items-center gap-2.5 mb-5">
                <span className="relative flex w-2 h-2">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
                    style={{ background: G, animationDuration: "2.5s" }}
                  />
                  <span
                    className="relative inline-flex rounded-full w-2 h-2"
                    style={{ background: G }}
                  />
                </span>
                <span
                  className="text-[9px] tracking-[0.3em] font-black uppercase"
                  style={{ color: `${G}85` }}
                >
                  Secure Portal · Online
                </span>
              </div>

              <h2 style={{ color: "rgba(255,255,255,0.92)", lineHeight: 1.2 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: 28,
                    fontWeight: 200,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Welcome back
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 30,
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    color: GL,
                  }}
                >
                  to Shah House
                </span>
              </h2>

              <p
                className="mt-2.5 text-[12px]"
                style={{
                  color: "rgba(255,255,255,0.28)",
                  letterSpacing: "0.01em",
                }}
              >
                Sign in with your authorised credentials to continue
              </p>
            </div>

            {/* Error banner */}
            <AnimatePresence>
              {authError && (
                <motion.div
                  key="err"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  <div
                    className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.22)",
                      borderLeft: "3px solid #ef4444",
                    }}
                  >
                    <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-white text-[8px] font-black">
                        !
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-red-300">
                        Authentication failed
                      </p>
                      <p className="text-[11px] text-red-400/70 mt-0.5">
                        {authError}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <FloatField
                id="email"
                label="Email Address"
                type="email"
                value={email}
                autoComplete="email"
                hasError={!!authError}
                onChange={(e) => {
                  setEmail(e.target.value);
                  dispatch(clearAuthError());
                }}
                suffix={
                  <RiMailLine
                    style={{
                      width: 16,
                      height: 16,
                      color: "rgba(255,255,255,0.2)",
                    }}
                  />
                }
              />

              <FloatField
                id="pass"
                label="Password"
                type={showPw ? "text" : "password"}
                value={pass}
                autoComplete="current-password"
                hasError={!!authError}
                onChange={(e) => {
                  setPass(e.target.value);
                  dispatch(clearAuthError());
                }}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    tabIndex={-1}
                    style={{
                      color: "rgba(255,255,255,0.22)",
                      lineHeight: 0,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = G)}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "rgba(255,255,255,0.22)")
                    }
                  >
                    {showPw ? (
                      <RiEyeOffLine style={{ width: 16, height: 16 }} />
                    ) : (
                      <RiEyeLine style={{ width: 16, height: 16 }} />
                    )}
                  </button>
                }
              />

              {/* Gap before button */}
              <div className="pt-2">
                <GoldButton loading={busy}>
                  {busy ? (
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke={DARK}
                          strokeWidth="3"
                          strokeDasharray="40"
                          strokeDashoffset="10"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span>Signing in…</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <RiArrowRightLine style={{ width: 16, height: 16 }} />
                    </>
                  )}
                </GoldButton>
              </div>
            </form>

            {/* Trust strip */}
            <div
              className="mt-8 pt-6"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center justify-center gap-5">
                {[
                  { Icon: RiLockLine, text: "Encrypted" },
                  { Icon: RiShieldCheckLine, text: "Private access" },
                  { Icon: RiMapPin2Line, text: "Dubai, UAE" },
                ].map(({ Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5">
                    <Icon style={{ width: 10, height: 10, color: `${G}55` }} />
                    <span
                      className="text-[9px] tracking-[0.12em]"
                      style={{
                        color: "rgba(255,255,255,0.2)",
                        fontWeight: 600,
                      }}
                    >
                      {text}
                    </span>
                  </div>
                ))}
              </div>

              <p
                className="mt-4 text-center text-[9px] tracking-[0.22em] uppercase"
                style={{ color: "rgba(255,255,255,0.1)" }}
              >
                © 2026 Shah House Management System
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
