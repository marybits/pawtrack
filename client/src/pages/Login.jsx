import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  PawPrint, ClipboardList, Pill, LineChart,
  Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthProvider.jsx";

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg:        "#F8F7FA",
  leftBg:    "#F1EFFF",
  card:      "#FFFFFF",
  brand:     "#6B5E8E",
  brandHov:  "#594E7A",
  green:     "#57A773",
  greenBg:   "#EDF7F0",
  pink:      "#D98C9B",
  pinkBg:    "#FDF0F3",
  pinkBdr:   "#F2D5DB",
  heading:   "#2D2A35",
  body:      "#7A7782",
  border:    "#E0DEE6",
  inputBg:   "#F8F7FA",
  shadow:    "0 4px 40px rgba(107, 94, 142, 0.10)",
  shadowSm:  "0 2px 16px rgba(107, 94, 142, 0.07)",
};

// ── Feature value props ───────────────────────────────────────────────────
const FEATURES = [
  {
    Icon: ClipboardList,
    title: "A complete health record",
    desc:  "Meals, weight, stool, medication, and vet notes — all in one structured log.",
  },
  {
    Icon: Pill,
    title: "Prescription management",
    desc:  "Track dosing intervals and get reminded before the next dose is due.",
  },
  {
    Icon: LineChart,
    title: "Pattern recognition",
    desc:  "AI surfaces health trends across 30 days of care data, before they become concerns.",
  },
];

// ── Static preview card ────────────────────────────────────────────────────
function PreviewCard() {
  return (
    <div
      style={{
        background:   C.card,
        borderRadius: 16,
        border:       `1px solid ${C.border}`,
        boxShadow:    C.shadowSm,
        overflow:     "hidden",
      }}
    >
      {/* Pet header */}
      <div
        style={{
          padding:      "14px 16px",
          display:      "flex",
          alignItems:   "center",
          gap:          12,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            width:           38,
            height:          38,
            borderRadius:    10,
            background:      "#EBE8F7",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            flexShrink:      0,
          }}
        >
          <PawPrint size={17} strokeWidth={1.75} color={C.brand} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.heading, lineHeight: 1.2 }}>Sophia</p>
          <p style={{ fontSize: 11, color: C.body, marginTop: 1 }}>Russian Blue cat · 10 yr · 3.2 kg</p>
        </div>
        <span
          style={{
            fontSize:     10,
            fontWeight:   600,
            background:   C.greenBg,
            color:        C.green,
            padding:      "3px 9px",
            borderRadius: 20,
            flexShrink:   0,
          }}
        >
          Active
        </span>
      </div>
    </div>
  );
}

// ── Left marketing panel ───────────────────────────────────────────────────
function MarketingPanel() {
  return (
    <div
      className="hidden lg:flex flex-col h-full"
      style={{ background: C.leftBg, padding: "48px 52px" }}
    >
      {/* Wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width:           36,
            height:          36,
            borderRadius:    10,
            background:      "#DDDAF7",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
          }}
        >
          <PawPrint size={18} strokeWidth={1.75} color={C.brand} />
        </div>
        <span
          style={{
            fontSize:    18,
            fontWeight:  700,
            color:       C.heading,
            letterSpacing: "-0.02em",
          }}
        >
          PawTrack
        </span>
      </div>

      {/* Headline */}
      <div style={{ marginTop: 56, marginBottom: 36 }}>
        <p
          style={{
            fontSize:      10.5,
            fontWeight:    600,
            color:         "#A89EC5",
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            marginBottom:  20,
          }}
        >
          Pet care, reimagined
        </p>
        <h1
          style={{
            fontSize:      "clamp(1.9rem, 2.8vw, 2.45rem)",
            fontWeight:    700,
            color:         C.heading,
            lineHeight:    1.12,
            letterSpacing: "-0.028em",
            margin:        0,
          }}
        >
          Log everything.<br />
          Miss nothing.<br />
          <span style={{ color: C.brand }}>Care better.</span>
        </h1>
      </div>

      {/* Feature list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 22, marginBottom: 40 }}>
        {FEATURES.map(({ Icon, title, desc }) => (
          <div key={title} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div
              style={{
                width:           34,
                height:          34,
                borderRadius:    9,
                background:      "#E8E5F7",
                border:          `1px solid #D8D4EF`,
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                flexShrink:      0,
                marginTop:       1,
              }}
            >
              <Icon size={14} strokeWidth={1.75} color={C.brand} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.heading, lineHeight: 1.3 }}>{title}</p>
              <p style={{ fontSize: 12, color: C.body, lineHeight: 1.55, marginTop: 2 }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Preview card */}
      <PreviewCard />

      {/* Footer */}
      <p style={{ marginTop: "auto", paddingTop: 32, fontSize: 11, color: "#B0AEBE" }}>
        PawTrack · Trusted by pet parents who care deeply.
      </p>
    </div>
  );
}

