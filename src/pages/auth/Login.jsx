import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  RiMailLine,
  RiLockLine,
  RiEyeLine,
  RiEyeOffLine,
  RiHome4Line,
  RiShieldCheckLine,
  RiCalendarCheckLine,
  RiHammerLine,
  RiArrowRightLine,
  RiCheckLine,
} from "react-icons/ri";
import {
  loginUser,
  selectIsAuthenticated,
  selectAuthError,
  clearAuthError,
} from "../../store/slices/authSlice";
import heroImg from "../../assets/hero.png";

/* ─── tiny decorative rule ─── */
function Divider({ color = "rgba(255,255,255,0.15)" }) {
  return (
    <div className="flex items-center gap-2.5 my-6">
      <div className="flex-1 h-px" style={{ background: color }} />
      <div
        className="w-1.5 h-1.5 border rotate-45"
        style={{ borderColor: color }}
      />
      <div className="flex-1 h-px" style={{ background: color }} />
    </div>
  );
}

/* ─── floating-label input ─── */
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
  const lifted = focus || (value && value.length > 0);

  return (
    <div className="relative">
      <label
        htmlFor={id}
        className="absolute left-3.5 z-10 pointer-events-none transition-all duration-200 select-none"
        style={{
          top: lifted ? 7 : "50%",
          transform: lifted ? "none" : "translateY(-50%)",
          fontSize: lifted ? 10 : 14,
          letterSpacing: lifted ? "0.14em" : "0.01em",
          textTransform: lifted ? "uppercase" : "none",
          color: hasError ? "#ef4444" : focus ? "#0b1d3a" : "#94a3b8",
          fontWeight: lifted ? 700 : 400,
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={onChange}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        className="block w-full outline-none text-[14px] text-slate-800 transition-all duration-200"
        style={{
          background: focus ? "#fff" : "#f8fafc",
          border: `1.5px solid ${hasError ? "#fca5a5" : focus ? "#0b1d3a" : "#e2e8f0"}`,
          borderRadius: 12,
          padding: lifted ? "22px 48px 8px 14px" : "16px 48px 16px 14px",
          boxShadow: focus ? "0 0 0 3px rgba(11,29,58,0.08)" : "none",
        }}
      />
      {suffix && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
          {suffix}
        </div>
      )}
    </div>
  );
}

const DEMO = [
  { label: "Owner", email: "admin@shahhouse.ae", password: "shah2026" },
  { label: "Manager", email: "manager@shahhouse.ae", password: "manager123" },
];

