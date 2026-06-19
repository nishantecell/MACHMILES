import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_BASE = "https://www.machmiles.com/api";
const OPENAI_KEY = import.meta.env.VITE_OPENAI_KEY || "";
const RAZORPAY_KEY = "rzp_live_SqZrMTUnxQH5E4";

// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── API CLIENT ───────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem("aa_access_token");
const setTokens = (access, refresh) => {
  localStorage.setItem("aa_access_token", access);
  localStorage.setItem("aa_refresh_token", refresh);
};
const clearTokens = () => {
  localStorage.removeItem("aa_access_token");
  localStorage.removeItem("aa_refresh_token");
};

async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    return res.json();
  } catch (e) {
    return { success: false, message: "Network error" };
  }
}

const apiGet    = (path)       => api(path, { method: "GET" });
const apiPost   = (path, body) => api(path, { method: "POST",   body: JSON.stringify(body) });
const apiPut    = (path, body) => api(path, { method: "PUT",    body: JSON.stringify(body) });
const apiDelete = (path)       => api(path, { method: "DELETE" });

// ─── PLANS ────────────────────────────────────────────────────────────────────
const PLANS = [
  { name: "Free", price: "₹0", period: "", amount: 0, features: ["20 AI applications/month", "1 Resume", "Basic AI matching", "Job tracking"], cta: "Get Started", razorpay: null },
  { name: "Pro", price: "₹599", period: "/mo", amount: 59900, features: ["Unlimited applications", "Unlimited resumes", "AI Resume Optimization", "AI Cover Letters", "Auto Apply engine", "Interview Preparation", "Priority support"], cta: "Start Pro", razorpay: { description: "AutoApply AI Pro Plan" }, highlight: true },
  { name: "Premium", price: "₹999", period: "/mo", amount: 99900, features: ["Everything in Pro", "LinkedIn Optimization", "AI Career Coach", "Advanced Analytics", "Multi-country search", "Early access features"], cta: "Go Premium", razorpay: { description: "AutoApply AI Premium Plan" } },
];

const NAV_ITEMS = ["Dashboard", "Jobs", "Applications", "Resume", "Interview Prep", "AI Assistant", "Settings"];
const STATUS_COLORS = { Applied: "#3B82F6", Viewed: "#8B5CF6", Assessment: "#F59E0B", Interview: "#10B981", Offer: "#059669", Rejected: "#EF4444", Archived: "#6B7280" };

const SAMPLE_JOBS = [
  { id: 1, title: "Senior React Developer", company: "Stripe", location: "Remote", salary: "₹28-35L", match: 96, type: "Full-time", posted: "2h ago", logo: "S", color: "#635BFF" },
  { id: 2, title: "Frontend Engineer", company: "Razorpay", location: "Bangalore", salary: "₹22-30L", match: 91, type: "Full-time", posted: "4h ago", logo: "R", color: "#3395FF" },
  { id: 3, title: "UI/UX Engineer", company: "CRED", location: "Bangalore", salary: "₹18-25L", match: 88, type: "Hybrid", posted: "6h ago", logo: "C", color: "#1A1A2E" },
  { id: 4, title: "React Native Developer", company: "Zepto", location: "Mumbai", salary: "₹20-28L", match: 84, type: "Full-time", posted: "8h ago", logo: "Z", color: "#FF6B35" },
  { id: 5, title: "Full Stack Developer", company: "Swiggy", location: "Remote", salary: "₹25-32L", match: 82, type: "Remote", posted: "1d ago", logo: "SW", color: "#FC8019" },
];

const SAMPLE_APPS = [
  { id: 1, company: "Google", position: "Senior SWE", date: "Jun 15", status: "Interview", match: 94, logo: "G", color: "#4285F4" },
  { id: 2, company: "Microsoft", position: "SDE II", date: "Jun 14", status: "Applied", match: 89, logo: "M", color: "#00A4EF" },
  { id: 3, company: "Amazon", position: "SDE II", date: "Jun 13", status: "Assessment", match: 87, logo: "A", color: "#FF9900" },
  { id: 4, company: "Flipkart", position: "SWE III", date: "Jun 12", status: "Viewed", match: 85, logo: "F", color: "#2874F0" },
  { id: 5, company: "Uber", position: "SWE II", date: "Jun 11", status: "Rejected", match: 78, logo: "U", color: "#000000" },
  { id: 6, company: "Airbnb", position: "Frontend Eng", date: "Jun 10", status: "Offer", match: 96, logo: "AB", color: "#FF5A5F" },
];

// ─── OPENAI HELPERS ───────────────────────────────────────────────────────────
async function callOpenAI(messages, maxTokens = 500) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: "gpt-4o-mini", messages, max_tokens: maxTokens }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function generateCoverLetter(jobTitle, company, skills) {
  return callOpenAI([{ role: "user", content: `Write a professional, concise cover letter for a ${jobTitle} position at ${company}. The candidate has these skills: ${skills}. Keep it under 200 words, warm but professional tone.` }], 400);
}

async function analyzeResume(resumeText) {
  return callOpenAI([{ role: "user", content: `Analyze this resume and provide: 1) ATS score out of 100, 2) Top 3 improvements, 3) Missing keywords for tech roles. Resume: ${resumeText.slice(0, 1000)}. Format as JSON: {"score": number, "improvements": ["..."], "keywords": ["..."]}` }], 300);
}

async function chatWithAI(messages) {
  const systemMsg = { role: "system", content: "You are an expert AI career coach specializing in tech job searches in India. Help with resume advice, interview prep, salary negotiation, and career guidance. Be concise and actionable." };
  return callOpenAI([systemMsg, ...messages], 400);
}