// ── Shared input class ─────────────────────────────────────────────────────
const inp =
  "w-full rounded-xl border px-3.5 py-2.5 text-sm transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-[#6B5E8E]/20 focus:border-[#6B5E8E] " +
  "placeholder:text-[#BCBAC4]";

// ── Main component ─────────────────────────────────────────────────────────
export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from     = location.state?.from?.pathname ?? "/pets";

  const [tab, setTab]           = useState("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  function switchTab(t) {
    setTab(t);
    setError("");
    setUsername("");
    setEmail("");
    setPassword("");
    setShowPwd(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "signin") {
        await login(username, password);
      } else {
        await register(username, email, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: C.bg }}>

      {/* ── Left panel — sticky ───────────────────────────────────────── */}
      <div className="hidden lg:block w-1/2 flex-shrink-0">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <MarketingPanel />
        </div>
      </div>

      {/* ── Right auth panel ─────────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col items-center justify-center min-h-screen px-5 py-12"
        style={{ background: C.bg }}
      >

        {/* Mobile wordmark — hidden lg */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "#DDDAF7" }}
          >
            <PawPrint size={26} strokeWidth={1.75} color={C.brand} />
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: C.heading, letterSpacing: "-0.02em" }}>
            PawTrack
          </span>
          <p style={{ marginTop: 6, fontSize: 13, color: C.body }}>Your pet's health, organized.</p>
        </div>

        <div className="w-full max-w-[380px]">

          {/* Desktop welcome */}
          <div className="hidden lg:block mb-7">
            <h2
              style={{
                fontSize:      "1.55rem",
                fontWeight:    700,
                color:         C.heading,
                letterSpacing: "-0.025em",
                lineHeight:    1.2,
              }}
            >
              {tab === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p style={{ fontSize: 14, color: C.body, marginTop: 6 }}>
              {tab === "signin"
                ? "Sign in to your PawTrack account."
                : "Start your pet's health record today."}
            </p>
          </div>

          {/* Auth card */}
          <div
            style={{
              background:   C.card,
              borderRadius: 18,
              border:       `1px solid ${C.border}`,
              boxShadow:    C.shadow,
              overflow:     "hidden",
            }}
          >
            {/* Tab bar */}
            <div
              style={{
                display:     "flex",
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              {[
                { key: "signin", label: "Sign in"        },
                { key: "signup", label: "Create account" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => switchTab(key)}
                  style={{
                    flex:          1,
                    padding:       "14px 0",
                    fontSize:      13.5,
                    fontWeight:    tab === key ? 600 : 400,
                    color:         tab === key ? C.heading : C.body,
                    background:    "transparent",
                    border:        "none",
                    borderBottom:  tab === key ? `2px solid ${C.brand}` : "2px solid transparent",
                    marginBottom:  -1,
                    cursor:        "pointer",
                    transition:    "color 0.15s, border-color 0.15s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Form */}
            <div style={{ padding: "24px 24px 28px" }}>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Username */}
                <div>
                  <label
                    style={{
                      display:       "block",
                      fontSize:      10,
                      fontWeight:    600,
                      color:         C.body,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      marginBottom:  6,
                    }}
                  >
                    Username
                  </label>
                  <input
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="your_username"
                    className={inp}
                    style={{
                      background: C.inputBg,
                      borderColor: C.border,
                      color: C.heading,
                    }}
                  />
                </div>

                {/* Email — signup only */}
                {tab === "signup" && (
                  <div>
                    <label
                      style={{
                        display:       "block",
                        fontSize:      10,
                        fontWeight:    600,
                        color:         C.body,
                        letterSpacing: "0.10em",
                        textTransform: "uppercase",
                        marginBottom:  6,
                      }}
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={inp}
                      style={{
                        background: C.inputBg,
                        borderColor: C.border,
                        color: C.heading,
                      }}
                    />
                  </div>
                )}

                {/* Password */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <label
                      style={{
                        fontSize:      10,
                        fontWeight:    600,
                        color:         C.body,
                        letterSpacing: "0.10em",
                        textTransform: "uppercase",
                      }}
                    >
                      Password
                    </label>
                    {tab === "signin" && (
                      <button
                        type="button"
                        tabIndex={-1}
                        style={{
                          fontSize:   11.5,
                          fontWeight: 500,
                          color:      C.brand,
                          background: "none",
                          border:     "none",
                          cursor:     "pointer",
                          padding:    0,
                        }}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPwd ? "text" : "password"}
                      autoComplete={tab === "signin" ? "current-password" : "new-password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={inp}
                      style={{
                        background:   C.inputBg,
                        borderColor:  C.border,
                        color:        C.heading,
                        paddingRight: 42,
                      }}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPwd((v) => !v)}
                      aria-label={showPwd ? "Hide password" : "Show password"}
                      style={{
                        position:  "absolute",
                        right:     12,
                        top:       "50%",
                        transform: "translateY(-50%)",
                        color:     C.body,
                        background: "none",
                        border:    "none",
                        cursor:    "pointer",
                        padding:   0,
                        display:   "flex",
                      }}
                    >
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Error state */}
                {error && (
                  <div
                    style={{
                      display:      "flex",
                      alignItems:   "flex-start",
                      gap:          8,
                      background:   "#FDF0F3",
                      border:       `1px solid ${C.pinkBdr}`,
                      borderRadius: 10,
                      padding:      "10px 12px",
                    }}
                  >
                    <AlertCircle size={14} color={C.pink} style={{ marginTop: 1, flexShrink: 0 }} />
                    <p style={{ fontSize: 13, color: "#B4566A", lineHeight: 1.4 }}>{error}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop:      4,
                    width:          "100%",
                    background:     C.brand,
                    color:          "#FFFFFF",
                    border:         "none",
                    borderRadius:   12,
                    padding:        "12px 16px",
                    fontSize:       14,
                    fontWeight:     600,
                    cursor:         loading ? "not-allowed" : "pointer",
                    opacity:        loading ? 0.72 : 1,
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    gap:            7,
                    transition:     "background 0.15s, opacity 0.20s",
                  }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = C.brandHov; }}
                  onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = C.brand; }}
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin"
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        style={{ flexShrink: 0 }}
                      >
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.30" strokeWidth="3" />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      {tab === "signin" ? "Signing in…" : "Creating account…"}
                    </>
                  ) : (
                    <>
                      {tab === "signin" ? "Sign in" : "Create account"}
                      <ArrowRight size={14} strokeWidth={2.25} />
                    </>
                  )}
                </button>

              </form>
            </div>
          </div>

          {/* Below-card */}
          {tab === "signin" ? (
            <p
              style={{
                textAlign:  "center",
                fontSize:   13.5,
                color:      C.body,
                marginTop:  18,
              }}
            >
              New to PawTrack?{" "}
              <button
                onClick={() => switchTab("signup")}
                style={{
                  color:      C.brand,
                  fontWeight: 600,
                  background: "none",
                  border:     "none",
                  cursor:     "pointer",
                  padding:    0,
                  fontSize:   "inherit",
                }}
              >
                Create a free account →
              </button>
            </p>
          ) : (
            <p
              style={{
                textAlign:  "center",
                fontSize:   11.5,
                color:      "#BCBAC4",
                marginTop:  18,
                lineHeight: 1.6,
              }}
            >
              By creating an account you agree to our{" "}
              <span style={{ color: C.body, cursor: "pointer" }}>Terms</span>
              {" "}and{" "}
              <span style={{ color: C.body, cursor: "pointer" }}>Privacy Policy</span>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