const FEATURES = [
  {
    icon: RiCalendarCheckLine,
    text: "Maintenance schedules & service tracking",
  },
  { icon: RiShieldCheckLine, text: "Warranty & contract expiry monitoring" },
  { icon: RiHammerLine, text: "Repairs, expenses & full service history" },
];

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuth = useSelector(selectIsAuthenticated);
  const authError = useSelector(selectAuthError);

  const [email, setEmail] = useState("admin@villa.ae");
  const [pass, setPass] = useState("villa2026");
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (isAuth) {
      const from = location.state?.from?.pathname ?? "/";
      navigate(from, { replace: true });
    }
  }, [isAuth]);

  useEffect(
    () => () => {
      dispatch(clearAuthError());
    },
    [],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (!pass.trim()) return;

    setStatus("loading");
    dispatch(clearAuthError());
    await new Promise((r) => setTimeout(r, 700));
    dispatch(loginUser({ email: email.trim(), password: pass }));
    setStatus("idle");
  };

  const fillDemo = (cred) => {
    setEmail(cred.email);
    setPass(cred.password);
    dispatch(clearAuthError());
    setStatus("idle");
  };

  const busy = status === "loading";

  return (
    <>
      {/* ── authenticating overlay ── */}
      {busy && (
        <div
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center"
          style={{
            background: "rgba(7,16,34,0.8)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div className="relative w-16 h-16 mb-6">
            <svg
              className="absolute inset-0 animate-spin"
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              style={{ animationDuration: "1.1s" }}
            >
              <circle
                cx="32"
                cy="32"
                r="26"
                stroke="rgba(99,179,237,0.15)"
                strokeWidth="4"
              />
              <path
                d="M32 6 a26 26 0 0 1 26 26"
                stroke="#3b82f6"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <RiHome4Line className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-[11px] tracking-[0.28em] uppercase font-bold text-blue-100">
            Signing you in…
          </p>
          <p className="text-[10px] tracking-[0.18em] mt-1.5 text-white/30">
            AHMS — Shah House
          </p>
        </div>
      )}

      <div className="fixed inset-0 flex overflow-hidden">
        {/* ════ LEFT PANEL — Villa Image ════ */}
        <div
          className="hidden lg:block relative flex-shrink-0 overflow-hidden"
          style={{ width: "46%", minWidth: 300 }}
        >
          {/* Hero photo */}
          <img
            src={heroImg}
            alt="Luxury villa"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(160deg, rgba(7,16,34,0.72) 0%, rgba(7,16,34,0.38) 45%, rgba(7,16,34,0.85) 100%)",
            }}
          />

          {/* Top accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(59,130,246,0.7), transparent)",
            }}
          />

          {/* Corner brackets */}
          {[
            {
              top: 20,
              left: 20,
              borderTop: "1px solid rgba(255,255,255,0.22)",
              borderLeft: "1px solid rgba(255,255,255,0.22)",
            },
            {
              top: 20,
              right: 20,
              borderTop: "1px solid rgba(255,255,255,0.22)",
              borderRight: "1px solid rgba(255,255,255,0.22)",
            },
            {
              bottom: 20,
              left: 20,
              borderBottom: "1px solid rgba(255,255,255,0.22)",
              borderLeft: "1px solid rgba(255,255,255,0.22)",
            },
            {
              bottom: 20,
              right: 20,
              borderBottom: "1px solid rgba(255,255,255,0.22)",
              borderRight: "1px solid rgba(255,255,255,0.22)",
            },
          ].map((s, i) => (
            <div key={i} className="absolute w-5 h-5" style={s} />
          ))}

          <div className="relative z-10 h-full flex flex-col justify-between p-10">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{
                  background: "rgba(59,130,246,0.25)",
                  border: "1px solid rgba(59,130,246,0.35)",
                }}
              >
                <RiHome4Line className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <p className="text-white font-bold text-[17px] leading-tight">
                  AHMS
                </p>
                <p className="text-white/35 text-[10px] tracking-widest uppercase">
                  Shah House
                </p>
              </div>
            </div>

            {/* Headline */}
            <div>
              <Divider />
              <h1 className="text-[clamp(1.8rem,2.5vw,2.4rem)] font-light text-white leading-snug tracking-tight">
                Your luxury home,
                <br />
                <span className="font-bold" style={{ color: "#93c5fd" }}>
                  perfectly managed.
                </span>
              </h1>
              <p className="mt-3 text-[13px] text-white/45 leading-relaxed max-w-[300px]">
                Contracts, maintenance, warranties, repairs, and expenses — all
                in one elegant dashboard.
              </p>

              <div className="mt-6 space-y-3.5">
                {FEATURES.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(59,130,246,0.18)",
                        border: "1px solid rgba(59,130,246,0.25)",
                      }}
                    >
                      <Icon className="w-3.5 h-3.5 text-blue-300" />
                    </div>
                    <span className="text-[12px] text-white/55">{text}</span>
                  </div>
                ))}
              </div>
              <Divider />
            </div>

            <p className="text-[10px] tracking-[0.22em] text-white/20 uppercase">
              © 2026 Shah House Management System
            </p>
          </div>
        </div>

        {/* ════ RIGHT PANEL — Form ════ */}
        <div
          className="flex-1 flex items-center justify-center p-6 overflow-y-auto"
          style={{ background: "#f5f7fa" }}
        >
          {/* Subtle bg circles */}
          <div
            className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)",
              transform: "translate(30%, -30%)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-56 h-56 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(11,29,58,0.06) 0%, transparent 70%)",
              transform: "translate(-30%, 30%)",
            }}
          />

          <div
            className="w-full max-w-[400px] relative z-10 transition-all duration-500"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(18px)",
            }}
          >
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2.5 mb-8">
              <div className="w-9 h-9 rounded-xl bg-navy-900 flex items-center justify-center shadow">
                <RiHome4Line className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-navy-900 font-bold text-[16px] leading-tight">
                  AHMS
                </p>
                <p className="text-slate-400 text-[10px] tracking-wider uppercase">
                  Shah House
                </p>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-7">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-px bg-blue-400 opacity-70" />
                <span className="text-[10px] tracking-[0.22em] font-bold text-blue-500 uppercase">
                  Management Portal
                </span>
                <div className="w-5 h-px bg-blue-400 opacity-70" />
              </div>
              <h2 className="text-[28px] font-light text-navy-900 leading-tight tracking-tight">
                Welcome back
                <br />
                <em
                  className="not-italic font-bold"
                  style={{ color: "#0b1d3a" }}
                >
                  to Shah House
                </em>
              </h2>
              <p className="mt-1.5 text-[13px] text-slate-400">
                Sign in to access your home management dashboard
              </p>
            </div>

            {/* Demo accounts */}
            <div
              className="mb-6 p-4 rounded-2xl border"
              style={{
                background: "rgba(219,234,254,0.4)",
                borderColor: "rgba(147,197,253,0.5)",
              }}
            >
              <p className="text-[11px] font-bold text-blue-700 mb-2.5 uppercase tracking-wide">
                Demo accounts — click to fill
              </p>
              <div className="flex gap-2">
                {DEMO.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => fillDemo(c)}
                    className="flex-1 py-2.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition-all text-center shadow-sm"
                  >
                    <p className="font-bold text-navy-800 text-[12px]">
                      {c.label}
                    </p>
                    <p className="text-slate-400 text-[10px] mt-0.5 truncate px-1">
                      {c.email}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Error banner */}
            {authError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 px-3.5 py-3 mb-4 rounded-xl"
                style={{
                  background: "#fef2f2",
                  border: "1.5px solid #fca5a5",
                  borderLeft: "3px solid #ef4444",
                }}
              >
                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                  <span className="text-white text-[9px] font-bold">!</span>
                </div>
                <p className="text-[13px] font-medium text-red-700">
                  {authError}
                </p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-3">
              <FloatField
                id="email"
                label="Email address"
                type="email"
                value={email}
                autoComplete="email"
                onChange={(e) => {
                  setEmail(e.target.value);
                  dispatch(clearAuthError());
                }}
                suffix={<RiMailLine className="w-4 h-4 text-slate-400" />}
              />
              <FloatField
                id="pass"
                label="Password"
                type={showPw ? "text" : "password"}
                value={pass}
                autoComplete="current-password"
                onChange={(e) => {
                  setPass(e.target.value);
                  dispatch(clearAuthError());
                }}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    tabIndex={-1}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPw ? (
                      <RiEyeOffLine className="w-4 h-4" />
                    ) : (
                      <RiEyeLine className="w-4 h-4" />
                    )}
                  </button>
                }
              />

              {/* Submit */}
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3.5 flex items-center justify-center gap-2 font-bold text-[13px] uppercase tracking-[0.22em] text-white transition-all duration-200 rounded-xl mt-2"
                style={{
                  background:
                    "linear-gradient(135deg, #0b1d3a 0%, #1e3a6e 100%)",
                  boxShadow: "0 4px 20px rgba(11,29,58,0.25)",
                  opacity: busy ? 0.7 : 1,
                  cursor: busy ? "default" : "pointer",
                }}
              >
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
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray="40"
                        strokeDashoffset="10"
                        strokeLinecap="round"
                      />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in to AHMS <RiArrowRightLine className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="mt-7 text-center text-[11px] text-slate-400 tracking-wide">
              Shah House Management · Private &amp; Secure
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer { 0%{left:-100%} 100%{left:200%} }
      `}</style>
    </>
  );
}