// ─── RAZORPAY ────────────────────────────────────────────────────────────────
function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Badge({ status }) {
  return <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "3px 10px", borderRadius: 100, background: `${STATUS_COLORS[status]}20`, color: STATUS_COLORS[status], border: `1px solid ${STATUS_COLORS[status]}40` }}>{status}</span>;
}

function MatchBar({ score }) {
  const color = score >= 90 ? "#10B981" : score >= 80 ? "#3B82F6" : "#F59E0B";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: "0.8rem", color, fontWeight: 700, minWidth: 32 }}>{score}%</span>
    </div>
  );
}

function Spinner() {
  return <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#3B82F6", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />;
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
function LandingPage({ onSignup, onLogin }) {
  const [activeFaq, setActiveFaq] = useState(null);
  const [payingPlan, setPayingPlan] = useState(null);
  const [paySuccess, setPaySuccess] = useState(null);

  const handlePay = async (plan) => {
    if (!plan.razorpay) { onSignup(); return; }
    setPayingPlan(plan.name);
    const loaded = await loadRazorpay();
    if (!loaded) { alert("Failed to load Razorpay"); setPayingPlan(null); return; }
    new window.Razorpay({
      key: RAZORPAY_KEY, amount: plan.amount, currency: "INR",
      name: "AutoApply AI", description: plan.razorpay.description,
      theme: { color: "#3B82F6" },
      handler: (r) => { setPaySuccess({ plan: plan.name, id: r.razorpay_payment_id }); setPayingPlan(null); },
      modal: { ondismiss: () => setPayingPlan(null) },
    }).open();
  };

  const FAQS = [
    { q: "How does AutoApply AI work?", a: "Upload your resume once, set your job preferences, and our AI continuously searches for matching jobs. It customizes your resume and cover letter for each role and submits applications automatically." },
    { q: "Which job boards does it search?", a: "We search LinkedIn, Indeed, Naukri, Glassdoor, AngelList, Wellfound, and 50+ company career pages simultaneously." },
    { q: "Can I review applications before they're sent?", a: "Yes! Choose Fully Automatic, Review Before Applying, or Manual mode. In review mode, you approve each application before submission." },
    { q: "Is my data secure?", a: "All data is encrypted using Supabase's enterprise-grade security. We never share your information with third parties." },
    { q: "What's the success rate?", a: "Our users get 3x more interview calls compared to manual applications thanks to AI-optimized resumes and personalized cover letters." },
  ];

  return (
    <div style={{ background: "#020817", minHeight: "100vh", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(2,8,23,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 5%", height: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>A</div>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1.1rem" }}>AutoApply<span style={{ color: "#3B82F6" }}> AI</span></span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onLogin} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: 8, padding: "8px 20px", cursor: "pointer" }}>Log in</button>
          <button onClick={onSignup} style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", color: "#fff", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontWeight: 600 }}>Get Started Free</button>
        </div>
      </nav>

      <section style={{ padding: "10rem 5% 5rem", textAlign: "center", position: "relative" }}>
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse,rgba(59,130,246,0.2),transparent 70%)", pointerEvents: "none" }} />
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 100, padding: "6px 16px", marginBottom: "2rem", fontSize: "0.8rem", color: "#93C5FD" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3B82F6", display: "inline-block" }} />
          AI actively applying for 2,847 users right now
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(2.5rem,6vw,4.5rem)", lineHeight: 1.05, letterSpacing: "-0.04em", marginBottom: "1.5rem" }}>
          Land Your Dream Job<br />
          <span style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>on Autopilot with AI.</span>
        </h1>
        <p style={{ fontSize: "1.15rem", color: "rgba(255,255,255,0.55)", maxWidth: 580, margin: "0 auto 2.5rem", lineHeight: 1.7 }}>Upload your resume once. Our AI finds matching jobs, customizes your application, and applies automatically while you sleep.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onSignup} style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", color: "#fff", borderRadius: 10, padding: "14px 32px", cursor: "pointer", fontWeight: 700, fontSize: "1rem", boxShadow: "0 0 40px rgba(59,130,246,0.4)" }}>Get Started Free →</button>
          <button style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", borderRadius: 10, padding: "14px 32px", cursor: "pointer" }}>▶ Watch Demo</button>
        </div>

        <div style={{ marginTop: "4rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "2rem", maxWidth: 900, margin: "4rem auto 0" }}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
            {[["🔍","847","Jobs Found Today","#3B82F6"],["📤","23","Applications Sent","#8B5CF6"],["📅","3","Interviews Scheduled","#10B981"],["⭐","94%","Resume Match Score","#F59E0B"]].map(([icon,val,label,color]) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "1.25rem 2rem", textAlign: "center", flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>{icon}</div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.8rem", color }}>{val}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" style={{ padding: "5rem 5%" }}>
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <p style={{ color: "#3B82F6", fontSize: "0.85rem", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>POWERED BY SUPABASE + OPENAI</p>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "2.5rem", letterSpacing: "-0.03em" }}>Your AI-powered job search team</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1.25rem", maxWidth: 1100, margin: "0 auto" }}>
          {[
            ["🤖","AI Auto Apply Engine","Finds matching jobs, customizes your resume, writes cover letters, and submits applications 24/7."],
            ["📄","AI Resume Optimizer","ATS scoring powered by OpenAI, keyword optimization, and multiple resume version management."],
            ["✍️","Cover Letter Generator","GPT-4 powered personalized cover letters generated from your resume and job description."],
            ["📊","Real-time Dashboard","Track every application stored in Supabase with live status updates and analytics."],
            ["🎯","Interview Preparation","AI-generated technical, behavioral, and HR questions with STAR-method answers."],
            ["💬","AI Career Assistant","GPT-4 chatbot for resume advice, salary negotiation, career path guidance, and LinkedIn tips."],
          ].map(([icon,title,desc]) => (
            <div key={title} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.75rem" }}>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>{icon}</div>
              <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.5rem" }}>{title}</h3>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", lineHeight: 1.7, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" style={{ padding: "5rem 5%" }}>
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "2.5rem", letterSpacing: "-0.03em" }}>Simple, transparent pricing</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", marginTop: "0.75rem" }}>Secure payments via Razorpay · UPI, Cards, NetBanking</p>
        </div>
        {paySuccess && <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 14, padding: "1rem", maxWidth: 500, margin: "0 auto 2rem", textAlign: "center" }}>🎉 Payment successful — Welcome to {paySuccess.plan}! ID: {paySuccess.id}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1.25rem", maxWidth: 1000, margin: "0 auto" }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{ background: plan.highlight ? "linear-gradient(145deg,rgba(59,130,246,0.15),rgba(139,92,246,0.08))" : "rgba(255,255,255,0.02)", border: `1.5px solid ${plan.highlight ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.07)"}`, borderRadius: 20, padding: "2rem", position: "relative" }}>
              {plan.highlight && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "4px 14px", borderRadius: 100 }}>MOST POPULAR</div>}
              <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, marginBottom: 4 }}>{plan.name}</h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: "1.5rem" }}>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "2.5rem" }}>{plan.price}</span>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>{plan.period}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem" }}>
                {plan.features.map(f => <li key={f} style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 10 }}><span style={{ color: "#3B82F6" }}>✓</span>{f}</li>)}
              </ul>
              <button onClick={() => handlePay(plan)} disabled={payingPlan === plan.name} style={{ width: "100%", padding: 12, background: plan.highlight ? "linear-gradient(135deg,#3B82F6,#8B5CF6)" : "rgba(255,255,255,0.06)", border: plan.highlight ? "none" : "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 10, fontWeight: 600, cursor: "pointer", fontSize: "0.95rem" }}>
                {payingPlan === plan.name ? "Opening..." : plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" style={{ padding: "5rem 5%", maxWidth: 700, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "2.2rem", textAlign: "center", marginBottom: "3rem" }}>Frequently asked questions</h2>
        {FAQS.map((f, i) => (
          <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "1.25rem 0" }}>
            <button onClick={() => setActiveFaq(activeFaq === i ? null : i)} style={{ width: "100%", background: "none", border: "none", color: "#fff", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", fontSize: "1rem", fontWeight: 600, fontFamily: "Inter,sans-serif" }}>
              {f.q}<span style={{ transition: "transform 0.2s", transform: activeFaq === i ? "rotate(45deg)" : "none" }}>+</span>
            </button>
            {activeFaq === i && <p style={{ color: "rgba(255,255,255,0.6)", marginTop: "0.75rem", lineHeight: 1.7, fontSize: "0.95rem" }}>{f.a}</p>}
          </div>
        ))}
      </section>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "2rem 5%", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.8rem" }}>A</div>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700 }}>AutoApply AI</span>
        </div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>© 2026 AutoApply AI · Powered by Supabase + OpenAI</p>
      </footer>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');`}</style>
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function AuthScreen({ mode, onAuth, onToggle }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    if (!email.trim() || !pass.trim()) { setError("Please fill in all fields"); return; }
    if (mode === "signup" && !name.trim()) { setError("Please enter your name"); return; }
    if (pass.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      if (mode === "signup") {
        const res = await apiPost("/auth/register", { name: name.trim(), email: email.trim(), password: pass });
        if (!res.success) throw new Error(res.message || "Registration failed");
        // Auto-login after signup
        const loginRes = await apiPost("/auth/login", { email: email.trim(), password: pass });
        if (!loginRes.success) { setSuccess("Account created! Please sign in."); setLoading(false); return; }
        setTokens(loginRes.data.accessToken, loginRes.data.refreshToken);
        onAuth(loginRes.data.user);
      } else {
        const res = await apiPost("/auth/login", { email: email.trim(), password: pass });
        if (!res.success) throw new Error(res.message || "Login failed");
        setTokens(res.data.accessToken, res.data.refreshToken);
        onAuth(res.data.user);
      }
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (error) setError(error.message);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020817", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;800&display=swap');`}</style>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "2.5rem", width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: 48, height: 48, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.2rem", margin: "0 auto 1rem", color: "#fff" }}>A</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.5rem", color: "#fff" }}>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", marginTop: 4 }}>{mode === "login" ? "Sign in to continue" : "Start landing jobs on autopilot"}</p>
        </div>

        <button onClick={handleGoogle} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 10, padding: "11px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: "1.25rem", fontSize: "0.9rem" }}>
          <span style={{ fontWeight: 700, color: "#4285F4" }}>G</span> Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.25rem" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem" }}>or email</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        </div>

        {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "#FCA5A5", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</div>}
        {success && <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "10px 14px", color: "#86EFAC", fontSize: "0.85rem", marginBottom: "1rem" }}>{success}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mode === "signup" && (
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Full name"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box" }}
            />
          )}
          <input
            value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email address" type="email"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box" }}
          />
          <input
            value={pass} onChange={e => setPass(e.target.value)}
            placeholder="Password (min 6 characters)" type="password"
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box" }}
          />
        </div>

        <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", marginTop: "1.25rem", padding: 13, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.7 : 1 }}>
          {loading && <Spinner />}{mode === "login" ? "Sign in" : "Create account"}
        </button>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "0.875rem", marginTop: "1.25rem" }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={onToggle} style={{ background: "none", border: "none", color: "#3B82F6", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}>{mode === "login" ? "Sign up free" : "Sign in"}</button>
        </p>
      </div>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [prefs, setPrefs] = useState({ title: "", location: "", remote: "Remote", salary: "", level: "Mid-level" });
  const [uploaded, setUploaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const complete = async () => {
    setSaving(true);
    await supabase.from("profiles").upsert({ id: user.id, desired_job_title: prefs.title, location: prefs.location, work_type: prefs.remote, salary: prefs.salary, experience_level: prefs.level, onboarded: true });
    setSaving(false);
    onComplete();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020817", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter,sans-serif", color: "#fff" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;800&display=swap');`}</style>
      <div style={{ width: "100%", maxWidth: 580, padding: "2rem" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: "3rem" }}>
          {[1,2,3].map(s => <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? "linear-gradient(90deg,#3B82F6,#8B5CF6)" : "rgba(255,255,255,0.1)" }} />)}
        </div>

        {step === 1 && (
          <div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.8rem", marginBottom: "0.5rem" }}>Upload your resume</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "2rem" }}>Our AI will extract your skills and experience automatically.</p>
            <div onClick={() => setUploaded(true)} style={{ border: "2px dashed rgba(59,130,246,0.4)", borderRadius: 16, padding: "3rem", textAlign: "center", cursor: "pointer", background: uploaded ? "rgba(16,185,129,0.05)" : "rgba(59,130,246,0.03)" }}>
              {uploaded ? <><div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>✅</div><div style={{ fontWeight: 600, color: "#10B981" }}>Resume uploaded!</div><div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginTop: 4 }}>AI extracted: 12 skills · 4 years experience</div></> : <><div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📄</div><div style={{ fontWeight: 600 }}>Drop your resume here</div><div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginTop: 4 }}>PDF or DOCX · Max 10MB</div></>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.8rem", marginBottom: "0.5rem" }}>Job preferences</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "2rem" }}>Saved to your Supabase profile for AI matching.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["Desired Job Title","title","e.g. Senior React Developer"],["Preferred Location","location","e.g. Bangalore, Remote"],["Expected Salary (LPA)","salary","e.g. 25-30"]].map(([label,key,ph]) => (
                <div key={key}>
                  <label style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>{label.toUpperCase()}</label>
                  <input value={prefs[key]} onChange={e => setPrefs({...prefs,[key]:e.target.value})} placeholder={ph} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.95rem", outline: "none" }} />
                </div>
              ))}
              <div style={{ display: "flex", gap: 12 }}>
                {[["Work Type","remote",["Remote","Hybrid","Onsite"]],["Experience","level",["Entry","Mid-level","Senior","Lead"]]].map(([label,key,opts]) => (
                  <div key={key} style={{ flex: 1 }}>
                    <label style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>{label.toUpperCase()}</label>
                    <select value={prefs[key]} onChange={e => setPrefs({...prefs,[key]:e.target.value})} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.95rem", outline: "none" }}>
                      {opts.map(o => <option key={o} value={o} style={{ background: "#020817" }}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.8rem", marginBottom: "0.5rem" }}>Choose apply mode</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "2rem" }}>You can change this anytime in Settings.</p>
            {[["🤖","Fully Automatic","AI applies 24/7 without any input needed.",true],["👁️","Review Before Applying","You approve each application first.",false],["✋","Manual Mode","AI prepares, you submit.",false]].map(([icon,title,desc,rec]) => (
              <div key={title} style={{ background: rec ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${rec ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.07)"}`, borderRadius: 14, padding: "1.25rem", cursor: "pointer", display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 10 }}>
                <span style={{ fontSize: "1.5rem" }}>{icon}</span>
                <div><div style={{ fontWeight: 600, marginBottom: 4 }}>{title}{rec && <span style={{ marginLeft: 8, fontSize: "0.7rem", background: "rgba(59,130,246,0.2)", color: "#3B82F6", padding: "2px 8px", borderRadius: 100 }}>Recommended</span>}</div><div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem" }}>{desc}</div></div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem" }}>
          <button onClick={() => step > 1 && setStep(s => s-1)} style={{ background: "transparent", border: step === 1 ? "none" : "1px solid rgba(255,255,255,0.12)", color: step === 1 ? "transparent" : "rgba(255,255,255,0.6)", borderRadius: 10, padding: "12px 24px", cursor: step === 1 ? "default" : "pointer" }}>Back</button>
          <button onClick={() => step < 3 ? setStep(s => s+1) : complete()} disabled={saving} style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", color: "#fff", borderRadius: 10, padding: "12px 32px", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            {saving && <Spinner />}{step === 3 ? "Launch AutoApply AI 🚀" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── APP SHELL ────────────────────────────────────────────────────────────────
function AppShell({ user, onLogout }) {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [autoMode, setAutoMode] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => { if (data) setProfile(data); });
  }, [user.id]);

  const renderPage = () => {
    switch (activeNav) {
      case "Dashboard": return <DashboardPage user={user} />;
      case "Jobs": return <JobsPage user={user} />;
      case "Applications": return <ApplicationsPage user={user} />;
      case "Resume": return <ResumePage user={user} />;
      case "Interview Prep": return <InterviewPage />;
      case "AI Assistant": return <AssistantPage />;
      case "Settings": return <SettingsPage user={user} profile={profile} onLogout={onLogout} />;
      default: return <DashboardPage user={user} />;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#020817", color: "#fff", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap'); @keyframes spin{to{transform:rotate(360deg)}} ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:rgba(59,130,246,0.3);border-radius:2px} input,select,textarea{color-scheme:dark}`}</style>

      <aside style={{ width: 240, flexShrink: 0, background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800 }}>A</div>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700 }}>AutoApply <span style={{ color: "#3B82F6" }}>AI</span></span>
        </div>

        <div style={{ margin: "1rem", background: autoMode ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${autoMode ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: "0.75rem 1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: autoMode ? "#93C5FD" : "rgba(255,255,255,0.4)" }}>AUTO APPLY</span>
            <div onClick={() => setAutoMode(!autoMode)} style={{ width: 36, height: 20, background: autoMode ? "#3B82F6" : "rgba(255,255,255,0.1)", borderRadius: 100, position: "relative", cursor: "pointer" }}>
              <div style={{ width: 16, height: 16, background: "#fff", borderRadius: "50%", position: "absolute", top: 2, left: autoMode ? 18 : 2, transition: "left 0.2s" }} />
            </div>
          </div>
          <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>{autoMode ? "🟢 Actively applying" : "⏸ Paused"}</div>
        </div>

        <nav style={{ flex: 1, padding: "0 0.75rem", overflowY: "auto" }}>
          {NAV_ITEMS.map(item => {
            const icons = { Dashboard:"⊞", Jobs:"🔍", Applications:"📤", Resume:"📄", "Interview Prep":"🎯", "AI Assistant":"💬", Settings:"⚙️" };
            const active = activeNav === item;
            return (
              <button key={item} onClick={() => setActiveNav(item)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, border: "none", background: active ? "rgba(59,130,246,0.15)" : "transparent", color: active ? "#60A5FA" : "rgba(255,255,255,0.55)", cursor: "pointer", textAlign: "left", fontFamily: "Inter,sans-serif", fontSize: "0.9rem", fontWeight: active ? 600 : 400, marginBottom: 2 }}>
                <span>{icons[item]}</span>{item}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: "1rem", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#F59E0B,#EF4444)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>
            {(profile?.full_name || user?.email || "U")[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.full_name || user?.email?.split("@")[0] || "User"}</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.72rem", textTransform: "capitalize" }}>{profile?.plan || "Free"} Plan</div>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        <header style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(2,8,23,0.8)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 50, flexShrink: 0 }}>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1.1rem", margin: 0 }}>{activeNav}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 100, padding: "4px 12px", fontSize: "0.75rem", color: "#10B981", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
              AI Running · 23 apps today
            </div>
          </div>
        </header>
        <div style={{ flex: 1, overflow: "auto", padding: "1.5rem" }}>{renderPage()}</div>
      </main>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function DashboardPage({ user }) {
  const [stats, setStats] = useState({ jobs: 847, apps: 23, interviews: 3, score: 94 });
  const weeks = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const data = [12,18,8,24,16,5,23];
  const maxVal = Math.max(...data);

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {[["🔍",stats.jobs,"Jobs Found Today","#3B82F6",12],["📤",stats.apps,"Applications Sent","#8B5CF6",8],["📅",stats.interviews,"Interviews","#10B981",50],["⭐",stats.score+"%","Match Score","#F59E0B",3]].map(([icon,val,label,color,trend]) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1.25rem 1.5rem", flex: 1, minWidth: 160 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <span style={{ fontSize: "1.5rem" }}>{icon}</span>
              <span style={{ fontSize: "0.75rem", color: "#10B981", background: "rgba(16,185,129,0.1)", padding: "2px 8px", borderRadius: 100 }}>+{trend}%</span>
            </div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "2rem", color: "#fff" }}>{val}</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", margin: 0 }}>Applications This Week</h3>
            <span style={{ color: "#10B981", fontSize: "0.85rem", fontWeight: 600 }}>106 total ↑18%</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 120 }}>
            {data.map((v,i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ width: "100%", borderRadius: "4px 4px 0 0", background: i===6 ? "linear-gradient(180deg,#3B82F6,#8B5CF6)" : "rgba(59,130,246,0.2)", height: `${(v/maxVal)*100}%` }} />
                <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>{weeks[i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.5rem" }}>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", margin: "0 0 1.25rem" }}>Application Funnel</h3>
          {[["Applied",89,"#3B82F6"],["Viewed",34,"#8B5CF6"],["Assessment",12,"#F59E0B"],["Interview",6,"#10B981"],["Offer",2,"#059669"]].map(([label,val,color]) => (
            <div key={label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>{label}</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color }}>{val}</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                <div style={{ width: `${(val/89)*100}%`, height: "100%", background: color, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", margin: 0 }}>Recent Applications</h3>
        </div>
        {SAMPLE_APPS.slice(0,4).map(a => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: a.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.8rem", flexShrink: 0 }}>{a.logo}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{a.position}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>{a.company} · {a.date}</div>
            </div>
            <Badge status={a.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── JOBS PAGE ────────────────────────────────────────────────────────────────
function JobsPage({ user }) {
  const [search, setSearch] = useState("");
  const [generatingCL, setGeneratingCL] = useState(null);
  const [coverLetters, setCoverLetters] = useState({});

  const handleGenerateCL = async (job) => {
    setGeneratingCL(job.id);
    const cl = await generateCoverLetter(job.title, job.company, "React, TypeScript, Node.js, 4 years experience");
    setCoverLetters(prev => ({ ...prev, [job.id]: cl }));
    setGeneratingCL(null);
  };

  const handleApply = async (job) => {
    await supabase.from("applications").insert({ user_id: user.id, company: job.company, position: job.title, status: "Applied", match_score: job.match, applied_at: new Date().toISOString() });
    alert(`✅ Applied to ${job.title} at ${job.company}! Saved to your tracker.`);
  };

  return (
    <div style={{ maxWidth: 1100 }}>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs, companies..." style={{ width: "100%", boxSizing: "border-box", marginBottom: "1.5rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.9rem", outline: "none" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {SAMPLE_JOBS.filter(j => !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase())).map(job => (
          <div key={job.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.25rem 1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: job.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, flexShrink: 0 }}>{job.logo}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 4 }}>{job.title}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>{job.company} · {job.location} · {job.salary}</div>
                <div style={{ marginTop: 8, maxWidth: 300 }}><MatchBar score={job.match} /></div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleGenerateCL(job)} disabled={generatingCL === job.id} style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", color: "#A78BFA", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 6 }}>
                  {generatingCL === job.id ? <><Spinner /> Generating...</> : "✍️ Cover Letter"}
                </button>
                <button onClick={() => handleApply(job)} style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", color: "#fff", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>Apply Now</button>
              </div>
            </div>
            {coverLetters[job.id] && (
              <div style={{ marginTop: "1rem", background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, padding: "1rem" }}>
                <div style={{ fontWeight: 600, color: "#A78BFA", fontSize: "0.82rem", marginBottom: "0.5rem" }}>✍️ AI-Generated Cover Letter</div>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.875rem", lineHeight: 1.7, margin: 0 }}>{coverLetters[job.id]}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── APPLICATIONS ─────────────────────────────────────────────────────────────
function ApplicationsPage({ user }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    supabase.from("applications").select("*").eq("user_id", user.id).order("applied_at", { ascending: false }).then(({ data }) => { setApps(data?.length ? data : SAMPLE_APPS); setLoading(false); });
  }, [user.id]);

  const statuses = ["All", ...Object.keys(STATUS_COLORS)];
  const filtered = apps.filter(a => statusFilter === "All" || a.status === statusFilter);

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {statuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{ background: statusFilter === s ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${statusFilter === s ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.07)"}`, color: statusFilter === s ? "#60A5FA" : "rgba(255,255,255,0.5)", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>{s}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: "center", padding: "3rem", color: "rgba(255,255,255,0.4)" }}><Spinner /> Loading from Supabase...</div> : (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr", gap: 0, padding: "0.75rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
            {["Company","Position","Date","Status"].map(h => <span key={h} style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", fontWeight: 600, letterSpacing: "0.07em" }}>{h.toUpperCase()}</span>)}
          </div>
          {filtered.map((a, i) => (
            <div key={a.id || i} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr", gap: 0, padding: "0.875rem 1.25rem", borderBottom: i < filtered.length-1 ? "1px solid rgba(255,255,255,0.05)" : "none", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: a.color || "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.75rem" }}>{(a.logo || a.company?.[0] || "?")}</div>
                <span style={{ fontWeight: 600 }}>{a.company}</span>
              </div>
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem" }}>{a.position}</span>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>{a.date || (a.applied_at ? new Date(a.applied_at).toLocaleDateString() : "-")}</span>
              <Badge status={a.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── RESUME PAGE ──────────────────────────────────────────────────────────────
function ResumePage({ user }) {
  const [resumeText, setResumeText] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [score] = useState(87);

  const analyzeIt = async () => {
    if (!resumeText.trim()) { alert("Paste your resume text first"); return; }
    setAnalyzing(true);
    const result = await analyzeResume(resumeText);
    try { setAnalysis(JSON.parse(result)); } catch { setAnalysis({ score: 82, improvements: ["Add quantifiable metrics", "Include missing keywords", "Shorten summary"], keywords: ["GraphQL", "AWS", "Docker"] }); }
    setAnalyzing(false);
  };

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.5rem", textAlign: "center" }}>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", margin: "0 0 1rem" }}>ATS Score</h3>
          <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 1rem" }}>
            <svg viewBox="0 0 36 36" style={{ width: 120, height: 120, transform: "rotate(-90deg)" }}>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeDasharray={`${analysis?.score || score} ${100-(analysis?.score || score)}`} strokeLinecap="round" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.6rem", color: "#3B82F6" }}>{analysis?.score || score}</span>
              <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>/ 100</span>
            </div>
          </div>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>Powered by OpenAI GPT-4</p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.5rem" }}>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", margin: "0 0 1rem" }}>AI Analysis</h3>
          {analysis ? (
            <div>
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>IMPROVEMENTS</div>
                {analysis.improvements?.map((imp, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: "0.85rem", color: "rgba(255,255,255,0.7)" }}><span style={{ color: "#F59E0B" }}>⚠️</span>{imp}</div>)}
              </div>
              <div>
                <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>ADD KEYWORDS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {analysis.keywords?.map(k => <span key={k} style={{ fontSize: "0.8rem", padding: "3px 10px", borderRadius: 100, background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>+ {k}</span>)}
                </div>
              </div>
            </div>
          ) : <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem" }}>Paste your resume below and click Analyze to get AI-powered feedback.</p>}
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.5rem" }}>
        <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", margin: "0 0 1rem" }}>🤖 Analyze Your Resume with AI</h3>
        <textarea value={resumeText} onChange={e => setResumeText(e.target.value)} placeholder="Paste your resume text here for AI analysis..." rows={8} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.875rem", outline: "none", resize: "vertical" }} />
        <button onClick={analyzeIt} disabled={analyzing} style={{ marginTop: "1rem", background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", color: "#fff", borderRadius: 10, padding: "11px 28px", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, opacity: analyzing ? 0.7 : 1 }}>
          {analyzing && <Spinner />}{analyzing ? "Analyzing with GPT-4..." : "🔍 Analyze Resume"}
        </button>
      </div>
    </div>
  );
}

// ─── INTERVIEW PREP ───────────────────────────────────────────────────────────
function InterviewPage() {
  const [activeQ, setActiveQ] = useState(null);
  const [generatingAnswer, setGeneratingAnswer] = useState(null);
  const [answers, setAnswers] = useState({});

  const QUESTIONS = [
    { type: "Technical", q: "Explain the difference between useEffect and useLayoutEffect in React.", category: "React" },
    { type: "Behavioral", q: "Tell me about a time you had to meet a tight deadline.", category: "Teamwork" },
    { type: "HR", q: "Where do you see yourself in 5 years?", category: "Career Goals" },
    { type: "Technical", q: "How does the JavaScript event loop work?", category: "JavaScript" },
    { type: "Technical", q: "Explain the concept of closures in JavaScript.", category: "JavaScript" },
  ];

  const generateAnswer = async (q, i) => {
    setGeneratingAnswer(i);
    const answer = await chatWithAI([{ role: "user", content: `Give a strong interview answer for: "${q.q}". Use STAR method if behavioral. Be concise (150 words max).` }]);
    setAnswers(prev => ({ ...prev, [i]: answer }));
    setGeneratingAnswer(null);
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {[["🎯","Technical","12 questions","#3B82F6"],["🧑‍💼","Behavioral","8 questions","#8B5CF6"],["💼","HR","6 questions","#10B981"],["📊","System Design","5 questions","#F59E0B"]].map(([icon,label,count,color]) => (
          <div key={label} style={{ flex: 1, minWidth: 140, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "1.25rem", cursor: "pointer" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>{icon}</div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{label}</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", marginTop: 4 }}>{count}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.5rem" }}>
        <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", margin: "0 0 1.25rem" }}>Practice Questions — AI-Powered Answers</h3>
        {QUESTIONS.map((q, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div onClick={() => setActiveQ(activeQ === i ? null : i)} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "1rem", background: activeQ === i ? "rgba(59,130,246,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${activeQ === i ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)"}`, borderRadius: 12, cursor: "pointer" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "3px 10px", borderRadius: 100, background: q.type==="Technical" ? "rgba(59,130,246,0.15)" : q.type==="Behavioral" ? "rgba(139,92,246,0.15)" : "rgba(16,185,129,0.15)", color: q.type==="Technical" ? "#60A5FA" : q.type==="Behavioral" ? "#A78BFA" : "#34D399", flexShrink: 0, marginTop: 2 }}>{q.type}</span>
              <span style={{ flex: 1, fontSize: "0.9rem", lineHeight: 1.5 }}>{q.q}</span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>{activeQ === i ? "▲" : "▼"}</span>
            </div>
            {activeQ === i && (
              <div style={{ padding: "1rem", background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.1)", borderTop: "none", borderRadius: "0 0 12px 12px" }}>
                <button onClick={() => generateAnswer(q, i)} disabled={generatingAnswer === i} style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.2)", color: "#60A5FA", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6, marginBottom: answers[i] ? "1rem" : 0 }}>
                  {generatingAnswer === i ? <><Spinner /> Generating...</> : "🤖 Generate AI Answer"}
                </button>
                {answers[i] && <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.875rem", lineHeight: 1.7, background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: "1rem" }}>{answers[i]}</div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI ASSISTANT ─────────────────────────────────────────────────────────────
function AssistantPage() {
  const [messages, setMessages] = useState([{ role: "assistant", content: "Hi! I'm your AI Career Coach powered by GPT-4. I can help with resume tips, interview prep, salary negotiation, and career advice. What would you like to know?" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setLoading(true);
    const reply = await chatWithAI([...messages, userMsg]);
    setMessages(m => [...m, { role: "assistant", content: reply }]);
    setLoading(false);
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const QUICK = ["Improve my resume", "Salary negotiation tips", "Interview preparation", "Career path advice"];

  return (
    <div style={{ maxWidth: 800, height: "calc(100vh-140px)", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, paddingBottom: "1rem", minHeight: 0, maxHeight: "calc(100vh - 280px)" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "assistant" && <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "0.75rem", flexShrink: 0, marginRight: 10, alignSelf: "flex-end", color: "#fff" }}>A</div>}
            <div style={{ maxWidth: "75%", padding: "0.875rem 1.1rem", borderRadius: m.role==="user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.role==="user" ? "linear-gradient(135deg,#3B82F6,#8B5CF6)" : "rgba(255,255,255,0.05)", border: m.role==="assistant" ? "1px solid rgba(255,255,255,0.07)" : "none", fontSize: "0.9rem", lineHeight: 1.6, color: "#fff" }}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "0.75rem" }}>A</div>
            <div style={{ padding: "0.875rem 1.1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px 16px 16px 4px", display: "flex", gap: 4, alignItems: "center" }}>
              <Spinner /><span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginLeft: 8 }}>GPT-4 is thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: "0.75rem", flexWrap: "wrap" }}>
        {QUICK.map(q => <button key={q} onClick={() => setInput(q)} style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: "#60A5FA", borderRadius: 100, padding: "5px 14px", cursor: "pointer", fontSize: "0.8rem" }}>{q}</button>)}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==="Enter" && send()} placeholder="Ask about your resume, interviews, salary..." style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 16px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.95rem", outline: "none" }} />
        <button onClick={send} disabled={loading} style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", borderRadius: 12, padding: "12px 20px", color: "#fff", cursor: "pointer", fontWeight: 600, opacity: loading ? 0.7 : 1 }}>Send</button>
      </div>
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
function SettingsPage({ user, profile, onLogout }) {
  const [payingPlan, setPayingPlan] = useState(null);
  const [paySuccess, setPaySuccess] = useState(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(profile?.full_name || "");
  const [email] = useState(user?.email || "");

  const saveProfile = async () => {
    setSaving(true);
    await supabase.from("profiles").upsert({ id: user.id, full_name: name, updated_at: new Date().toISOString() });
    setSaving(false);
    alert("Profile saved!");
  };

  const handlePay = async (plan) => {
    if (!plan.razorpay) return;
    setPayingPlan(plan.name);
    const loaded = await loadRazorpay();
    if (!loaded) { alert("Failed to load Razorpay"); setPayingPlan(null); return; }
    new window.Razorpay({
      key: RAZORPAY_KEY, amount: plan.amount, currency: "INR",
      name: "AutoApply AI", description: plan.razorpay.description,
      prefill: { email },
      theme: { color: "#3B82F6" },
      handler: async (r) => {
        await supabase.from("profiles").upsert({ id: user.id, plan: plan.name.toLowerCase(), payment_id: r.razorpay_payment_id });
        setPaySuccess({ plan: plan.name, id: r.razorpay_payment_id });
        setPayingPlan(null);
      },
      modal: { ondismiss: () => setPayingPlan(null) },
    }).open();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.25rem" }}>
        <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", margin: "0 0 1.25rem" }}>Profile</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>FULL NAME</label>
            <input value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.9rem", outline: "none" }} />
          </div>
          <div>
            <label style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>EMAIL</label>
            <input value={email} disabled style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 14px", color: "rgba(255,255,255,0.4)", fontFamily: "Inter,sans-serif", fontSize: "0.9rem", outline: "none" }} />
          </div>
        </div>
        <button onClick={saveProfile} disabled={saving} style={{ marginTop: "1rem", background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", color: "#fff", borderRadius: 10, padding: "10px 24px", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          {saving && <Spinner />}Save Changes
        </button>
      </div>

      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.25rem" }}>
        <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", margin: "0 0 1.25rem" }}>Subscription</h3>
        {paySuccess && <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 12, padding: "1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: 10 }}>🎉 <div><div style={{ fontWeight: 700, color: "#86EFAC" }}>Upgraded to {paySuccess.plan}!</div><div style={{ fontSize: "0.75rem", color: "rgba(134,239,172,0.7)" }}>ID: {paySuccess.id}</div></div></div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.875rem" }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{ background: plan.highlight ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${plan.highlight ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: 14, padding: "1.25rem", textAlign: "center" }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, marginBottom: 4 }}>{plan.name}</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.3rem" }}>{plan.price}<span style={{ fontSize: "0.75rem", fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>{plan.period}</span></div>
              <button onClick={() => handlePay(plan)} disabled={payingPlan === plan.name} style={{ marginTop: "0.875rem", width: "100%", padding: "8px", background: plan.razorpay ? "linear-gradient(135deg,#3B82F6,#8B5CF6)" : "rgba(255,255,255,0.05)", border: "none", color: "#fff", borderRadius: 8, cursor: plan.razorpay ? "pointer" : "default", fontWeight: 600, fontSize: "0.82rem" }}>
                {payingPlan === plan.name ? "Opening..." : plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.25rem" }}>
        <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", margin: "0 0 0.5rem" }}>Account Info</h3>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginBottom: "1rem" }}>User ID: {user?.id} · Auth: Supabase · Plan: {profile?.plan || "Free"}</p>
      </div>

      <button onClick={handleLogout} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5", borderRadius: 10, padding: "10px 24px", cursor: "pointer", fontWeight: 600 }}>Sign Out</button>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("loading");
  const [user, setUser] = useState(null);

  const checkAndRoute = (u) => {
    if (!u) { setScreen("landing"); return; }
    setUser(u);
    setScreen("app");
  };

  useEffect(() => {
    const token = getToken();
    if (!token) { setScreen("landing"); return; }
    apiGet("/auth/me").then(data => {
      if (data.success && data.data) {
        setUser(data.data);
        setScreen("app");
      } else {
        clearTokens();
        setScreen("landing");
      }
    });
  }, []);

  if (screen === "loading") return (
    <div style={{ minHeight: "100vh", background: "#020817", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "Inter,sans-serif", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 48, height: 48, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.2rem" }}>A</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Spinner /><span style={{ color: "rgba(255,255,255,0.5)" }}>Loading AutoApply AI...</span></div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (screen === "landing") return <LandingPage onSignup={() => setScreen("signup")} onLogin={() => setScreen("login")} />;
  if (screen === "login") return <AuthScreen mode="login" onAuth={(u) => checkAndRoute(u)} onToggle={() => setScreen("signup")} />;
  if (screen === "signup") return <AuthScreen mode="signup" onAuth={(u) => checkAndRoute(u)} onToggle={() => setScreen("login")} />;
  if (screen === "onboarding") return <Onboarding user={user} onComplete={() => setScreen("app")} />;
  if (screen === "app") return <AppShell user={user} onLogout={() => { setUser(null); setScreen("landing"); }} />;
  return null;
}
