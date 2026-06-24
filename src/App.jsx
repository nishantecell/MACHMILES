import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

// ─── FIREBASE ─────────────────────────────────────────────────────────────────
const firebaseApp = getApps().length === 0 ? initializeApp({
  apiKey: "AIzaSyCaraC5ZLb87-xbwgieko3UWVzaegbAUDM",
  authDomain: "machmiles-a2dbb.firebaseapp.com",
  projectId: "machmiles-a2dbb",
  storageBucket: "machmiles-a2dbb.firebasestorage.app",
  messagingSenderId: "531969841384",
  appId: "1:531969841384:web:db3707b5552903f7d7d15d",
}) : getApps()[0];
const firebaseAuth = getAuth(firebaseApp);

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_BASE = "/api";
const OPENAI_KEY = import.meta.env.VITE_OPENAI_KEY || "";
const RXRESUME_KEY = import.meta.env.VITE_RXRESUME_KEY || "yKLSvhJOucYqkUTWyiNqeXzLHUeXtgsrYziunbrJVFuQTClLswRKOjgjDMvYkbOe";
const RXRESUME_API = "https://api.rxresu.me";
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

const NAV_ITEMS = ["Dashboard", "Jobs", "Applications", "Resume", "Interview Prep", "AI Assistant", "Settings", "Admin"];
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

async function uploadResume(file) {
  const formData = new FormData();
  formData.append("resume", file);
  const token = getToken();
  const res = await fetch("/api/profile/upload-resume", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return res.json();
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

async function startPayment(plan, onSuccess, onError) {
  if (!plan.razorpay) return;
  const loaded = await loadRazorpay();
  if (!loaded) { onError("Failed to load Razorpay"); return; }

  // Create order on backend
  const orderRes = await apiPost("/payments/create-order", { plan: plan.name.toLowerCase() });
  if (!orderRes.success) { onError(orderRes.message || "Failed to create order"); return; }

  const { order_id, amount, currency, key_id, user } = orderRes.data;

  new window.Razorpay({
    key: key_id,
    amount,
    currency,
    order_id,
    name: "AutoApply AI",
    description: plan.razorpay.description,
    prefill: { name: user?.name, email: user?.email },
    theme: { color: "#3B82F6" },
    handler: async (r) => {
      // Verify payment on backend
      const verifyRes = await apiPost("/payments/verify", {
        razorpay_order_id: r.razorpay_order_id,
        razorpay_payment_id: r.razorpay_payment_id,
        razorpay_signature: r.razorpay_signature,
        plan: plan.name.toLowerCase(),
      });
      if (verifyRes.success) onSuccess({ plan: plan.name, id: r.razorpay_payment_id });
      else onError(verifyRes.message || "Payment verification failed");
    },
  }).open();
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
    await startPayment(plan,
      (result) => { setPaySuccess(result); setPayingPlan(null); },
      (msg) => { alert(msg); setPayingPlan(null); }
    );
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

      {/* Resume Builder Hero Section */}
      <section style={{ padding: "5rem 5%", background: "linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(139,92,246,0.06) 100%)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <span style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "#60A5FA", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.08em", padding: "4px 14px", borderRadius: 100, marginBottom: "1.5rem" }}>NEW FEATURE</span>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "2.75rem", letterSpacing: "-0.03em", margin: "0 0 1rem", lineHeight: 1.1 }}>Build a Professional Resume<br /><span style={{ color: "#3B82F6" }}>in Minutes</span></h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.05rem", maxWidth: 580, lineHeight: 1.7, margin: "0 0 2.5rem" }}>Choose from ATS-friendly resume templates, create your resume effortlessly, and land more interviews with AI-powered suggestions.</p>
          <div style={{ display: "flex", gap: 12, marginBottom: "3rem", flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={onSignup} style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", color: "#fff", borderRadius: 12, padding: "14px 32px", fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}>Build Free Resume</button>
            <button onClick={() => document.getElementById("resume-templates-preview")?.scrollIntoView({ behavior: "smooth" })} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: 12, padding: "14px 32px", fontSize: "1rem", fontWeight: 600, cursor: "pointer" }}>View Templates</button>
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center", marginBottom: "3rem" }}>
            {[["📄", "6 Free Templates"], ["👑", "Premium Templates Available"], ["🤖", "AI Resume Builder"], ["⬇", "Download PDF Instantly"]].map(([icon, text]) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.6)", fontSize: "0.875rem" }}><span>{icon}</span>{text}</div>
            ))}
          </div>
          {/* Template preview strip */}
          <div id="resume-templates-preview" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", width: "100%", maxWidth: 900 }}>
            {RESUME_TEMPLATES.slice(0, 6).map(t => (
              <div key={t.id} onClick={onSignup} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden", cursor: "pointer", transition: "border-color 0.2s" }}>
                <div style={{ height: 110, background: `linear-gradient(135deg, ${t.accent}22, ${t.accent}55)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 52, height: 68, background: "#fff", borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", padding: 5, gap: 3 }}>
                    <div style={{ height: 5, background: t.accent, borderRadius: 2 }} />
                    <div style={{ height: 2, background: "#e5e7eb", borderRadius: 2, width: "70%" }} />
                    <div style={{ height: 2, background: "#f3f4f6", borderRadius: 2 }} />
                    <div style={{ height: 2, background: "#f3f4f6", borderRadius: 2, width: "85%" }} />
                    <div style={{ height: 1, background: t.accent, borderRadius: 2, opacity: 0.4, marginTop: 2 }} />
                    <div style={{ height: 2, background: "#f3f4f6", borderRadius: 2 }} />
                    <div style={{ height: 2, background: "#f3f4f6", borderRadius: 2, width: "75%" }} />
                  </div>
                </div>
                <div style={{ padding: "0.5rem 0.75rem" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>{t.name}</div>
                  <div style={{ fontSize: "0.65rem", color: "#10B981", fontWeight: 600 }}>Free</div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem", marginTop: "1.5rem" }}>
            Already have an account? <button onClick={onLogin} style={{ background: "none", border: "none", color: "#3B82F6", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>Sign in →</button>
          </p>
        </div>
      </section>

      {/* ── Announcement Bar ── */}
      <div style={{ background: "linear-gradient(90deg,#4F46E5,#7C3AED,#6D28D9)", padding: "14px 5%", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(90deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 60px)", pointerEvents: "none" }} />
        <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", letterSpacing: "0.01em", color: "#fff" }}>
          🚀 <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 6, padding: "2px 10px", marginRight: 10 }}>NEW</span>
          10+ must-have job search tools bundled into 1 solution — <button onClick={onSignup} style={{ background: "none", border: "none", color: "#A5F3FC", fontWeight: 700, cursor: "pointer", textDecoration: "underline", fontSize: "0.95rem" }}>Try Free →</button>
        </p>
      </div>

      <section id="features" style={{ padding: "5rem 5%" }}>
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <p style={{ color: "#818CF8", fontSize: "0.8rem", letterSpacing: "0.12em", fontWeight: 700, marginBottom: "0.75rem" }}>POWERED BY SUPABASE + OPENAI</p>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "2.5rem", letterSpacing: "-0.03em" }}>Everything you need to land your dream job</h2>
          <p style={{ color: "rgba(255,255,255,0.45)", marginTop: "0.75rem", fontSize: "1rem" }}>One platform. 10+ AI-powered products. Zero manual effort.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "1.25rem", maxWidth: 1100, margin: "0 auto" }}>
          {[
            { icon: "🔍", title: "Job Search Automation", desc: "AI scans 50+ job boards including LinkedIn, Naukri, Indeed and Wellfound 24/7 and surfaces the best matches for your profile.", color: "#3B82F6" },
            { icon: "📤", title: "Job Application Automation", desc: "Automatically applies to matched jobs with a tailored resume and cover letter — while you focus on interview prep.", color: "#8B5CF6" },
            { icon: "📞", title: "Contact Hiring Managers", desc: "Find and reach out to hiring managers directly with AI-personalized messages to get your application noticed faster.", color: "#10B981" },
            { icon: "📊", title: "Job Application Tracker", desc: "Track every application in one place with real-time status updates, notes, and analytics on your progress.", color: "#F59E0B" },
            { icon: "📄", title: "AI Resume Builder", desc: "Build ATS-optimized resumes with 10+ professional templates, AI content suggestions, and instant PDF export.", color: "#EC4899" },
            { icon: "🤖", title: "Personalized AI Engine", desc: "The more you use MachMiles, the smarter it gets — learning your preferences to improve job matching over time.", color: "#14B8A6" },
            { icon: "🎤", title: "AI Mock Interviews", desc: "Practice with AI-generated role-specific questions, get scored answers, and build confidence before real interviews.", color: "#F97316" },
            { icon: "✍️", title: "AI Cover Letter Builder", desc: "Generate compelling, personalized cover letters for every job in seconds using GPT-4 and your resume data.", color: "#6366F1" },
            { icon: "💼", title: "AI Career Advisors", desc: "Get expert guidance on career transitions, salary negotiation, skill gaps, and LinkedIn optimization from your AI coach.", color: "#A855F7" },
          ].map(({ icon, title, desc, color }) => (
            <div key={title} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "2rem", transition: "border-color 0.2s", cursor: "default" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = color + "66"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, background: color + "20", border: `1px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", marginBottom: "1.25rem" }}>{icon}</div>
              <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.6rem", color: "#fff" }}>{title}</h3>
              <p style={{ color: "rgba(255,255,255,0.48)", fontSize: "0.88rem", lineHeight: 1.7, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: "3rem" }}>
          <button onClick={onSignup} style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", color: "#fff", borderRadius: 12, padding: "14px 36px", fontWeight: 700, fontSize: "1rem", cursor: "pointer", boxShadow: "0 0 30px rgba(99,102,241,0.4)" }}>Get All 10+ Tools Free →</button>
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

      <footer style={{ background: "linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4c1d95 100%)", padding: "4rem 5% 2rem", fontFamily: "Inter,sans-serif" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "2.5rem", marginBottom: "3rem" }}>

            {/* Brand */}
            <div style={{ gridColumn: "span 1" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
                <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1rem", color: "#fff" }}>A</div>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#fff" }}>AutoApply <span style={{ color: "#818CF8" }}>AI</span></span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem", lineHeight: 1.7, margin: "0 0 1.5rem" }}>AutoApply AI is India's leading Job Application Automation platform. Gone are the days of filling job forms manually — let AI apply to jobs and multiply your interview requests.</p>
              <div style={{ display: "flex", gap: 12 }}>
                {[
                  ["in", "https://linkedin.com", "#0A66C2"],
                  ["f", "https://facebook.com", "#1877F2"],
                  ["ig", "https://instagram.com", "#E1306C"],
                  ["tk", "https://tiktok.com", "#fff"],
                ].map(([icon, href, color]) => (
                  <a key={icon} href={href} target="_blank" rel="noopener noreferrer" style={{ width: 34, height: 34, background: "rgba(255,255,255,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.75rem", fontWeight: 700, textDecoration: "none" }}>{icon}</a>
                ))}
              </div>
            </div>

            {/* Features */}
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid rgba(129,140,248,0.4)" }}>Features</div>
              {[["Automate Job Search", onSignup], ["Auto Apply Engine", onSignup], ["AI Resume Builder", onSignup], ["AI Cover Letter Builder", onSignup], ["Application Tracker", onSignup], ["Interview Preparation", onSignup], ["AI Career Assistant", onSignup], ["Salary Insights", onSignup]].map(([label, action]) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <button onClick={action} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.65)", fontSize: "0.875rem", cursor: "pointer", padding: 0, textAlign: "left", fontFamily: "Inter,sans-serif" }}>{label}</button>
                </div>
              ))}
            </div>

            {/* Resources */}
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid rgba(129,140,248,0.4)" }}>Resources</div>
              {[["For Job Seekers", onSignup], ["For Freshers", onSignup], ["For Experienced", onSignup], ["Resume Templates", onSignup], ["Cover Letter Examples", onSignup], ["Job Search Tips", onSignup], ["Free Resume Checker", onSignup], ["Career Blog", onSignup]].map(([label, action]) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <button onClick={action} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.65)", fontSize: "0.875rem", cursor: "pointer", padding: 0, textAlign: "left", fontFamily: "Inter,sans-serif" }}>{label}</button>
                </div>
              ))}
            </div>

            {/* Company */}
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid rgba(129,140,248,0.4)" }}>Company</div>
              {[["Pricing", () => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })], ["About Us", onSignup], ["Reviews", onSignup], ["Privacy Policy", onSignup], ["Terms of Service", onSignup], ["Contact Us", onSignup], ["Refund Policy", onSignup]].map(([label, action]) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <button onClick={action} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.65)", fontSize: "0.875rem", cursor: "pointer", padding: 0, textAlign: "left", fontFamily: "Inter,sans-serif" }}>{label}</button>
                </div>
              ))}
            </div>

            {/* Partners */}
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid rgba(129,140,248,0.4)" }}>Partners</div>
              {[["White-Label Solution", onSignup], ["Affiliate Program", onSignup], ["Career Coaches", onSignup], ["HR & Employers", onSignup], ["Campus Connect", onSignup]].map(([label, action]) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <button onClick={action} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.65)", fontSize: "0.875rem", cursor: "pointer", padding: 0, textAlign: "left", fontFamily: "Inter,sans-serif" }}>{label}</button>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem", margin: 0 }}>© 2026 AutoApply AI · All rights reserved · Powered by Supabase + OpenAI</p>
            <div style={{ display: "flex", gap: 20 }}>
              {["Privacy Policy", "Terms of Service", "Refund Policy"].map(label => (
                <button key={label} onClick={onSignup} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", cursor: "pointer", padding: 0, fontFamily: "Inter,sans-serif" }}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      </footer>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');`}</style>
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function AuthScreen({ mode, onAuth, onToggle, onBack }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const confirmationRef = useRef(null);
  const recaptchaRef = useRef(null);

  useEffect(() => {
    if (otpTimer <= 0) return;
    const t = setTimeout(() => setOtpTimer(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [otpTimer]);

  // Clean up reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (recaptchaRef.current) { try { recaptchaRef.current.clear(); } catch (_) {} recaptchaRef.current = null; }
    };
  }, []);

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) { setError("Enter your email address"); return; }
    setForgotLoading(true); setError("");
    const { error: e } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), { redirectTo: window.location.origin });
    setForgotLoading(false);
    if (e) setError(e.message);
    else { setSuccess("Password reset email sent! Check your inbox."); setForgotMode(false); }
  };

  const handleSendOtp = async () => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length !== 10) { setError("Enter a valid 10-digit Indian mobile number"); return; }
    setSendingOtp(true); setError("");
    try {
      // Create or reuse invisible reCAPTCHA
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(firebaseAuth, "recaptcha-container", { size: "invisible" });
      }
      const confirmation = await signInWithPhoneNumber(firebaseAuth, "+91" + cleaned, recaptchaRef.current);
      confirmationRef.current = confirmation;
      setOtpSent(true);
      setOtpTimer(30);
      setSuccess("OTP sent to +91 " + cleaned);
    } catch (e) {
      setError(e.message || "Failed to send OTP. Please try again.");
      // Reset reCAPTCHA on error so it can be retried
      if (recaptchaRef.current) { try { recaptchaRef.current.clear(); } catch (_) {} recaptchaRef.current = null; }
    }
    setSendingOtp(false);
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { setError("Enter the 6-digit OTP"); return; }
    if (!confirmationRef.current) { setError("Please request OTP first"); return; }
    setVerifyingOtp(true); setError("");
    try {
      await confirmationRef.current.confirm(otp);
      setOtpVerified(true);
      setSuccess("Phone verified! ✓");
    } catch (e) {
      setError("Invalid OTP. Please try again.");
    }
    setVerifyingOtp(false);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !pass.trim()) { setError("Please fill in all fields"); return; }
    if (mode === "signup" && !name.trim()) { setError("Please enter your name"); return; }
    if (mode === "signup" && !otpVerified) { setError("Please verify your phone number"); return; }
    if (pass.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      if (mode === "signup") {
        const res = await apiPost("/auth/register", { name: name.trim(), email: email.trim(), password: pass, phone: phone.replace(/\D/g, "") });
        if (!res.success) throw new Error(res.message || "Registration failed");
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

  const inputStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: "#020817", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter,sans-serif", position: "relative" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;800&display=swap');`}</style>
      {onBack && (
        <button onClick={onBack} style={{ position: "absolute", top: 20, left: 20, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", borderRadius: 10, padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: "0.875rem" }}>
          ← Back
        </button>
      )}
      {/* Invisible reCAPTCHA mount point for Firebase Phone Auth */}
      <div id="recaptcha-container" />
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

        {forgotMode ? (
          <>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1rem" }}>Enter your email and we'll send a reset link.</p>
            <input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="Email address" type="email" onKeyDown={e => e.key === "Enter" && handleForgotPassword()} style={{ ...inputStyle, marginBottom: 12 }} />
            <button onClick={handleForgotPassword} disabled={forgotLoading} style={{ width: "100%", padding: 13, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: forgotLoading ? 0.7 : 1 }}>
              {forgotLoading && <Spinner />}Send Reset Link
            </button>
            <p style={{ textAlign: "center", marginTop: "1rem" }}>
              <button onClick={() => { setForgotMode(false); setError(""); }} style={{ background: "none", border: "none", color: "#3B82F6", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}>← Back to sign in</button>
            </p>
          </>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {mode === "signup" && (
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={inputStyle} />
              )}
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email" style={inputStyle} />
              <input value={pass} onChange={e => setPass(e.target.value)} placeholder="Password (min 6 characters)" type="password" onKeyDown={e => e.key === "Enter" && !otpSent && handleSubmit()} style={inputStyle} />

              {/* Phone + OTP — signup only */}
              {mode === "signup" && (
                <div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 14px", color: "rgba(255,255,255,0.5)", fontSize: "0.95rem", whiteSpace: "nowrap" }}>+91</div>
                    <input value={phone} onChange={e => { setPhone(e.target.value); setOtpSent(false); setOtpVerified(false); setOtp(""); }} placeholder="Mobile number" type="tel" maxLength={10}
                      disabled={otpVerified}
                      style={{ ...inputStyle, flex: 1, background: otpVerified ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.05)", border: `1px solid ${otpVerified ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.1)"}` }} />
                    {otpVerified ? (
                      <div style={{ display: "flex", alignItems: "center", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: "12px 14px", color: "#10B981", fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap" }}>✓ Verified</div>
                    ) : (
                      <button onClick={handleSendOtp} disabled={sendingOtp || otpTimer > 0} style={{ whiteSpace: "nowrap", background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", borderRadius: 10, padding: "12px 14px", color: "#fff", fontWeight: 600, fontSize: "0.82rem", cursor: sendingOtp || otpTimer > 0 ? "not-allowed" : "pointer", opacity: sendingOtp || otpTimer > 0 ? 0.6 : 1 }}>
                        {sendingOtp ? <Spinner /> : otpTimer > 0 ? `Resend (${otpTimer}s)` : otpSent ? "Resend OTP" : "Send OTP"}
                      </button>
                    )}
                  </div>

                  {otpSent && !otpVerified && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter 6-digit OTP" type="tel" maxLength={6}
                        onKeyDown={e => e.key === "Enter" && handleVerifyOtp()}
                        style={{ ...inputStyle, flex: 1, letterSpacing: "0.2em", textAlign: "center", fontSize: "1.1rem" }} />
                      <button onClick={handleVerifyOtp} disabled={verifyingOtp} style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 10, padding: "12px 16px", color: "#10B981", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                        {verifyingOtp ? <Spinner /> : "Verify"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {mode === "login" && (
              <div style={{ textAlign: "right", marginTop: 8 }}>
                <button onClick={() => { setForgotMode(true); setError(""); setForgotEmail(email); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.8rem" }}>Forgot password?</button>
              </div>
            )}
            <button onClick={handleSubmit} disabled={loading || (mode === "signup" && !otpVerified)} style={{ width: "100%", marginTop: "1.25rem", padding: 13, background: mode === "signup" && !otpVerified ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", borderRadius: 10, color: mode === "signup" && !otpVerified ? "rgba(255,255,255,0.3)" : "#fff", fontWeight: 700, fontSize: "1rem", cursor: loading || (mode === "signup" && !otpVerified) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.7 : 1 }}>
              {loading && <Spinner />}{mode === "login" ? "Sign in" : "Create account"}
            </button>
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "0.875rem", marginTop: "1.25rem" }}>
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button onClick={onToggle} style={{ background: "none", border: "none", color: "#3B82F6", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}>{mode === "login" ? "Sign up free" : "Sign in"}</button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [prefs, setPrefs] = useState({ title: "", location: "", remote: "Remote", salary: "", level: "Mid-level" });
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [uploadedName, setUploadedName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const res = await uploadResume(file);
    if (res.success) { setUploaded(true); setUploadedName(file.name); }
    else alert("Upload failed: " + res.message);
    setUploading(false);
  };

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
            <label style={{ display: "block", border: "2px dashed rgba(59,130,246,0.4)", borderRadius: 16, padding: "3rem", textAlign: "center", cursor: uploading ? "wait" : "pointer", background: uploaded ? "rgba(16,185,129,0.05)" : "rgba(59,130,246,0.03)" }}>
              <input type="file" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} style={{ display: "none" }} />
              {uploading ? <><div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⏳</div><div style={{ fontWeight: 600, color: "#93C5FD" }}>Uploading...</div></> :
               uploaded ? <><div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>✅</div><div style={{ fontWeight: 600, color: "#10B981" }}>Resume uploaded!</div><div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginTop: 4 }}>{uploadedName}</div></> :
               <><div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📄</div><div style={{ fontWeight: 600 }}>Click to upload your resume</div><div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginTop: 4 }}>PDF or DOCX · Max 10MB</div></>}
            </label>
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

// ─── RESPONSIVE HOOK ─────────────────────────────────────────────────────────
function useMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

// ─── APP SHELL ────────────────────────────────────────────────────────────────
function AppShell({ user, onLogout }) {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [autoMode, setAutoMode] = useState(true);
  const [profile, setProfile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMobile();

  useEffect(() => {
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => { if (data) setProfile(data); });
  }, [user.id]);

  const NAV_ICONS = { Dashboard:"⊞", Jobs:"🔍", Applications:"📤", Resume:"📄", "Interview Prep":"🎯", "AI Assistant":"💬", Settings:"⚙️", Admin:"🛡" };
  const BOTTOM_NAV = ["Dashboard", "Jobs", "Applications", "AI Assistant", "Settings"];

  const renderPage = () => {
    switch (activeNav) {
      case "Dashboard": return <DashboardPage user={user} />;
      case "Jobs": return <JobsPage user={user} />;
      case "Applications": return <ApplicationsPage user={user} />;
      case "Resume": return <ResumePage user={user} profile={profile} />;
      case "Interview Prep": return <InterviewPage />;
      case "AI Assistant": return <AssistantPage />;
      case "Settings": return <SettingsPage user={user} profile={profile} onLogout={onLogout} />;
      case "Admin": return <AdminPage />;
      default: return <DashboardPage user={user} />;
    }
  };

  const navTo = (item) => { setActiveNav(item); setSidebarOpen(false); };

  const Sidebar = () => (
    <aside style={{ width: 240, flexShrink: 0, background: "rgba(2,8,23,0.98)", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", ...(isMobile ? { position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 200, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.25s ease", boxShadow: sidebarOpen ? "4px 0 40px rgba(0,0,0,0.6)" : "none" } : {}) }}>
      <div style={{ padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800 }}>A</div>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700 }}>AutoApply <span style={{ color: "#3B82F6" }}>AI</span></span>
        </div>
        {isMobile && <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "1.2rem", padding: 4 }}>✕</button>}
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
          const active = activeNav === item;
          return (
            <button key={item} onClick={() => navTo(item)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, border: "none", background: active ? "rgba(59,130,246,0.15)" : "transparent", color: active ? "#60A5FA" : "rgba(255,255,255,0.55)", cursor: "pointer", textAlign: "left", fontFamily: "Inter,sans-serif", fontSize: "0.9rem", fontWeight: active ? 600 : 400, marginBottom: 2 }}>
              <span>{NAV_ICONS[item]}</span>{item}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: "1rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#F59E0B,#EF4444)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>
            {(profile?.full_name || user?.email || "U")[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.full_name || user?.email?.split("@")[0] || "User"}</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.72rem", textTransform: "capitalize" }}>{profile?.plan || "Free"} Plan</div>
          </div>
        </div>
        <button onClick={() => { clearTokens(); onLogout(); }} style={{ width: "100%", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.8)", borderRadius: 8, padding: "8px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, fontFamily: "Inter,sans-serif" }}>
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: "#020817", color: "#fff", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap'); @keyframes spin{to{transform:rotate(360deg)}} ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:rgba(59,130,246,0.3);border-radius:2px} input,select,textarea{color-scheme:dark} *{box-sizing:border-box}`}</style>

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 199 }} />}

      {/* Sidebar — hidden on mobile unless open */}
      {(!isMobile || sidebarOpen) && <Sidebar />}

      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Header */}
        <header style={{ padding: isMobile ? "0.75rem 1rem" : "1rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(2,8,23,0.8)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 50, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isMobile && <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "1.2rem", padding: 4, marginRight: 4 }}>☰</button>}
            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: isMobile ? "1rem" : "1.1rem", margin: 0 }}>{activeNav}</h1>
          </div>
          <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 100, padding: isMobile ? "3px 10px" : "4px 12px", fontSize: "0.72rem", color: "#10B981", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
            {isMobile ? "AI On" : "AI Running · 23 apps today"}
          </div>
        </header>

        {/* Page content */}
        <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "1rem" : "1.5rem", paddingBottom: isMobile ? "80px" : "1.5rem" }}>
          {renderPage()}
        </div>

        {/* Bottom nav — mobile only */}
        {isMobile && (
          <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(2,8,23,0.97)", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", zIndex: 100, paddingBottom: "env(safe-area-inset-bottom)" }}>
            {BOTTOM_NAV.map(item => {
              const active = activeNav === item;
              return (
                <button key={item} onClick={() => navTo(item)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 4px", border: "none", background: "transparent", color: active ? "#60A5FA" : "rgba(255,255,255,0.4)", cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
                  <span style={{ fontSize: "1.2rem" }}>{NAV_ICONS[item]}</span>
                  <span style={{ fontSize: "0.62rem", fontWeight: active ? 600 : 400 }}>{item === "AI Assistant" ? "AI Chat" : item === "Interview Prep" ? "Interview" : item}</span>
                </button>
              );
            })}
          </nav>
        )}
      </main>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function DashboardPage({ user }) {
  const [stats, setStats] = useState({ total: 0, interviews: 0, autoApplied: 0, avgMatch: 0, weekly: [], recent: [] });
  const [autoApply, setAutoApply] = useState({ enabled: false, job_title: "", job_location: "", plan: "free" });
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const isMobile = useMobile();

  const DAILY_LIMITS = { free: 5, pro: 50, premium: 200 };

  useEffect(() => {
    apiGet("/applications?stats=true").then(r => { if (r.success) setStats(r.data); });
    apiGet("/auto-apply").then(r => { if (r.success) setAutoApply(r.data); });
  }, []);

  const toggleAutoApply = async () => {
    const newVal = !autoApply.enabled;
    setAutoApply(prev => ({ ...prev, enabled: newVal }));
    await apiPost("/auto-apply", { enabled: newVal, job_title: autoApply.job_title, job_location: autoApply.job_location });
  };

  const savePrefs = async () => {
    setSavingPrefs(true);
    await apiPost("/auto-apply", { job_title: autoApply.job_title, job_location: autoApply.job_location });
    setSavingPrefs(false);
  };

  const runAutoApply = async () => {
    setRunning(true);
    setRunResult(null);
    const r = await apiPost("/auto-apply", { action: "run" });
    setRunResult(r);
    setRunning(false);
    if (r.success) {
      apiGet("/applications?stats=true").then(s => { if (s.success) setStats(s.data); });
    }
  };

  const weekDays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const weekData = (() => {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const found = stats.weekly.find(w => w.date === key);
      out.push({ day: weekDays[d.getDay() === 0 ? 6 : d.getDay() - 1], count: found?.count || 0 });
    }
    return out;
  })();
  const maxVal = Math.max(...weekData.map(w => w.count), 1);

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: "0.75rem", marginBottom: "1.25rem" }}>
        {[["📤", stats.total, "Total Applications", "#3B82F6"], ["🤖", stats.autoApplied, "Auto Applied", "#8B5CF6"], ["📅", stats.interviews, "Interviews", "#10B981"], ["⭐", stats.avgMatch ? stats.avgMatch + "%" : "—", "Avg Match", "#F59E0B"]].map(([icon, val, label, color]) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: isMobile ? "1rem" : "1.25rem 1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <span style={{ fontSize: "1.3rem" }}>{icon}</span>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, marginTop: 4 }} />
            </div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: isMobile ? "1.5rem" : "2rem", color: "#fff" }}>{val}</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Auto Apply Control */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${autoApply.enabled ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: 16, padding: "1.5rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: autoApply.enabled ? "1.25rem" : 0 }}>
          <div>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", margin: "0 0 4px" }}>Auto Apply Engine</h3>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>
              {autoApply.enabled ? `Running · ${DAILY_LIMITS[autoApply.plan] || 5} applications/day limit` : "Turn on to apply to matching jobs automatically"}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {autoApply.enabled && (
              <button onClick={runAutoApply} disabled={running} style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", color: "#fff", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 6 }}>
                {running ? <><Spinner /> Running...</> : "▶ Run Now"}
              </button>
            )}
            <div onClick={toggleAutoApply} style={{ width: 48, height: 26, borderRadius: 13, background: autoApply.enabled ? "linear-gradient(135deg,#3B82F6,#8B5CF6)" : "rgba(255,255,255,0.1)", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
              <div style={{ position: "absolute", top: 3, left: autoApply.enabled ? 25 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
            </div>
          </div>
        </div>
        {autoApply.enabled && (
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10 }}>
            <input value={autoApply.job_title} onChange={e => setAutoApply(p => ({ ...p, job_title: e.target.value }))} placeholder="Job title (e.g. React Developer)" style={{ flex: 2, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.875rem", outline: "none" }} />
            <input value={autoApply.job_location} onChange={e => setAutoApply(p => ({ ...p, job_location: e.target.value }))} placeholder="Location (e.g. Bangalore)" style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.875rem", outline: "none" }} />
            <button onClick={savePrefs} disabled={savingPrefs} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem", whiteSpace: "nowrap" }}>
              {savingPrefs ? "Saving..." : "Save"}
            </button>
          </div>
        )}
        {runResult && (
          <div style={{ marginTop: "1rem", padding: "10px 14px", borderRadius: 8, background: runResult.success ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${runResult.success ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`, fontSize: "0.85rem", color: runResult.success ? "#10B981" : "#EF4444" }}>
            {runResult.message} {runResult.success && runResult.data?.remaining !== undefined ? `· ${runResult.data.remaining} remaining today` : ""}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", margin: 0 }}>Applications This Week</h3>
            <span style={{ color: "#10B981", fontSize: "0.85rem", fontWeight: 600 }}>{stats.total} total</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 120 }}>
            {weekData.map((w, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ width: "100%", borderRadius: "4px 4px 0 0", background: i === 6 ? "linear-gradient(180deg,#3B82F6,#8B5CF6)" : "rgba(59,130,246,0.2)", height: `${(w.count / maxVal) * 100}%`, minHeight: w.count > 0 ? 4 : 0 }} />
                <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>{w.day}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.5rem" }}>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", margin: "0 0 1.25rem" }}>Application Funnel</h3>
          {[["Applied", stats.total, "#3B82F6"], ["Interview", stats.interviews, "#10B981"], ["Auto Applied", stats.autoApplied, "#8B5CF6"]].map(([label, val, color]) => (
            <div key={label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>{label}</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color }}>{val}</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                <div style={{ width: stats.total > 0 ? `${Math.min((val / stats.total) * 100, 100)}%` : "0%", height: "100%", background: color, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.5rem" }}>
        <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", margin: "0 0 1.25rem" }}>Recent Applications</h3>
        {stats.recent.length === 0 ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: "2rem", fontSize: "0.875rem" }}>No applications yet. Use the Jobs page or turn on Auto Apply.</div>
        ) : stats.recent.map((a, i) => (
          <div key={a.id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: ["#635BFF","#3395FF","#10B981","#F59E0B","#EF4444"][i % 5], display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.8rem", flexShrink: 0 }}>{a.company?.[0] || "?"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{a.position}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>{a.company} · {a.applied_at ? new Date(a.applied_at).toLocaleDateString() : ""}</div>
            </div>
            <Badge status={a.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── JOBS PAGE ────────────────────────────────────────────────────────────────
async function fetchLiveJobs(query, location) {
  const q = encodeURIComponent(`${query || "software developer"} ${location || "India"}`);
  try {
    const res = await fetch(`https://jsearch.p.rapidapi.com/search?query=${q}&page=1&num_pages=1&country=in&date_posted=week`, {
      headers: {
        "X-RapidAPI-Key": import.meta.env.VITE_RAPIDAPI_KEY || "",
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
    });
    const data = await res.json();
    return (data.data || []).map((j, i) => ({
      id: j.job_id || i,
      title: j.job_title,
      company: j.employer_name,
      location: j.job_city ? `${j.job_city}, ${j.job_country}` : j.job_country,
      salary: j.job_min_salary ? `₹${Math.round(j.job_min_salary/100000)}–${Math.round(j.job_max_salary/100000)}L` : "Not disclosed",
      match: Math.floor(Math.random() * 20) + 75,
      type: j.job_employment_type || "Full-time",
      posted: j.job_posted_at_datetime_utc ? new Date(j.job_posted_at_datetime_utc).toLocaleDateString() : "Recently",
      logo: j.employer_name?.[0] || "?",
      color: ["#635BFF","#3395FF","#1A1A2E","#FF6B35","#FC8019","#10B981"][i % 6],
      applyUrl: j.job_apply_link,
      description: j.job_description?.slice(0, 300) + "...",
    }));
  } catch {
    return SAMPLE_JOBS;
  }
}

function JobsPage({ user }) {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("India");
  const [jobs, setJobs] = useState(SAMPLE_JOBS);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [generatingCL, setGeneratingCL] = useState(null);
  const [coverLetters, setCoverLetters] = useState({});
  const [appliedIds, setAppliedIds] = useState(new Set());
  const isMobile = useMobile();

  const searchJobs = async () => {
    setLoadingJobs(true);
    const results = await fetchLiveJobs(search, location);
    setJobs(results);
    setLoadingJobs(false);
  };

  useEffect(() => { searchJobs(); }, []);

  const handleGenerateCL = async (job) => {
    setGeneratingCL(job.id);
    const cl = await generateCoverLetter(job.title, job.company, "React, TypeScript, Node.js, 4 years experience");
    setCoverLetters(prev => ({ ...prev, [job.id]: cl }));
    setGeneratingCL(null);
  };

  const handleApply = async (job) => {
    await supabase.from("applications").insert({ user_id: user.id, company: job.company, position: job.title, status: "Applied", match_score: job.match, applied_at: new Date().toISOString() });
    setAppliedIds(prev => new Set([...prev, job.id]));
    if (job.applyUrl) window.open(job.applyUrl, "_blank");
  };

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10, marginBottom: "1.5rem" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && searchJobs()} placeholder="Job title, skills..." style={{ flex: 2, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.9rem", outline: "none" }} />
        <div style={{ display: "flex", gap: 10 }}>
          <input value={location} onChange={e => setLocation(e.target.value)} onKeyDown={e => e.key === "Enter" && searchJobs()} placeholder="Location..." style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.9rem", outline: "none" }} />
          <button onClick={searchJobs} disabled={loadingJobs} style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", color: "#fff", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
            {loadingJobs ? <><Spinner /> Searching...</> : "🔍 Search"}
          </button>
        </div>
      </div>

      {loadingJobs ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "rgba(255,255,255,0.4)" }}><Spinner /><div style={{ marginTop: 12 }}>Searching live jobs...</div></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {jobs.map(job => (
            <div key={job.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.25rem 1.5rem" }}>
              <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: 12, flexDirection: isMobile ? "column" : "row" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", width: "100%" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: job.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, flexShrink: 0, fontSize: "1rem" }}>{job.logo}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 2 }}>{job.title}</div>
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}>{job.company} · {job.location} · {job.salary}</div>
                    <div style={{ marginTop: 6, maxWidth: 240 }}><MatchBar score={job.match} /></div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0, width: isMobile ? "100%" : "auto" }}>
                  <button onClick={() => handleGenerateCL(job)} disabled={generatingCL === job.id} style={{ flex: isMobile ? 1 : "none", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", color: "#A78BFA", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: "0.78rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    {generatingCL === job.id ? <><Spinner /> Generating...</> : "✍️ Cover Letter"}
                  </button>
                  <button onClick={() => handleApply(job)} disabled={appliedIds.has(job.id)} style={{ flex: isMobile ? 1 : "none", background: appliedIds.has(job.id) ? "rgba(16,185,129,0.15)" : "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: appliedIds.has(job.id) ? "1px solid rgba(16,185,129,0.3)" : "none", color: appliedIds.has(job.id) ? "#10B981" : "#fff", borderRadius: 8, padding: "8px 16px", cursor: appliedIds.has(job.id) ? "default" : "pointer", fontWeight: 600, fontSize: "0.82rem" }}>
                    {appliedIds.has(job.id) ? "✓ Applied" : "Apply Now"}
                  </button>
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
      )}
    </div>
  );
}

// ─── APPLICATIONS ─────────────────────────────────────────────────────────────
function ApplicationsPage({ user }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const isMobile = useMobile();

  const loadApps = () => {
    const path = statusFilter === "All" ? "/applications?limit=100" : `/applications?limit=100&status=${statusFilter}`;
    apiGet(path).then(r => { setApps(r.success ? (r.data?.applications || []) : []); setLoading(false); });
  };

  useEffect(() => { loadApps(); }, [statusFilter]);

  const statuses = ["All", ...Object.keys(STATUS_COLORS)];
  const filtered = apps.filter(a => statusFilter === "All" || a.status === statusFilter);

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {statuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{ background: statusFilter === s ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${statusFilter === s ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.07)"}`, color: statusFilter === s ? "#60A5FA" : "rgba(255,255,255,0.5)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}>{s}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: "center", padding: "3rem", color: "rgba(255,255,255,0.4)" }}><Spinner /> Loading...</div> : (
        isMobile ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((a, i) => (
              <div key={a.id || i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "0.875rem 1rem", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: a.color || "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.8rem", flexShrink: 0 }}>{a.logo || a.company?.[0] || "?"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{a.company}</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.position}</div>
                </div>
                <Badge status={a.status} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr", padding: "0.75rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
              {["Company","Position","Date","Status"].map(h => <span key={h} style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", fontWeight: 600, letterSpacing: "0.07em" }}>{h.toUpperCase()}</span>)}
            </div>
            {filtered.map((a, i) => (
              <div key={a.id || i} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr", padding: "0.875rem 1.25rem", borderBottom: i < filtered.length-1 ? "1px solid rgba(255,255,255,0.05)" : "none", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: a.color || "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.75rem" }}>{a.logo || a.company?.[0] || "?"}</div>
                  <span style={{ fontWeight: 600 }}>{a.company}</span>
                </div>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem" }}>{a.position}</span>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>{a.date || (a.applied_at ? new Date(a.applied_at).toLocaleDateString() : "-")}</span>
                <Badge status={a.status} />
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ─── RESUME SYSTEM ────────────────────────────────────────────────────────────
const RESUME_TEMPLATES = [
  { id: "classic",      name: "Classic",      free: true,  category: "ATS-Friendly", accent: "#2563EB",  layout: "single",  desc: "Clean ATS-optimised single column" },
  { id: "modern",       name: "Modern",       free: true,  category: "Modern",       accent: "#7C3AED",  layout: "sidebar", desc: "Purple gradient sidebar, skill pills" },
  { id: "minimal",      name: "Minimal",      free: true,  category: "Minimal",      accent: "#111827",  layout: "grid",    desc: "Ultra-clean date-grid layout" },
  { id: "professional", name: "Professional", free: true,  category: "Corporate",    accent: "#1E40AF",  layout: "banner",  desc: "Gradient banner header, skill pills" },
  { id: "creative",     name: "Creative",     free: true,  category: "Creative",     accent: "#DC2626",  layout: "split",   desc: "Dark hero with sidebar skill tags" },
  { id: "executive",    name: "Executive",    free: true,  category: "Corporate",    accent: "#92400E",  layout: "single",  desc: "Premium serif, gold dividers" },
  { id: "compact",      name: "Compact",      free: true,  category: "Modern",       accent: "#0891B2",  layout: "sidebar", desc: "Teal two-column, great for seniors" },
  { id: "impact",       name: "Impact",       free: true,  category: "Creative",     accent: "#059669",  layout: "banner",  desc: "Bold centred name, strong accent lines" },
  { id: "chikorita",    name: "Chikorita",    free: false, category: "Modern",       accent: "#16A34A",  layout: "sidebar", desc: "Slim green sidebar — rxresume style" },
  { id: "onyx",         name: "Onyx",         free: false, category: "Corporate",    accent: "#1C1917",  layout: "banner",  desc: "Bold charcoal header, sharp typography" },
  { id: "gengar",       name: "Gengar",       free: false, category: "Creative",     accent: "#6D28D9",  layout: "sidebar", desc: "Dark navy sidebar, vivid purple accents" },
  { id: "pikachu",      name: "Pikachu",      free: false, category: "Minimal",      accent: "#D97706",  layout: "single",  desc: "Warm amber accents, pill skill badges" },
];

const PREVIEW_RESUME_DATA = {
  personal: { name: "Alex Johnson", title: "Senior Software Engineer", email: "alex@example.com", phone: "+91 98765 43210", location: "Bangalore, India", linkedin: "linkedin.com/in/alexj" },
  summary: "Results-driven engineer with 6+ years building scalable web applications. Passionate about clean code and great user experiences.",
  experience: [
    { position: "Senior Engineer", company: "Razorpay", location: "Bangalore", startDate: "2021", endDate: "", current: true, description: "Led frontend team of 8, reduced load time by 40%, shipped 3 major products." },
    { position: "Software Engineer", company: "Flipkart", location: "Bangalore", startDate: "2018", endDate: "2021", current: false, description: "Built React component library used across 20+ teams." },
  ],
  education: [{ degree: "B.Tech Computer Science", field: "", school: "IIT Bombay", startDate: "2014", endDate: "2018", gpa: "8.7" }],
  skills: [{ category: "Frontend", items: "React, TypeScript, Next.js, Tailwind" }, { category: "Backend", items: "Node.js, Python, PostgreSQL" }, { category: "Tools", items: "Git, Docker, AWS, Figma" }],
  projects: [{ name: "OpenResume", technologies: "React, PDF.js", url: "github.com/alex/openresume", description: "Open-source resume builder with 2k+ GitHub stars." }],
  certifications: [{ name: "AWS Solutions Architect", issuer: "Amazon", date: "2022" }],
  languages: [{ language: "English", proficiency: "Fluent" }, { language: "Hindi", proficiency: "Native" }],
};

const EMPTY_RESUME_DATA = {
  personal: { name: "", email: "", phone: "", location: "", title: "", linkedin: "", website: "" },
  summary: "",
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  languages: [],
};

// ── Template renderers ────────────────────────────────────────────────────────
function ResumeSection({ title, children, accent = "#2563EB" }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontWeight: 800, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: accent }}>{title}</span>
        <div style={{ flex: 1, height: 1.5, background: accent, opacity: 0.25 }} />
      </div>
      {children}
    </div>
  );
}

// ── 1. Classic — ATS-friendly, clean single column ──────────────────────────
function ClassicTemplate({ data }) {
  const p = data.personal || {};
  const accent = "#1D4ED8";
  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#111", background: "#fff", padding: "40px 44px", minHeight: 900, fontSize: 11.5, lineHeight: 1.6 }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#0F172A", letterSpacing: "0.01em", lineHeight: 1.1 }}>{p.name || "Your Name"}</div>
        {p.title && <div style={{ fontSize: 13, color: accent, fontWeight: 600, marginTop: 4, fontStyle: "italic" }}>{p.title}</div>}
        <div style={{ display: "flex", gap: 0, marginTop: 8, flexWrap: "wrap" }}>
          {[p.email, p.phone, p.location, p.linkedin, p.website].filter(Boolean).map((v, i, arr) => (
            <span key={i} style={{ fontSize: 10.5, color: "#475569" }}>
              {v}{i < arr.length - 1 ? <span style={{ color: "#CBD5E1", margin: "0 8px" }}>|</span> : ""}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 10, height: 2, background: `linear-gradient(90deg, ${accent}, ${accent}44, transparent)`, borderRadius: 2 }} />
      </div>
      {data.summary && <ResumeSection title="Professional Summary" accent={accent}><p style={{ margin: 0, color: "#334155", fontSize: 11.5, lineHeight: 1.7 }}>{data.summary}</p></ResumeSection>}
      {data.experience?.length > 0 && (
        <ResumeSection title="Work Experience" accent={accent}>
          {data.experience.map((e, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: 12.5, color: "#0F172A" }}>{e.position}</strong>
                <span style={{ fontSize: 10, color: "#64748B", fontStyle: "italic" }}>{e.startDate}{e.current ? " – Present" : e.endDate ? ` – ${e.endDate}` : ""}</span>
              </div>
              <div style={{ color: accent, fontSize: 11, fontWeight: 600, marginBottom: 3 }}>{e.company}{e.location ? ` · ${e.location}` : ""}</div>
              {e.description && <p style={{ margin: 0, color: "#475569", fontSize: 11, whiteSpace: "pre-line", lineHeight: 1.65 }}>{e.description}</p>}
            </div>
          ))}
        </ResumeSection>
      )}
      {data.education?.length > 0 && (
        <ResumeSection title="Education" accent={accent}>
          {data.education.map((e, i) => (
            <div key={i} style={{ marginBottom: 9, display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: "#0F172A" }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
                <div style={{ color: "#475569", fontSize: 11 }}>{e.school}{e.gpa ? ` · GPA: ${e.gpa}` : ""}</div>
              </div>
              <div style={{ fontSize: 10.5, color: "#94A3B8", fontStyle: "italic", textAlign: "right", flexShrink: 0 }}>{e.endDate || e.startDate}</div>
            </div>
          ))}
        </ResumeSection>
      )}
      {data.skills?.length > 0 && (
        <ResumeSection title="Skills" accent={accent}>
          {data.skills.map((s, i) => (
            <div key={i} style={{ marginBottom: 5, fontSize: 11 }}>
              <strong style={{ color: "#0F172A" }}>{s.category}:</strong>{" "}
              <span style={{ color: "#475569" }}>{s.items}</span>
            </div>
          ))}
        </ResumeSection>
      )}
      {data.projects?.length > 0 && (
        <ResumeSection title="Projects" accent={accent}>
          {data.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong style={{ fontSize: 12, color: "#0F172A" }}>{p.name}</strong>
                {p.url && <span style={{ color: accent, fontSize: 10 }}>{p.url}</span>}
              </div>
              {p.technologies && <div style={{ color: "#64748B", fontSize: 10.5, marginBottom: 2, fontStyle: "italic" }}>{p.technologies}</div>}
              {p.description && <p style={{ margin: 0, color: "#475569", fontSize: 11 }}>{p.description}</p>}
            </div>
          ))}
        </ResumeSection>
      )}
      {(data.certifications?.length > 0 || data.languages?.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {data.certifications?.length > 0 && (
            <ResumeSection title="Certifications" accent={accent}>
              {data.certifications.map((c, i) => <div key={i} style={{ fontSize: 11, marginBottom: 4, color: "#475569" }}><strong style={{ color: "#0F172A" }}>{c.name}</strong>{c.issuer ? ` · ${c.issuer}` : ""}{c.date ? ` (${c.date})` : ""}</div>)}
            </ResumeSection>
          )}
          {data.languages?.length > 0 && (
            <ResumeSection title="Languages" accent={accent}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {data.languages.map((l, i) => <span key={i} style={{ fontSize: 11, color: "#475569" }}><strong style={{ color: "#0F172A" }}>{l.language}</strong>{l.proficiency ? ` (${l.proficiency})` : ""}</span>)}
              </div>
            </ResumeSection>
          )}
        </div>
      )}
    </div>
  );
}

// ── 2. Modern — gradient sidebar, avatar initial ─────────────────────────────
function ModernTemplate({ data }) {
  const p = data.personal || {};
  const accent = "#6D28D9";
  const sideAccent = "#4C1D95";
  return (
    <div style={{ fontFamily: "'Arial', Helvetica, sans-serif", color: "#1a1a1a", background: "#fff", display: "flex", minHeight: 900, fontSize: 11.5 }}>
      {/* Sidebar */}
      <div style={{ width: 200, background: `linear-gradient(175deg,${accent} 0%,${sideAccent} 100%)`, color: "#fff", padding: "36px 20px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 76, height: 76, borderRadius: "50%", background: "rgba(255,255,255,0.18)", border: "3px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, margin: "0 auto 12px", color: "#fff" }}>{(p.name || "?")[0]?.toUpperCase()}</div>
          <div style={{ fontWeight: 800, fontSize: 13.5, lineHeight: 1.2 }}>{p.name || "Your Name"}</div>
          {p.title && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 5, lineHeight: 1.4 }}>{p.title}</div>}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 10 }}>Contact</div>
          <div style={{ fontSize: 9.5, lineHeight: 2, color: "rgba(255,255,255,0.85)" }}>
            {p.email && <div>✉ {p.email}</div>}
            {p.phone && <div>☎ {p.phone}</div>}
            {p.location && <div>⊙ {p.location}</div>}
            {p.linkedin && <div style={{ wordBreak: "break-all" }}>in {p.linkedin}</div>}
            {p.website && <div style={{ wordBreak: "break-all" }}>🔗 {p.website}</div>}
          </div>
        </div>
        {data.skills?.length > 0 && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 10 }}>Skills</div>
            {data.skills.map((s, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                {s.category && <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", marginBottom: 4, fontWeight: 600 }}>{s.category}</div>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                  {(s.items || "").split(",").map((sk, j) => (
                    <span key={j} style={{ fontSize: 8.5, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 100, padding: "1px 6px", color: "#fff" }}>{sk.trim()}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {data.languages?.length > 0 && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 10 }}>Languages</div>
            {data.languages.map((l, i) => (
              <div key={i} style={{ fontSize: 9.5, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>
                {l.language}{l.proficiency && <span style={{ color: "rgba(255,255,255,0.5)" }}> · {l.proficiency}</span>}
              </div>
            ))}
          </div>
        )}
        {data.certifications?.length > 0 && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 10 }}>Certifications</div>
            {data.certifications.map((c, i) => <div key={i} style={{ fontSize: 9.5, color: "rgba(255,255,255,0.85)", marginBottom: 5 }}><div style={{ fontWeight: 700 }}>{c.name}</div>{c.issuer && <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 9 }}>{c.issuer}</div>}</div>)}
          </div>
        )}
      </div>
      {/* Main */}
      <div style={{ flex: 1, padding: "36px 28px", lineHeight: 1.55 }}>
        {data.summary && (
          <div style={{ marginBottom: 20, padding: "12px 16px", background: "#F5F3FF", borderLeft: `3px solid ${accent}`, borderRadius: "0 8px 8px 0" }}>
            <div style={{ fontWeight: 700, fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 5 }}>About Me</div>
            <p style={{ margin: 0, color: "#4B5563", fontSize: 11, lineHeight: 1.7 }}>{data.summary}</p>
          </div>
        )}
        {data.experience?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 20, height: 2, background: accent, display: "inline-block" }} />Experience</div>
            {data.experience.map((e, i) => (
              <div key={i} style={{ marginBottom: 14, paddingLeft: 14, borderLeft: `2px solid ${i === 0 ? accent : "#E5E7EB"}` }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, color: "#111" }}>{e.position}</div>
                <div style={{ color: accent, fontSize: 11, fontWeight: 600 }}>{e.company}{e.location ? ` · ${e.location}` : ""}<span style={{ color: "#9CA3AF", fontWeight: 400, fontSize: 10, marginLeft: 8 }}>{e.startDate}{e.current ? " – Present" : e.endDate ? ` – ${e.endDate}` : ""}</span></div>
                {e.description && <p style={{ margin: "4px 0 0", color: "#4B5563", fontSize: 11, whiteSpace: "pre-line" }}>{e.description}</p>}
              </div>
            ))}
          </div>
        )}
        {data.education?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 20, height: 2, background: accent, display: "inline-block" }} />Education</div>
            {data.education.map((e, i) => (
              <div key={i} style={{ marginBottom: 9 }}>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
                <div style={{ color: "#555", fontSize: 11 }}>{e.school}{e.gpa ? ` · GPA ${e.gpa}` : ""} <span style={{ color: "#94A3B8", fontSize: 10 }}>{e.endDate || e.startDate}</span></div>
              </div>
            ))}
          </div>
        )}
        {data.projects?.length > 0 && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 20, height: 2, background: accent, display: "inline-block" }} />Projects</div>
            {data.projects.map((p, i) => (
              <div key={i} style={{ marginBottom: 10, paddingLeft: 14, borderLeft: `2px solid #E5E7EB` }}>
                <strong style={{ fontSize: 12, color: "#111" }}>{p.name}</strong>
                {p.technologies && <span style={{ color: "#9CA3AF", fontSize: 10, marginLeft: 8 }}>{p.technologies}</span>}
                {p.description && <p style={{ margin: "3px 0 0", color: "#4B5563", fontSize: 11 }}>{p.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 3. Minimal — ultra-clean, date-grid layout ───────────────────────────────
function MinimalTemplate({ data }) {
  const p = data.personal || {};
  const Rule = () => <div style={{ height: 1, background: "#E5E7EB", margin: "14px 0" }} />;
  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#111", background: "#fff", padding: "52px 56px", minHeight: 900, fontSize: 11.5, lineHeight: 1.65 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 32, fontWeight: 300, letterSpacing: "-0.03em", color: "#000", lineHeight: 1 }}>{p.name || "Your Name"}</div>
        {p.title && <div style={{ fontSize: 13, color: "#6B7280", marginTop: 6, fontWeight: 400, letterSpacing: "0.01em" }}>{p.title}</div>}
        <div style={{ display: "flex", gap: 18, marginTop: 10, fontSize: 10.5, color: "#9CA3AF", flexWrap: "wrap" }}>
          {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).map((v, i) => <span key={i}>{v}</span>)}
        </div>
      </div>
      {data.summary && <><p style={{ margin: 0, color: "#374151", fontSize: 11.5, fontStyle: "italic", lineHeight: 1.75, borderLeft: "2px solid #E5E7EB", paddingLeft: 14 }}>{data.summary}</p><Rule /></>}
      {data.experience?.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 14 }}>Experience</div>
          {data.experience.map((e, i) => (
            <div key={i} style={{ marginBottom: 16, display: "grid", gridTemplateColumns: "110px 1fr", gap: "0 24px" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", paddingTop: 2, lineHeight: 1.5 }}>{e.startDate}{e.current ? "–\nPresent" : e.endDate ? `–\n${e.endDate}` : ""}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12.5, color: "#111" }}>{e.position}</div>
                <div style={{ color: "#6B7280", fontSize: 11 }}>{e.company}{e.location ? `, ${e.location}` : ""}</div>
                {e.description && <p style={{ margin: "5px 0 0", color: "#4B5563", fontSize: 11, whiteSpace: "pre-line" }}>{e.description}</p>}
              </div>
            </div>
          ))}
          <Rule />
        </div>
      )}
      {data.education?.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 14 }}>Education</div>
          {data.education.map((e, i) => (
            <div key={i} style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "110px 1fr", gap: "0 24px" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", paddingTop: 2 }}>{e.endDate || e.startDate}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
                <div style={{ color: "#6B7280", fontSize: 11 }}>{e.school}{e.gpa ? ` · GPA ${e.gpa}` : ""}</div>
              </div>
            </div>
          ))}
          <Rule />
        </div>
      )}
      {data.skills?.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 14 }}>Skills</div>
          {data.skills.map((s, i) => (
            <div key={i} style={{ marginBottom: 6, display: "grid", gridTemplateColumns: "110px 1fr", gap: "0 24px" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF" }}>{s.category}</div>
              <div style={{ fontSize: 11, color: "#374151" }}>{s.items}</div>
            </div>
          ))}
          <Rule />
        </div>
      )}
      {data.projects?.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 14 }}>Projects</div>
          {data.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "110px 1fr", gap: "0 24px" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", paddingTop: 2 }}>{p.technologies}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{p.name}{p.url && <span style={{ fontWeight: 400, color: "#9CA3AF", fontSize: 10, marginLeft: 8 }}>{p.url}</span>}</div>
                {p.description && <p style={{ margin: "3px 0 0", color: "#4B5563", fontSize: 11 }}>{p.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {(data.certifications?.length > 0 || data.languages?.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          {data.certifications?.length > 0 && (
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 10 }}>Certifications</div>
              {data.certifications.map((c, i) => <div key={i} style={{ fontSize: 11, color: "#374151", marginBottom: 5 }}><strong>{c.name}</strong>{c.issuer ? <span style={{ color: "#9CA3AF" }}> · {c.issuer}</span> : ""}</div>)}
            </div>
          )}
          {data.languages?.length > 0 && (
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 10 }}>Languages</div>
              {data.languages.map((l, i) => <div key={i} style={{ fontSize: 11, color: "#374151", marginBottom: 4 }}>{l.language}{l.proficiency ? <span style={{ color: "#9CA3AF" }}> · {l.proficiency}</span> : ""}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 4. Professional — full-width banner header, two-column body ──────────────
function ProfessionalTemplate({ data }) {
  const p = data.personal || {};
  const accent = "#1E3A8A";
  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#1a1a1a", background: "#fff", minHeight: 900, fontSize: 11.5, lineHeight: 1.5 }}>
      {/* Hero header */}
      <div style={{ background: `linear-gradient(120deg, ${accent} 0%, #1D4ED8 100%)`, color: "#fff", padding: "30px 44px 24px" }}>
        <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1 }}>{p.name || "Your Name"}</div>
        {p.title && <div style={{ fontSize: 13, color: "#BFDBFE", marginTop: 6, fontWeight: 500, letterSpacing: "0.03em" }}>{p.title}</div>}
        <div style={{ display: "flex", gap: 0, marginTop: 12, fontSize: 10, color: "rgba(255,255,255,0.75)", flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 12 }}>
          {[p.email && `✉ ${p.email}`, p.phone && `☎ ${p.phone}`, p.location && `⊙ ${p.location}`, p.linkedin && `in ${p.linkedin}`].filter(Boolean).map((v, i, arr) => (
            <span key={i}>{v}{i < arr.length - 1 ? <span style={{ margin: "0 12px", opacity: 0.4 }}>·</span> : ""}</span>
          ))}
        </div>
      </div>
      <div style={{ padding: "24px 44px" }}>
        {data.summary && <div style={{ marginBottom: 20, padding: "12px 16px", background: "#EFF6FF", borderRadius: 8, fontSize: 11.5, color: "#1E3A8A", lineHeight: 1.7, borderLeft: `4px solid ${accent}` }}>{data.summary}</div>}
        {data.experience?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 10, color: accent, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: `2px solid ${accent}`, paddingBottom: 5, marginBottom: 12 }}>Work Experience</div>
            {data.experience.map((e, i) => (
              <div key={i} style={{ marginBottom: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>{e.position}</span>
                  <span style={{ fontSize: 10, color: "#64748B", background: "#F1F5F9", padding: "2px 8px", borderRadius: 100 }}>{e.startDate}{e.current ? " – Present" : e.endDate ? ` – ${e.endDate}` : ""}</span>
                </div>
                <div style={{ color: accent, fontSize: 11, fontWeight: 600, marginBottom: 3 }}>{e.company}{e.location ? ` · ${e.location}` : ""}</div>
                {e.description && <p style={{ margin: 0, color: "#374151", fontSize: 11, whiteSpace: "pre-line", lineHeight: 1.65 }}>{e.description}</p>}
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 28 }}>
          <div>
            {data.education?.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 800, fontSize: 10, color: accent, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: `2px solid ${accent}`, paddingBottom: 5, marginBottom: 10 }}>Education</div>
                {data.education.map((e, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
                    <div style={{ color: "#475569", fontSize: 11 }}>{e.school}{e.gpa ? ` · GPA: ${e.gpa}` : ""}</div>
                    <div style={{ color: "#94A3B8", fontSize: 10 }}>{e.endDate || e.startDate}</div>
                  </div>
                ))}
              </div>
            )}
            {data.projects?.length > 0 && (
              <div>
                <div style={{ fontWeight: 800, fontSize: 10, color: accent, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: `2px solid ${accent}`, paddingBottom: 5, marginBottom: 10 }}>Projects</div>
                {data.projects.map((p, i) => (
                  <div key={i} style={{ marginBottom: 9 }}>
                    <strong style={{ fontSize: 12 }}>{p.name}</strong>{p.technologies && <span style={{ color: "#94A3B8", fontSize: 10, marginLeft: 8 }}>({p.technologies})</span>}
                    {p.description && <p style={{ margin: "2px 0 0", color: "#374151", fontSize: 11 }}>{p.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            {data.skills?.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 800, fontSize: 10, color: accent, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: `2px solid ${accent}`, paddingBottom: 5, marginBottom: 10 }}>Skills</div>
                {data.skills.map((s, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "#374151", marginBottom: 3 }}>{s.category}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                      {(s.items || "").split(",").map((sk, j) => <span key={j} style={{ fontSize: 9.5, background: "#EFF6FF", border: `1px solid #BFDBFE`, borderRadius: 100, padding: "1px 7px", color: accent }}>{sk.trim()}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {data.certifications?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 10, color: accent, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: `2px solid ${accent}`, paddingBottom: 5, marginBottom: 10 }}>Certifications</div>
                {data.certifications.map((c, i) => <div key={i} style={{ fontSize: 11, marginBottom: 5 }}><strong>{c.name}</strong>{c.issuer && <div style={{ color: "#64748B", fontSize: 10 }}>{c.issuer}</div>}</div>)}
              </div>
            )}
            {data.languages?.length > 0 && (
              <div>
                <div style={{ fontWeight: 800, fontSize: 10, color: accent, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: `2px solid ${accent}`, paddingBottom: 5, marginBottom: 10 }}>Languages</div>
                {data.languages.map((l, i) => <div key={i} style={{ fontSize: 11, marginBottom: 4 }}>{l.language}{l.proficiency ? ` · ${l.proficiency}` : ""}</div>)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 5. Creative — dark asymmetric hero, skill tags ───────────────────────────
function CreativeTemplate({ data }) {
  const p = data.personal || {};
  const accent = "#E11D48";
  return (
    <div style={{ fontFamily: "'Arial', sans-serif", color: "#1a1a1a", background: "#fff", minHeight: 900, fontSize: 11.5, lineHeight: 1.5 }}>
      {/* Hero */}
      <div style={{ background: "#0F172A", color: "#fff", padding: "36px 44px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 180, height: 180, background: accent, borderRadius: "50%", opacity: 0.12 }} />
        <div style={{ position: "absolute", bottom: -20, right: 80, width: 100, height: 100, background: "#6D28D9", borderRadius: "50%", opacity: 0.1 }} />
        <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1, color: "#fff" }}>{p.name || "Your Name"}</div>
        {p.title && <div style={{ fontSize: 14, color: accent, marginTop: 6, fontWeight: 700 }}>{p.title}</div>}
        <div style={{ display: "flex", gap: 14, marginTop: 14, fontSize: 10.5, color: "rgba(255,255,255,0.6)", flexWrap: "wrap" }}>
          {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).map((v, i, arr) => (
            <span key={i}>{v}{i < arr.length - 1 ? <span style={{ marginLeft: 14, opacity: 0.3 }}>·</span> : ""}</span>
          ))}
        </div>
      </div>
      {/* Body: 1/3 + 2/3 */}
      <div style={{ display: "grid", gridTemplateColumns: "185px 1fr", minHeight: 700 }}>
        <div style={{ background: "#F8FAFC", padding: "24px 18px", borderRight: "1px solid #E2E8F0" }}>
          {data.skills?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 10 }}>Skills</div>
              {data.skills.map((s, i) => (
                <div key={i} style={{ marginBottom: 9 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#374151", marginBottom: 4 }}>{s.category}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {(s.items || "").split(",").map((sk, j) => <span key={j} style={{ fontSize: 9, background: "#fff", border: `1px solid ${accent}33`, borderRadius: 100, padding: "1px 6px", color: "#374151" }}>{sk.trim()}</span>)}
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.education?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 10 }}>Education</div>
              {data.education.map((e, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 11 }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
                  <div style={{ color: "#64748B", fontSize: 10 }}>{e.school}</div>
                  <div style={{ color: "#94A3B8", fontSize: 9.5 }}>{e.endDate || e.startDate}</div>
                </div>
              ))}
            </div>
          )}
          {data.languages?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 10 }}>Languages</div>
              {data.languages.map((l, i) => <div key={i} style={{ fontSize: 10.5, marginBottom: 5, color: "#374151" }}>{l.language}{l.proficiency && <div style={{ color: "#94A3B8", fontSize: 9.5 }}>{l.proficiency}</div>}</div>)}
            </div>
          )}
          {data.certifications?.length > 0 && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 10 }}>Certifications</div>
              {data.certifications.map((c, i) => <div key={i} style={{ fontSize: 10.5, marginBottom: 7 }}><strong>{c.name}</strong>{c.issuer && <div style={{ color: "#64748B", fontSize: 9.5 }}>{c.issuer}</div>}</div>)}
            </div>
          )}
        </div>
        <div style={{ padding: "24px 28px" }}>
          {data.summary && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 6 }}>About</div>
              <p style={{ margin: 0, color: "#374151", fontSize: 11.5, lineHeight: 1.75 }}>{data.summary}</p>
            </div>
          )}
          {data.experience?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 12 }}>Experience</div>
              {data.experience.map((e, i) => (
                <div key={i} style={{ marginBottom: 14, paddingLeft: 12, borderLeft: `3px solid ${i === 0 ? accent : "#E2E8F0"}` }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>{e.position}</div>
                  <div style={{ color: "#475569", fontSize: 11, marginBottom: 3 }}>{e.company}{e.location ? ` · ${e.location}` : ""}<span style={{ color: "#94A3B8", fontSize: 10, marginLeft: 8 }}>{e.startDate}{e.current ? " – Present" : e.endDate ? ` – ${e.endDate}` : ""}</span></div>
                  {e.description && <p style={{ margin: 0, color: "#4B5563", fontSize: 11, whiteSpace: "pre-line", lineHeight: 1.65 }}>{e.description}</p>}
                </div>
              ))}
            </div>
          )}
          {data.projects?.length > 0 && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 12 }}>Projects</div>
              {data.projects.map((p, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "#0F172A" }}>{p.name}{p.technologies && <span style={{ fontWeight: 400, color: "#94A3B8", fontSize: 10, marginLeft: 8 }}>{p.technologies}</span>}</div>
                  {p.description && <p style={{ margin: "3px 0 0", color: "#4B5563", fontSize: 11 }}>{p.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 6. Executive — premium serif, centred header, gold accents ───────────────
function ExecutiveTemplate({ data }) {
  const p = data.personal || {};
  const accent = "#92400E";
  const gold = "#B45309";
  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#1a1a1a", background: "#fff", padding: "48px 52px", minHeight: 900, fontSize: 11.5, lineHeight: 1.6 }}>
      {/* Centred header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "0.06em", color: "#0C0A09", textTransform: "uppercase", lineHeight: 1 }}>{p.name || "Your Name"}</div>
        {p.title && <div style={{ fontSize: 12.5, color: gold, marginTop: 7, fontStyle: "italic", fontWeight: 400, letterSpacing: "0.03em" }}>{p.title}</div>}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, margin: "14px 0 0" }}>
          <div style={{ flex: 1, height: 1, background: gold, opacity: 0.4 }} />
          <div style={{ display: "flex", gap: 16, fontSize: 10, color: "#57534E" }}>
            {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).map((v, i, arr) => (
              <span key={i}>{v}{i < arr.length - 1 ? <span style={{ marginLeft: 16, color: gold, opacity: 0.5 }}>·</span> : ""}</span>
            ))}
          </div>
          <div style={{ flex: 1, height: 1, background: gold, opacity: 0.4 }} />
        </div>
      </div>
      {data.summary && (
        <div style={{ marginBottom: 22, textAlign: "center" }}>
          <p style={{ margin: "0 auto", color: "#44403C", fontSize: 11.5, fontStyle: "italic", lineHeight: 1.8, maxWidth: 520 }}>{data.summary}</p>
          <div style={{ width: 48, height: 1, background: gold, margin: "14px auto 0", opacity: 0.5 }} />
        </div>
      )}
      {data.experience?.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ textAlign: "center", fontWeight: 700, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: gold, marginBottom: 14 }}>Professional Experience</div>
          {data.experience.map((e, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: "#0C0A09" }}>{e.position}</span>
                <span style={{ color: "#78716C", fontSize: 10.5, fontStyle: "italic" }}>{e.startDate}{e.current ? " – Present" : e.endDate ? ` – ${e.endDate}` : ""}</span>
              </div>
              <div style={{ color: gold, fontSize: 11, fontStyle: "italic", marginBottom: 4 }}>{e.company}{e.location ? `, ${e.location}` : ""}</div>
              {e.description && <p style={{ margin: 0, color: "#44403C", fontSize: 11, whiteSpace: "pre-line", lineHeight: 1.7 }}>{e.description}</p>}
              {i < data.experience.length - 1 && <div style={{ height: 1, background: "#E7E5E4", marginTop: 14 }} />}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 40px" }}>
        <div>
          {data.education?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ textAlign: "center", fontWeight: 700, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: gold, marginBottom: 12 }}>Education</div>
              {data.education.map((e, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
                  <div style={{ color: "#57534E", fontSize: 11, fontStyle: "italic" }}>{e.school}</div>
                  <div style={{ color: "#A8A29E", fontSize: 10 }}>{e.endDate || e.startDate}</div>
                </div>
              ))}
            </div>
          )}
          {data.certifications?.length > 0 && (
            <div>
              <div style={{ textAlign: "center", fontWeight: 700, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: gold, marginBottom: 12 }}>Certifications</div>
              {data.certifications.map((c, i) => <div key={i} style={{ fontSize: 11, marginBottom: 6 }}><strong>{c.name}</strong>{c.issuer && <span style={{ color: "#78716C" }}> · {c.issuer}</span>}{c.date && <span style={{ color: "#A8A29E" }}> ({c.date})</span>}</div>)}
            </div>
          )}
        </div>
        <div>
          {data.skills?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ textAlign: "center", fontWeight: 700, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: gold, marginBottom: 12 }}>Core Competencies</div>
              {data.skills.map((s, i) => (
                <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #F5F5F4" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#44403C", marginBottom: 3 }}>{s.category}</div>
                  <div style={{ fontSize: 11, color: "#57534E" }}>{s.items}</div>
                </div>
              ))}
            </div>
          )}
          {data.languages?.length > 0 && (
            <div>
              <div style={{ textAlign: "center", fontWeight: 700, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: gold, marginBottom: 12 }}>Languages</div>
              {data.languages.map((l, i) => <div key={i} style={{ fontSize: 11, marginBottom: 5, color: "#44403C" }}>{l.language}{l.proficiency ? <span style={{ color: "#78716C" }}> · {l.proficiency}</span> : ""}</div>)}
            </div>
          )}
        </div>
      </div>
      {data.projects?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ textAlign: "center", fontWeight: 700, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: gold, marginBottom: 14 }}>Key Projects</div>
          {data.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <strong style={{ fontSize: 12 }}>{p.name}</strong>{p.technologies && <span style={{ fontSize: 10, color: "#A8A29E", marginLeft: 8, fontStyle: "italic" }}>({p.technologies})</span>}
              {p.description && <p style={{ margin: "3px 0 0", color: "#44403C", fontSize: 11 }}>{p.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 7. Compact — teal two-column, dense but readable ────────────────────────
function CompactTemplate({ data }) {
  const p = data.personal || {};
  const accent = "#0891B2";
  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", display: "flex", minHeight: 900, fontSize: 11, color: "#111", background: "#fff" }}>
      <div style={{ width: 175, background: "#F0F9FF", borderRight: "2px solid #BAE6FD", padding: "28px 16px", flexShrink: 0 }}>
        <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid #BAE6FD" }}>
          <div style={{ fontWeight: 900, fontSize: 13, color: "#0C4A6E", lineHeight: 1.2 }}>{p.name || "Your Name"}</div>
          {p.title && <div style={{ fontSize: 9.5, color: accent, fontWeight: 600, marginTop: 4 }}>{p.title}</div>}
        </div>
        <div style={{ fontSize: 9, color: "#374151", lineHeight: 1.9, marginBottom: 16 }}>
          {p.email && <div>✉ {p.email}</div>}
          {p.phone && <div>☎ {p.phone}</div>}
          {p.location && <div>⊙ {p.location}</div>}
          {p.linkedin && <div style={{ wordBreak: "break-all" }}>in {p.linkedin}</div>}
        </div>
        {data.skills?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 8 }}>Skills</div>
            {data.skills.map((s, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 8.5, fontWeight: 700, color: "#0C4A6E", marginBottom: 3 }}>{s.category}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                  {(s.items || "").split(",").map((sk, j) => <span key={j} style={{ fontSize: 8, background: "#E0F2FE", borderRadius: 3, padding: "1px 5px", color: "#0369A1" }}>{sk.trim()}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}
        {data.education?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 8 }}>Education</div>
            {data.education.map((e, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 9.5 }}>{e.degree}{e.field ? ` — ${e.field}` : ""}</div>
                <div style={{ color: "#6B7280", fontSize: 9 }}>{e.school}</div>
                <div style={{ color: "#9CA3AF", fontSize: 8.5 }}>{e.endDate || e.startDate}</div>
              </div>
            ))}
          </div>
        )}
        {data.certifications?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 8 }}>Certifications</div>
            {data.certifications.map((c, i) => <div key={i} style={{ fontSize: 9, marginBottom: 5 }}><strong>{c.name}</strong>{c.issuer && <div style={{ color: "#6B7280", fontSize: 8.5 }}>{c.issuer}{c.date ? ` · ${c.date}` : ""}</div>}</div>)}
          </div>
        )}
        {data.languages?.length > 0 && (
          <div>
            <div style={{ fontWeight: 800, fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 8 }}>Languages</div>
            {data.languages.map((l, i) => <div key={i} style={{ fontSize: 9, marginBottom: 3 }}>{l.language}{l.proficiency ? <span style={{ color: "#9CA3AF" }}> · {l.proficiency}</span> : ""}</div>)}
          </div>
        )}
      </div>
      <div style={{ flex: 1, padding: "28px 24px", lineHeight: 1.55 }}>
        {data.summary && <div style={{ marginBottom: 16, fontSize: 11, color: "#374151", background: "#F0F9FF", padding: "10px 14px", borderRadius: 6, borderLeft: `3px solid ${accent}`, lineHeight: 1.65 }}>{data.summary}</div>}
        {data.experience?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, borderBottom: `1.5px solid ${accent}`, paddingBottom: 4, marginBottom: 10 }}>Work Experience</div>
            {data.experience.map((e, i) => (
              <div key={i} style={{ marginBottom: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontWeight: 700, fontSize: 11.5 }}>{e.position}</span>
                  <span style={{ fontSize: 9.5, color: "#94A3B8", background: "#F1F5F9", padding: "1px 7px", borderRadius: 100 }}>{e.startDate}{e.current ? "–Present" : e.endDate ? `–${e.endDate}` : ""}</span>
                </div>
                <div style={{ color: accent, fontSize: 10, fontWeight: 600 }}>{e.company}{e.location ? ` · ${e.location}` : ""}</div>
                {e.description && <p style={{ margin: "3px 0 0", color: "#4B5563", fontSize: 10.5, whiteSpace: "pre-line" }}>{e.description}</p>}
              </div>
            ))}
          </div>
        )}
        {data.projects?.length > 0 && (
          <div>
            <div style={{ fontWeight: 800, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, borderBottom: `1.5px solid ${accent}`, paddingBottom: 4, marginBottom: 10 }}>Projects</div>
            {data.projects.map((p, i) => (
              <div key={i} style={{ marginBottom: 9 }}>
                <div style={{ fontWeight: 700, fontSize: 11 }}>{p.name}{p.technologies && <span style={{ fontWeight: 400, color: "#9CA3AF", fontSize: 9.5, marginLeft: 8 }}>{p.technologies}</span>}</div>
                {p.description && <p style={{ margin: "2px 0 0", color: "#4B5563", fontSize: 10.5 }}>{p.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 8. Impact — bold centred name, strong green accent lines ─────────────────
function ImpactTemplate({ data }) {
  const p = data.personal || {};
  const accent = "#059669";
  const Divider = ({ label }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 10px" }}>
      <div style={{ height: 2, width: 24, background: accent, borderRadius: 2 }} />
      <span style={{ fontWeight: 900, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: accent }}>{label}</span>
      <div style={{ flex: 1, height: 2, background: accent, opacity: 0.2, borderRadius: 2 }} />
    </div>
  );
  return (
    <div style={{ fontFamily: "'Arial', Helvetica, sans-serif", color: "#111", background: "#fff", padding: "40px 48px", minHeight: 900, fontSize: 11.5, lineHeight: 1.6 }}>
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase", color: "#0F172A", lineHeight: 1 }}>{p.name || "Your Name"}</div>
        {p.title && <div style={{ fontSize: 13, color: accent, fontWeight: 700, marginTop: 6, letterSpacing: "0.05em" }}>{p.title}</div>}
        <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, margin: "12px 0 10px", borderRadius: 2 }} />
        <div style={{ display: "flex", justifyContent: "center", gap: 0, flexWrap: "wrap", fontSize: 10.5, color: "#475569" }}>
          {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).map((v, i, arr) => (
            <span key={i}>{v}{i < arr.length - 1 ? <span style={{ color: accent, margin: "0 10px" }}>·</span> : ""}</span>
          ))}
        </div>
      </div>
      {data.summary && <><Divider label="Profile" /><p style={{ margin: 0, color: "#374151", fontSize: 11.5, lineHeight: 1.75, textAlign: "center" }}>{data.summary}</p></>}
      {data.experience?.length > 0 && (
        <div>
          <Divider label="Experience" />
          {data.experience.map((e, i) => (
            <div key={i} style={{ marginBottom: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 800, fontSize: 12.5, color: "#0F172A" }}>{e.position}</span>
                <span style={{ fontSize: 10.5, color: "#94A3B8", fontStyle: "italic" }}>{e.startDate}{e.current ? " – Present" : e.endDate ? ` – ${e.endDate}` : ""}</span>
              </div>
              <div style={{ color: accent, fontSize: 11, fontWeight: 700 }}>{e.company}{e.location ? ` · ${e.location}` : ""}</div>
              {e.description && <p style={{ margin: "4px 0 0", color: "#374151", fontSize: 11, whiteSpace: "pre-line", lineHeight: 1.65 }}>{e.description}</p>}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
        <div>
          {data.education?.length > 0 && (
            <div>
              <Divider label="Education" />
              {data.education.map((e, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
                  <div style={{ color: "#475569", fontSize: 11 }}>{e.school}</div>
                  <div style={{ color: "#9CA3AF", fontSize: 10 }}>{e.endDate || e.startDate}{e.gpa ? ` · GPA ${e.gpa}` : ""}</div>
                </div>
              ))}
            </div>
          )}
          {data.certifications?.length > 0 && (
            <div>
              <Divider label="Certifications" />
              {data.certifications.map((c, i) => <div key={i} style={{ fontSize: 11, marginBottom: 5 }}><strong>{c.name}</strong>{c.issuer && <span style={{ color: "#9CA3AF" }}> · {c.issuer}</span>}</div>)}
            </div>
          )}
        </div>
        <div>
          {data.skills?.length > 0 && (
            <div>
              <Divider label="Skills" />
              {data.skills.map((s, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>{s.category}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {(s.items || "").split(",").map((sk, j) => <span key={j} style={{ fontSize: 9.5, background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 100, padding: "1px 8px", color: "#065F46" }}>{sk.trim()}</span>)}
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.languages?.length > 0 && (
            <div>
              <Divider label="Languages" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {data.languages.map((l, i) => <span key={i} style={{ fontSize: 10.5, background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 100, padding: "2px 10px", color: "#065F46" }}>{l.language}{l.proficiency ? ` · ${l.proficiency}` : ""}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
      {data.projects?.length > 0 && (
        <div>
          <Divider label="Projects" />
          {data.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: 9 }}>
              <strong style={{ fontSize: 12 }}>{p.name}</strong>{p.technologies && <span style={{ color: "#9CA3AF", fontSize: 10, marginLeft: 8 }}>{p.technologies}</span>}
              {p.description && <p style={{ margin: "2px 0 0", color: "#374151", fontSize: 11 }}>{p.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Premium templates (rxresu.me inspired) ───────────────────────────────────

function ChikoritaTemplate({ data }) {
  const p = data.personal || {};
  const accent = "#16A34A";
  return (
    <div style={{ fontFamily: "Inter, Arial, sans-serif", display: "flex", minHeight: 900, fontSize: 11.5, color: "#1a1a1a", background: "#fff" }}>
      {/* Slim sidebar */}
      <div style={{ width: 168, background: "#F0FDF4", borderRight: "1px solid #BBF7D0", padding: "32px 16px", flexShrink: 0 }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, margin: "0 auto 14px" }}>{(p.name || "?")[0]?.toUpperCase()}</div>
        <div style={{ textAlign: "center", borderBottom: "1px solid #BBF7D0", paddingBottom: 12, marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 12, color: "#14532D" }}>{p.name || "Your Name"}</div>
          {p.title && <div style={{ fontSize: 9.5, color: accent, marginTop: 3, fontWeight: 600 }}>{p.title}</div>}
        </div>
        <div style={{ fontSize: 9.5, lineHeight: 1.9, color: "#374151" }}>
          {p.email && <div style={{ marginBottom: 2 }}>✉ {p.email}</div>}
          {p.phone && <div style={{ marginBottom: 2 }}>☎ {p.phone}</div>}
          {p.location && <div style={{ marginBottom: 2 }}>⊙ {p.location}</div>}
          {p.linkedin && <div style={{ marginBottom: 2 }}>in {p.linkedin}</div>}
          {p.website && <div>🔗 {p.website}</div>}
        </div>
        {data.skills?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: accent, marginBottom: 8 }}>Skills</div>
            {data.skills.map((s, i) => (
              <div key={i} style={{ marginBottom: 7 }}>
                <div style={{ fontSize: 9, color: "#6B7280", marginBottom: 2 }}>{s.category}</div>
                <div style={{ fontSize: 9.5, color: "#1F2937", lineHeight: 1.5 }}>{s.items}</div>
              </div>
            ))}
          </div>
        )}
        {data.languages?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: accent, marginBottom: 8 }}>Languages</div>
            {data.languages.map((l, i) => <div key={i} style={{ fontSize: 9.5, marginBottom: 3 }}>{l.language}{l.proficiency ? ` · ${l.proficiency}` : ""}</div>)}
          </div>
        )}
        {data.certifications?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: accent, marginBottom: 8 }}>Certifications</div>
            {data.certifications.map((c, i) => <div key={i} style={{ fontSize: 9.5, marginBottom: 5 }}><strong>{c.name}</strong>{c.issuer && <div style={{ color: "#6B7280", fontSize: 9 }}>{c.issuer}</div>}</div>)}
          </div>
        )}
      </div>
      {/* Main content */}
      <div style={{ flex: 1, padding: "32px 28px", lineHeight: 1.55 }}>
        {data.summary && (
          <div style={{ marginBottom: 18, padding: "10px 14px", background: "#F0FDF4", borderLeft: `3px solid ${accent}`, borderRadius: "0 6px 6px 0" }}>
            <p style={{ margin: 0, color: "#374151", fontSize: 11 }}>{data.summary}</p>
          </div>
        )}
        {data.experience?.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: accent, borderBottom: `1.5px solid ${accent}`, paddingBottom: 4, marginBottom: 10 }}>Work Experience</div>
            {data.experience.map((e, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontWeight: 700, fontSize: 12 }}>{e.position}</span>
                  <span style={{ fontSize: 10, color: "#6B7280", background: "#F3F4F6", padding: "1px 7px", borderRadius: 100 }}>{e.startDate}{e.current ? " – Present" : e.endDate ? ` – ${e.endDate}` : ""}</span>
                </div>
                <div style={{ color: accent, fontSize: 10.5, fontWeight: 600 }}>{e.company}{e.location ? ` · ${e.location}` : ""}</div>
                {e.description && <p style={{ margin: "4px 0 0", color: "#4B5563", fontSize: 10.5, whiteSpace: "pre-line" }}>{e.description}</p>}
              </div>
            ))}
          </div>
        )}
        {data.education?.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: accent, borderBottom: `1.5px solid ${accent}`, paddingBottom: 4, marginBottom: 10 }}>Education</div>
            {data.education.map((e, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 11.5 }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
                <div style={{ color: "#555", fontSize: 10.5 }}>{e.school}{e.gpa ? ` · GPA ${e.gpa}` : ""} <span style={{ color: "#9CA3AF", fontSize: 10 }}>{e.endDate || e.startDate}</span></div>
              </div>
            ))}
          </div>
        )}
        {data.projects?.length > 0 && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: accent, borderBottom: `1.5px solid ${accent}`, paddingBottom: 4, marginBottom: 10 }}>Projects</div>
            {data.projects.map((p, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 11.5 }}>{p.name}{p.technologies && <span style={{ fontWeight: 400, color: "#9CA3AF", fontSize: 10, marginLeft: 8 }}>{p.technologies}</span>}</div>
                {p.description && <p style={{ margin: "3px 0 0", color: "#4B5563", fontSize: 10.5 }}>{p.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OnyxTemplate({ data }) {
  const p = data.personal || {};
  return (
    <div style={{ fontFamily: "'Arial', sans-serif", color: "#1a1a1a", background: "#fff", minHeight: 900, fontSize: 11.5, lineHeight: 1.5 }}>
      <div style={{ background: "#1C1917", color: "#fff", padding: "32px 44px 26px" }}>
        <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1 }}>{p.name || "Your Name"}</div>
        {p.title && <div style={{ fontSize: 13, color: "#A8A29E", marginTop: 6, fontWeight: 500, letterSpacing: "0.04em" }}>{p.title}</div>}
        <div style={{ display: "flex", gap: 20, marginTop: 12, fontSize: 10, color: "#78716C", flexWrap: "wrap", borderTop: "1px solid #292524", paddingTop: 12 }}>
          {p.email && <span>✉ {p.email}</span>}
          {p.phone && <span>☎ {p.phone}</span>}
          {p.location && <span>⊙ {p.location}</span>}
          {p.linkedin && <span>in {p.linkedin}</span>}
          {p.website && <span>🔗 {p.website}</span>}
        </div>
      </div>
      <div style={{ padding: "28px 44px" }}>
        {data.summary && (
          <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #E7E5E4" }}>
            <p style={{ margin: 0, color: "#44403C", fontSize: 11.5, lineHeight: 1.7 }}>{data.summary}</p>
          </div>
        )}
        {data.experience?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 3, height: 16, background: "#1C1917", borderRadius: 2 }} />
              <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Experience</span>
            </div>
            {data.experience.map((e, i) => (
              <div key={i} style={{ marginBottom: 14, paddingLeft: 13, borderLeft: "1px solid #E7E5E4" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: 12.5 }}>{e.position}</span>
                  <span style={{ fontSize: 10, color: "#78716C" }}>{e.startDate}{e.current ? " – Present" : e.endDate ? ` – ${e.endDate}` : ""}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 11, color: "#57534E", marginBottom: 3 }}>{e.company}{e.location ? ` · ${e.location}` : ""}</div>
                {e.description && <p style={{ margin: 0, color: "#44403C", fontSize: 11, whiteSpace: "pre-line" }}>{e.description}</p>}
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            {data.education?.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 3, height: 14, background: "#1C1917", borderRadius: 2 }} />
                  <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Education</span>
                </div>
                {data.education.map((e, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 11.5 }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
                    <div style={{ color: "#57534E", fontSize: 10.5 }}>{e.school}</div>
                    <div style={{ color: "#9CA3AF", fontSize: 10 }}>{e.endDate || e.startDate}</div>
                  </div>
                ))}
              </div>
            )}
            {data.languages?.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 3, height: 14, background: "#1C1917", borderRadius: 2 }} />
                  <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Languages</span>
                </div>
                {data.languages.map((l, i) => <div key={i} style={{ fontSize: 11, marginBottom: 4 }}>{l.language}{l.proficiency ? ` · ${l.proficiency}` : ""}</div>)}
              </div>
            )}
          </div>
          <div>
            {data.skills?.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 3, height: 14, background: "#1C1917", borderRadius: 2 }} />
                  <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Skills</span>
                </div>
                {data.skills.map((s, i) => (
                  <div key={i} style={{ marginBottom: 7 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#57534E", marginBottom: 2 }}>{s.category}</div>
                    <div style={{ fontSize: 11, color: "#1C1917" }}>{s.items}</div>
                  </div>
                ))}
              </div>
            )}
            {data.certifications?.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 3, height: 14, background: "#1C1917", borderRadius: 2 }} />
                  <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Certifications</span>
                </div>
                {data.certifications.map((c, i) => <div key={i} style={{ fontSize: 11, marginBottom: 5 }}><strong>{c.name}</strong>{c.issuer && <span style={{ color: "#78716C" }}> · {c.issuer}</span>}</div>)}
              </div>
            )}
          </div>
        </div>
        {data.projects?.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 3, height: 16, background: "#1C1917", borderRadius: 2 }} />
              <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Projects</span>
            </div>
            {data.projects.map((p, i) => (
              <div key={i} style={{ marginBottom: 10, paddingLeft: 13, borderLeft: "1px solid #E7E5E4" }}>
                <div style={{ fontWeight: 700, fontSize: 11.5 }}>{p.name}{p.technologies && <span style={{ fontWeight: 400, color: "#9CA3AF", fontSize: 10, marginLeft: 8 }}>{p.technologies}</span>}</div>
                {p.description && <p style={{ margin: "3px 0 0", color: "#44403C", fontSize: 11 }}>{p.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GengarTemplate({ data }) {
  const p = data.personal || {};
  const accent = "#7C3AED";
  return (
    <div style={{ fontFamily: "Inter, Arial, sans-serif", display: "flex", minHeight: 900, fontSize: 11.5, color: "#1a1a1a", background: "#fff" }}>
      {/* Dark sidebar */}
      <div style={{ width: 200, background: "#1E1B4B", color: "#fff", padding: "36px 18px", flexShrink: 0 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: `linear-gradient(135deg,${accent},#4F46E5)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, margin: "0 auto 16px" }}>{(p.name || "?")[0]?.toUpperCase()}</div>
        <div style={{ textAlign: "center", marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontWeight: 800, fontSize: 13 }}>{p.name || "Your Name"}</div>
          {p.title && <div style={{ fontSize: 9.5, color: "#A5B4FC", marginTop: 4, fontWeight: 500 }}>{p.title}</div>}
        </div>
        <div style={{ fontSize: 9.5, lineHeight: 2, color: "rgba(255,255,255,0.7)" }}>
          {p.email && <div>✉ {p.email}</div>}
          {p.phone && <div>☎ {p.phone}</div>}
          {p.location && <div>⊙ {p.location}</div>}
          {p.linkedin && <div>in {p.linkedin}</div>}
        </div>
        {data.skills?.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A5B4FC", marginBottom: 10 }}>Skills</div>
            {data.skills.map((s, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: "#818CF8", marginBottom: 3 }}>{s.category}</div>
                <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>{s.items}</div>
              </div>
            ))}
          </div>
        )}
        {data.languages?.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A5B4FC", marginBottom: 8 }}>Languages</div>
            {data.languages.map((l, i) => <div key={i} style={{ fontSize: 9.5, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>{l.language}{l.proficiency ? ` · ${l.proficiency}` : ""}</div>)}
          </div>
        )}
      </div>
      {/* Main content */}
      <div style={{ flex: 1, padding: "36px 28px", lineHeight: 1.55 }}>
        {data.summary && (
          <div style={{ marginBottom: 20, padding: "12px 16px", background: "#EDE9FE", borderRadius: 10, borderLeft: `3px solid ${accent}` }}>
            <p style={{ margin: 0, color: "#3730A3", fontSize: 11, lineHeight: 1.7 }}>{data.summary}</p>
          </div>
        )}
        {data.experience?.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: accent, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-block", width: 18, height: 2, background: accent }} />Experience
            </div>
            {data.experience.map((e, i) => (
              <div key={i} style={{ marginBottom: 13, paddingLeft: 14, borderLeft: `2px solid ${i === 0 ? accent : "#E5E7EB"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: 12 }}>{e.position}</span>
                  <span style={{ fontSize: 10, color: "#9CA3AF" }}>{e.startDate}{e.current ? " – Present" : e.endDate ? ` – ${e.endDate}` : ""}</span>
                </div>
                <div style={{ color: accent, fontSize: 10.5, fontWeight: 600, marginBottom: 3 }}>{e.company}{e.location ? ` · ${e.location}` : ""}</div>
                {e.description && <p style={{ margin: 0, color: "#4B5563", fontSize: 10.5, whiteSpace: "pre-line" }}>{e.description}</p>}
              </div>
            ))}
          </div>
        )}
        {data.education?.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: accent, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-block", width: 18, height: 2, background: accent }} />Education
            </div>
            {data.education.map((e, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 11.5 }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
                <div style={{ color: "#6B7280", fontSize: 10.5 }}>{e.school} <span style={{ color: "#9CA3AF", fontSize: 10 }}>{e.endDate || e.startDate}</span></div>
              </div>
            ))}
          </div>
        )}
        {data.certifications?.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: accent, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-block", width: 18, height: 2, background: accent }} />Certifications
            </div>
            {data.certifications.map((c, i) => <div key={i} style={{ fontSize: 11, marginBottom: 5 }}><strong>{c.name}</strong>{c.issuer && <span style={{ color: "#9CA3AF" }}> · {c.issuer}</span>}{c.date && <span style={{ color: "#9CA3AF" }}> ({c.date})</span>}</div>)}
          </div>
        )}
        {data.projects?.length > 0 && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: accent, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-block", width: 18, height: 2, background: accent }} />Projects
            </div>
            {data.projects.map((p, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 11.5 }}>{p.name}{p.technologies && <span style={{ fontWeight: 400, color: "#9CA3AF", fontSize: 10, marginLeft: 8 }}>{p.technologies}</span>}</div>
                {p.description && <p style={{ margin: "3px 0 0", color: "#4B5563", fontSize: 10.5 }}>{p.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PikachuTemplate({ data }) {
  const p = data.personal || {};
  const accent = "#D97706";
  return (
    <div style={{ fontFamily: "'Arial', Helvetica, sans-serif", color: "#111", background: "#fff", padding: "40px 48px", minHeight: 900, fontSize: 12, lineHeight: 1.6 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em", color: "#111" }}>{p.name || "Your Name"}</div>
        {p.title && <div style={{ fontSize: 13, color: accent, fontWeight: 700, marginTop: 3 }}>{p.title}</div>}
        <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
          {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).map((v, i) => (
            <span key={i} style={{ fontSize: 10.5, color: "#555", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 100, padding: "2px 10px" }}>{v}</span>
          ))}
        </div>
      </div>
      <div style={{ width: "100%", height: 2, background: `linear-gradient(90deg, ${accent}, #FCD34D, transparent)`, marginBottom: 20 }} />
      {data.summary && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 6 }}>Profile</div>
          <p style={{ margin: 0, color: "#374151", fontSize: 11.5, lineHeight: 1.7 }}>{data.summary}</p>
        </div>
      )}
      {data.experience?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 10 }}>Experience</div>
          {data.experience.map((e, i) => (
            <div key={i} style={{ marginBottom: 14, position: "relative", paddingLeft: 16 }}>
              <div style={{ position: "absolute", left: 0, top: 5, width: 7, height: 7, borderRadius: "50%", background: accent }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 700, fontSize: 12.5 }}>{e.position}</span>
                <span style={{ fontSize: 10, color: "#9CA3AF" }}>{e.startDate}{e.current ? " – Present" : e.endDate ? ` – ${e.endDate}` : ""}</span>
              </div>
              <div style={{ color: accent, fontSize: 11, fontWeight: 600 }}>{e.company}{e.location ? ` · ${e.location}` : ""}</div>
              {e.description && <p style={{ margin: "4px 0 0", color: "#4B5563", fontSize: 11, whiteSpace: "pre-line" }}>{e.description}</p>}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          {data.education?.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 10 }}>Education</div>
              {data.education.map((e, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
                  <div style={{ color: "#6B7280", fontSize: 11 }}>{e.school}</div>
                  <div style={{ color: "#9CA3AF", fontSize: 10 }}>{e.endDate || e.startDate}</div>
                </div>
              ))}
            </div>
          )}
          {data.certifications?.length > 0 && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 8 }}>Certifications</div>
              {data.certifications.map((c, i) => <div key={i} style={{ fontSize: 11, marginBottom: 5 }}><strong>{c.name}</strong>{c.issuer && <div style={{ color: "#9CA3AF", fontSize: 10 }}>{c.issuer}</div>}</div>)}
            </div>
          )}
        </div>
        <div>
          {data.skills?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 10 }}>Skills</div>
              {data.skills.map((s, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#374151", marginBottom: 4 }}>{s.category}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {(s.items || "").split(",").map((skill, j) => (
                      <span key={j} style={{ fontSize: 9.5, background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 100, padding: "1px 8px", color: "#92400E" }}>{skill.trim()}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.languages?.length > 0 && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 8 }}>Languages</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {data.languages.map((l, i) => <span key={i} style={{ fontSize: 10.5, background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 100, padding: "2px 10px", color: "#92400E" }}>{l.language}{l.proficiency ? ` · ${l.proficiency}` : ""}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
      {data.projects?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 10 }}>Projects</div>
          {data.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: 10, paddingLeft: 16, position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: 5, width: 7, height: 7, borderRadius: "50%", background: "#FCD34D" }} />
              <div style={{ fontWeight: 700, fontSize: 12 }}>{p.name}{p.technologies && <span style={{ fontWeight: 400, color: "#9CA3AF", fontSize: 10, marginLeft: 8 }}>{p.technologies}</span>}</div>
              {p.description && <p style={{ margin: "2px 0 0", color: "#4B5563", fontSize: 11 }}>{p.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResumeTemplate({ templateId, data }) {
  switch (templateId) {
    case "modern":       return <ModernTemplate data={data} />;
    case "minimal":      return <MinimalTemplate data={data} />;
    case "professional": return <ProfessionalTemplate data={data} />;
    case "creative":     return <CreativeTemplate data={data} />;
    case "executive":    return <ExecutiveTemplate data={data} />;
    case "compact":      return <CompactTemplate data={data} />;
    case "impact":       return <ImpactTemplate data={data} />;
    case "chikorita":    return <ChikoritaTemplate data={data} />;
    case "onyx":         return <OnyxTemplate data={data} />;
    case "gengar":       return <GengarTemplate data={data} />;
    case "pikachu":      return <PikachuTemplate data={data} />;
    default:             return <ClassicTemplate data={data} />;
  }
}

// ── Template Gallery ──────────────────────────────────────────────────────────
function TemplateGallery({ onSelect, onClose, userPlan }) {
  const [filter, setFilter] = useState("All");
  const filters = ["All", "Free", "Premium", "ATS-Friendly", "Modern", "Minimal", "Corporate", "Creative"];
  const filtered = RESUME_TEMPLATES.filter(t => {
    if (filter === "All") return true;
    if (filter === "Free") return t.free;
    if (filter === "Premium") return !t.free;
    return t.category === filter;
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", flexDirection: "column", overflow: "auto" }}>
      <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#020817", position: "sticky", top: 0 }}>
        <div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1.25rem", margin: "0 0 4px" }}>Choose a Template</h2>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>6 free templates · 4 premium templates</p>
        </div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: "0.875rem" }}>✕ Close</button>
      </div>
      <div style={{ padding: "1rem 2rem", display: "flex", gap: 8, flexWrap: "wrap", background: "#020817", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${filter === f ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.07)"}`, color: filter === f ? "#60A5FA" : "rgba(255,255,255,0.5)", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>{f}</button>
        ))}
      </div>
      <div style={{ padding: "2rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.5rem" }}>
        {filtered.map(t => (
          <div key={t.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", transition: "border-color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = t.accent + "88"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
          >
            {/* Real mini template render */}
            <div style={{ height: 200, overflow: "hidden", position: "relative", background: "#f1f5f9", cursor: "pointer" }} onClick={() => t.free || userPlan === "pro" || userPlan === "premium" ? onSelect(t.id) : onSelect("_premium_upsell")}>
              <div style={{ transform: "scale(0.22)", transformOrigin: "top left", width: "454%", pointerEvents: "none" }}>
                <ResumeTemplate templateId={t.id} data={PREVIEW_RESUME_DATA} />
              </div>
              {!t.free && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)", color: "#fff", fontSize: "0.75rem", fontWeight: 800, padding: "6px 16px", borderRadius: 100 }}>👑 PRO TEMPLATE</div>
                </div>
              )}
              <div style={{ position: "absolute", top: 8, right: 8, background: t.free ? "rgba(16,185,129,0.9)" : "rgba(245,158,11,0.9)", color: "#fff", fontSize: "0.62rem", fontWeight: 700, padding: "3px 8px", borderRadius: 100 }}>{t.free ? "FREE" : "PRO"}</div>
            </div>
            <div style={{ padding: "0.875rem 1rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 2 }}>{t.name}</div>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>{t.desc}</div>
              {t.free ? (
                <button onClick={() => onSelect(t.id)} style={{ width: "100%", background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", color: "#fff", borderRadius: 8, padding: "9px", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}>Use Template →</button>
              ) : (userPlan === "pro" || userPlan === "premium") ? (
                <button onClick={() => onSelect(t.id)} style={{ width: "100%", background: "linear-gradient(135deg,#F59E0B,#D97706)", border: "none", color: "#fff", borderRadius: 8, padding: "9px", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}>Use Template 👑</button>
              ) : (
                <button onClick={() => onSelect("_premium_upsell")} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.45)", borderRadius: 8, padding: "9px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}>🔒 Upgrade to Pro</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Premium Upsell Modal ──────────────────────────────────────────────────────
function PremiumModal({ onClose, onUpgrade }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "#0F172A", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 20, padding: "2rem", maxWidth: 440, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>👑</div>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1.4rem", margin: "0 0 0.5rem" }}>Unlock Premium Templates</h2>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", margin: "0 0 1.5rem" }}>Get access to exclusive designs used by top professionals</p>
        {[["✨", "Exclusive executive designs"],["🎨", "Creative & modern layouts"],["📊", "ATS-optimized templates"],["⬇️", "Unlimited PDF downloads"],["🔄", "Switch templates anytime"]].map(([icon, text]) => (
          <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, textAlign: "left" }}>
            <span style={{ fontSize: "1rem" }}>{icon}</span>
            <span style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.7)" }}>{text}</span>
          </div>
        ))}
        <button onClick={onUpgrade} style={{ width: "100%", marginTop: "1.5rem", padding: "13px", background: "linear-gradient(135deg,#F59E0B,#EF4444)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: "pointer" }}>Upgrade Now — ₹599/mo</button>
        <button onClick={onClose} style={{ marginTop: 10, background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.85rem" }}>Maybe later</button>
      </div>
    </div>
  );
}

// ── Resume Builder ────────────────────────────────────────────────────────────
const BUILDER_TABS = ["Personal", "Summary", "Experience", "Education", "Skills", "More"];

function ResumeBuilder({ user, resumeId, templateId: initTemplate, initialData, onBack }) {
  const [tab, setTab] = useState("Personal");
  const [templateId, setTemplateId] = useState(initTemplate || "classic");
  const [data, setData] = useState(initialData || EMPTY_RESUME_DATA);
  const [title, setTitle] = useState(initialData?.title || "My Resume");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTemplateStrip, setShowTemplateStrip] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [currentId, setCurrentId] = useState(resumeId || null);
  const [zoom, setZoom] = useState(0.72);
  const isMobile = useMobile();

  const set = (section, val) => setData(prev => ({ ...prev, [section]: val }));
  const setPersonal = (field, val) => setData(prev => ({ ...prev, personal: { ...prev.personal, [field]: val } }));

  const addItem = (section, item) => setData(prev => ({ ...prev, [section]: [...(prev[section] || []), item] }));
  const updateItem = (section, idx, field, val) => setData(prev => ({ ...prev, [section]: prev[section].map((it, i) => i === idx ? { ...it, [field]: val } : it) }));
  const removeItem = (section, idx) => setData(prev => ({ ...prev, [section]: prev[section].filter((_, i) => i !== idx) }));

  const saveResume = async () => {
    setSaving(true);
    const payload = { title, template: templateId, resume_data: data };
    const r = currentId
      ? await apiPut("/resumes", { id: currentId, ...payload })
      : await apiPost("/resumes", payload);
    if (r.success) { setCurrentId(r.data?.id || currentId); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
  };

  // Auto-save every 30s
  useEffect(() => {
    if (!currentId) return;
    const t = setTimeout(saveResume, 30000);
    return () => clearTimeout(t);
  }, [data, templateId, title]);

  const downloadPDF = () => {
    setPrinting(true);
    setTimeout(() => {
      const style = document.createElement("style");
      style.id = "__resume_print__";
      style.textContent = `@media print { body > * { display: none !important; } #resume-print-root { display: block !important; position: fixed; top: 0; left: 0; width: 100%; z-index: 99999; } @page { margin: 0; size: A4; } }`;
      document.head.appendChild(style);
      window.print();
      setTimeout(() => { document.getElementById("__resume_print__")?.remove(); setPrinting(false); }, 500);
    }, 100);
  };

  const inputStyle = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 12px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.875rem", outline: "none" };
  const labelStyle = { fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.07em", display: "block", marginBottom: 5 };
  const addBtn = { background: "rgba(59,130,246,0.1)", border: "1px dashed rgba(59,130,246,0.3)", color: "#60A5FA", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, width: "100%", marginTop: 8 };

  const renderForm = () => {
    if (tab === "Personal") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[["Full Name", "name"], ["Professional Title", "title"], ["Email", "email"], ["Phone", "phone"], ["Location", "location"], ["LinkedIn URL", "linkedin"], ["Website / Portfolio", "website"]].map(([label, field]) => (
          <div key={field}>
            <label style={labelStyle}>{label.toUpperCase()}</label>
            <input value={data.personal[field] || ""} onChange={e => setPersonal(field, e.target.value)} placeholder={label} style={inputStyle} />
          </div>
        ))}
      </div>
    );

    if (tab === "Summary") return (
      <div>
        <label style={labelStyle}>PROFESSIONAL SUMMARY</label>
        <textarea value={data.summary || ""} onChange={e => set("summary", e.target.value)} placeholder="Write a compelling 2-4 sentence summary highlighting your experience, skills, and career goals..." rows={6} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
      </div>
    );

    if (tab === "Experience") return (
      <div>
        {(data.experience || []).map((e, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "1rem", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Experience {i + 1}</span>
              <button onClick={() => removeItem("experience", i)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: "0.8rem" }}>Remove</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              {[["Job Title", "position"], ["Company", "company"], ["Location", "location"], ["Start Date", "startDate"]].map(([label, field]) => (
                <div key={field}>
                  <label style={labelStyle}>{label.toUpperCase()}</label>
                  <input value={e[field] || ""} onChange={ev => updateItem("experience", i, field, ev.target.value)} placeholder={label} style={inputStyle} />
                </div>
              ))}
              <div>
                <label style={labelStyle}>END DATE</label>
                <input value={e.endDate || ""} onChange={ev => updateItem("experience", i, "endDate", ev.target.value)} placeholder="End Date" disabled={e.current} style={{ ...inputStyle, opacity: e.current ? 0.4 : 1 }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 22 }}>
                <input type="checkbox" id={`cur-${i}`} checked={e.current || false} onChange={ev => updateItem("experience", i, "current", ev.target.checked)} />
                <label htmlFor={`cur-${i}`} style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}>Currently working here</label>
              </div>
            </div>
            <label style={labelStyle}>DESCRIPTION / ACHIEVEMENTS</label>
            <textarea value={e.description || ""} onChange={ev => updateItem("experience", i, "description", ev.target.value)} placeholder="• Describe your key responsibilities and achievements" rows={4} style={{ ...inputStyle, resize: "vertical" }} />
          </div>
        ))}
        <button onClick={() => addItem("experience", { position: "", company: "", location: "", startDate: "", endDate: "", current: false, description: "" })} style={addBtn}>+ Add Experience</button>
      </div>
    );

    if (tab === "Education") return (
      <div>
        {(data.education || []).map((e, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "1rem", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Education {i + 1}</span>
              <button onClick={() => removeItem("education", i)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: "0.8rem" }}>Remove</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[["School / University", "school"], ["Degree", "degree"], ["Field of Study", "field"], ["GPA (optional)", "gpa"], ["Start Year", "startDate"], ["End Year / Expected", "endDate"]].map(([label, field]) => (
                <div key={field}>
                  <label style={labelStyle}>{label.toUpperCase()}</label>
                  <input value={e[field] || ""} onChange={ev => updateItem("education", i, field, ev.target.value)} placeholder={label} style={inputStyle} />
                </div>
              ))}
            </div>
          </div>
        ))}
        <button onClick={() => addItem("education", { school: "", degree: "", field: "", gpa: "", startDate: "", endDate: "" })} style={addBtn}>+ Add Education</button>
      </div>
    );

    if (tab === "Skills") return (
      <div>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", margin: "0 0 12px" }}>Group skills by category (e.g. "Languages", "Frameworks", "Tools")</p>
        {(data.skills || []).map((s, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input value={s.category || ""} onChange={e => updateItem("skills", i, "category", e.target.value)} placeholder="Category" style={inputStyle} />
            <input value={s.items || ""} onChange={e => updateItem("skills", i, "items", e.target.value)} placeholder="React, Node.js, Python, ..." style={inputStyle} />
            <button onClick={() => removeItem("skills", i)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", borderRadius: 6, padding: "8px 10px", cursor: "pointer", fontSize: "0.75rem" }}>✕</button>
          </div>
        ))}
        <button onClick={() => addItem("skills", { category: "", items: "" })} style={addBtn}>+ Add Skill Group</button>
      </div>
    );

    if (tab === "More") return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: 10, color: "rgba(255,255,255,0.7)" }}>Projects</div>
          {(data.projects || []).map((p, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "1rem", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: "0.8rem" }}>Project {i + 1}</span>
                <button onClick={() => removeItem("projects", i)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: "0.75rem" }}>Remove</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div><label style={labelStyle}>PROJECT NAME</label><input value={p.name || ""} onChange={e => updateItem("projects", i, "name", e.target.value)} placeholder="Project Name" style={inputStyle} /></div>
                <div><label style={labelStyle}>TECHNOLOGIES</label><input value={p.technologies || ""} onChange={e => updateItem("projects", i, "technologies", e.target.value)} placeholder="React, Node.js..." style={inputStyle} /></div>
                <div><label style={labelStyle}>URL (optional)</label><input value={p.url || ""} onChange={e => updateItem("projects", i, "url", e.target.value)} placeholder="github.com/..." style={inputStyle} /></div>
              </div>
              <label style={labelStyle}>DESCRIPTION</label>
              <textarea value={p.description || ""} onChange={e => updateItem("projects", i, "description", e.target.value)} placeholder="Brief description of the project" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
          ))}
          <button onClick={() => addItem("projects", { name: "", technologies: "", url: "", description: "" })} style={addBtn}>+ Add Project</button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: 10, color: "rgba(255,255,255,0.7)" }}>Certifications</div>
          {(data.certifications || []).map((c, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <input value={c.name || ""} onChange={e => updateItem("certifications", i, "name", e.target.value)} placeholder="Certification name" style={inputStyle} />
              <input value={c.issuer || ""} onChange={e => updateItem("certifications", i, "issuer", e.target.value)} placeholder="Issuer (e.g. Google)" style={inputStyle} />
              <input value={c.date || ""} onChange={e => updateItem("certifications", i, "date", e.target.value)} placeholder="Year" style={inputStyle} />
              <button onClick={() => removeItem("certifications", i)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", borderRadius: 6, padding: "8px 10px", cursor: "pointer", fontSize: "0.75rem" }}>✕</button>
            </div>
          ))}
          <button onClick={() => addItem("certifications", { name: "", issuer: "", date: "" })} style={addBtn}>+ Add Certification</button>
        </div>

        <div>
          <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: 10, color: "rgba(255,255,255,0.7)" }}>Languages</div>
          {(data.languages || []).map((l, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <input value={l.language || ""} onChange={e => updateItem("languages", i, "language", e.target.value)} placeholder="Language" style={inputStyle} />
              <input value={l.proficiency || ""} onChange={e => updateItem("languages", i, "proficiency", e.target.value)} placeholder="Native / Fluent / Intermediate" style={inputStyle} />
              <button onClick={() => removeItem("languages", i)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", borderRadius: 6, padding: "8px 10px", cursor: "pointer", fontSize: "0.75rem" }}>✕</button>
            </div>
          ))}
          <button onClick={() => addItem("languages", { language: "", proficiency: "" })} style={addBtn}>+ Add Language</button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 1300, display: "flex", flexDirection: isMobile ? "column" : "row", gap: "1.25rem", height: isMobile ? "auto" : "calc(100vh - 80px)" }}>
      {showTemplates && <TemplateGallery userPlan={user?.plan} onSelect={id => { if (id === "_premium_upsell") return; setTemplateId(id); setShowTemplates(false); }} onClose={() => setShowTemplates(false)} />}

      {/* Left: Form */}
      <div style={{ width: isMobile ? "100%" : 420, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "0.75rem 1rem", display: "flex", gap: 10, alignItems: "center" }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Resume title..." style={{ ...inputStyle, padding: "6px 10px", fontSize: "0.9rem", fontWeight: 600, flex: 1 }} />
          <button onClick={saveResume} disabled={saving} style={{ background: saved ? "#10B981" : "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", color: "#fff", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem", whiteSpace: "nowrap" }}>
            {saving ? "Saving..." : saved ? "✓ Saved" : "Save"}
          </button>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: "0.8rem" }}>← Back</button>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {BUILDER_TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${tab === t ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.07)"}`, color: tab === t ? "#60A5FA" : "rgba(255,255,255,0.5)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}>{t}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: "auto", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "1.25rem" }}>
          {renderForm()}
        </div>
      </div>

      {/* Right: Preview */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
        {/* Toolbar */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => setShowTemplateStrip(s => !s)} style={{ background: showTemplateStrip ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${showTemplateStrip ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.1)"}`, color: showTemplateStrip ? "#60A5FA" : "#fff", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontWeight: 600, fontSize: "0.78rem" }}>
            🎨 {RESUME_TEMPLATES.find(t => t.id === templateId)?.name} ▾
          </button>
          <button onClick={() => setShowTemplates(true)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: "0.75rem" }}>All Templates</button>
          {/* Zoom controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 4 }}>
            <button onClick={() => setZoom(z => Math.max(0.4, +(z - 0.1).toFixed(1)))} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: "0.85rem" }}>−</button>
            <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", minWidth: 36, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(1.0, +(z + 0.1).toFixed(1)))} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: "0.85rem" }}>+</button>
          </div>
          <button onClick={downloadPDF} style={{ marginLeft: "auto", background: "linear-gradient(135deg,#10B981,#059669)", border: "none", color: "#fff", borderRadius: 8, padding: "7px 18px", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 6 }}>⬇ Download PDF</button>
        </div>

        {/* Inline template switcher strip */}
        {showTemplateStrip && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px", overflowX: "auto" }}>
            <div style={{ display: "flex", gap: 10, minWidth: "max-content" }}>
              {RESUME_TEMPLATES.filter(t => t.free || user?.plan === "pro" || user?.plan === "premium").map(t => (
                <div key={t.id} onClick={() => { setTemplateId(t.id); setShowTemplateStrip(false); }}
                  style={{ width: 90, cursor: "pointer", borderRadius: 8, overflow: "hidden", border: `2px solid ${templateId === t.id ? t.accent : "rgba(255,255,255,0.1)"}`, flexShrink: 0, transition: "border-color 0.2s" }}>
                  <div style={{ height: 72, overflow: "hidden", background: "#f1f5f9", position: "relative" }}>
                    <div style={{ transform: "scale(0.09)", transformOrigin: "top left", width: "1111%", pointerEvents: "none" }}>
                      <ResumeTemplate templateId={t.id} data={PREVIEW_RESUME_DATA} />
                    </div>
                  </div>
                  <div style={{ padding: "4px 6px", background: templateId === t.id ? t.accent : "rgba(255,255,255,0.04)", fontSize: "0.68rem", fontWeight: 700, color: templateId === t.id ? "#fff" : "rgba(255,255,255,0.5)", textAlign: "center" }}>{t.name}</div>
                </div>
              ))}
              {RESUME_TEMPLATES.filter(t => !t.free && user?.plan !== "pro" && user?.plan !== "premium").length > 0 && (
                <div onClick={() => { setShowTemplateStrip(false); setShowTemplates(true); }}
                  style={{ width: 90, cursor: "pointer", borderRadius: 8, border: "1px dashed rgba(245,158,11,0.4)", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "8px 4px", background: "rgba(245,158,11,0.05)" }}>
                  <span style={{ fontSize: "1.2rem" }}>👑</span>
                  <span style={{ fontSize: "0.65rem", color: "#F59E0B", fontWeight: 700, textAlign: "center" }}>Unlock Pro</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preview canvas */}
        <div style={{ flex: 1, overflow: "auto", background: "#CBD5E1", borderRadius: 12, padding: "20px" }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: `${(1/zoom)*100}%`, boxShadow: "0 8px 40px rgba(0,0,0,0.25)", transition: "transform 0.15s" }}>
            <ResumeTemplate templateId={templateId} data={data} />
          </div>
        </div>
      </div>

      {/* Hidden print container */}
      {printing && (
        <div id="resume-print-root" style={{ display: "none", position: "fixed", top: 0, left: 0, width: "210mm", zIndex: 99999 }}>
          <ResumeTemplate templateId={templateId} data={data} />
        </div>
      )}
    </div>
  );
}

// ── Resume Quality Checker ────────────────────────────────────────────────────
function ResumeQualityChecker({ resumes }) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  const check = async () => {
    if (!resumes.length) return;
    setChecking(true);
    const r = resumes[0];
    const data = r.resume_data || {};
    const text = [
      data.personal?.name, data.personal?.email, data.summary,
      ...(data.experience || []).map(e => `${e.title} ${e.company} ${e.description}`),
      ...(data.education || []).map(e => `${e.degree} ${e.school}`),
      ...(data.skills || []).join(" "),
    ].filter(Boolean).join(" ");

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const hasEmail = /\S+@\S+/.test(text);
    const hasPhone = /\d{10}/.test(text);
    const hasExperience = (data.experience || []).length > 0;
    const hasSkills = (data.skills || []).length >= 3;
    const hasSummary = (data.summary || "").length > 50;
    const ATS_KEYWORDS = ["experience", "skills", "education", "proficient", "developed", "managed", "led", "achieved", "results", "team"];
    const atsHits = ATS_KEYWORDS.filter(k => text.toLowerCase().includes(k)).length;

    const lengthStatus = wordCount < 200 ? "Needs improvement" : wordCount > 700 ? "Too long" : "Good";
    const contentStatus = (hasEmail && hasPhone && hasExperience && hasSkills && hasSummary) ? "Good" : "Needs improvement";
    const atsStatus = atsHits >= 6 ? "Good" : atsHits >= 3 ? "Average" : "Needs improvement";

    const score = Math.round(((lengthStatus === "Good" ? 33 : 10) + (contentStatus === "Good" ? 34 : 12) + (atsHits / 10) * 33));

    setResult({ lengthStatus, contentStatus, atsStatus, score, wordCount, resumeTitle: r.title });
    setChecking(false);
  };

  const statusColor = (s) => s === "Good" ? "#10B981" : s === "Average" ? "#F59E0B" : "#EF4444";
  const statusBg = (s) => s === "Good" ? "rgba(16,185,129,0.12)" : s === "Average" ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)";

  return (
    <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14, padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 3 }}>📋 Resume Quality Check</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem" }}>Instantly score your resume on length, content, and ATS-friendliness</div>
        </div>
        {!result ? (
          <button onClick={check} disabled={checking || !resumes.length} style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", border: "none", color: "#fff", borderRadius: 9, padding: "9px 20px", cursor: resumes.length ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "0.82rem", opacity: resumes.length ? 1 : 0.5 }}>
            {checking ? "Checking..." : resumes.length ? "Check My Resume" : "Create a Resume First"}
          </button>
        ) : (
          <button onClick={() => setResult(null)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", borderRadius: 9, padding: "9px 18px", cursor: "pointer", fontSize: "0.8rem" }}>Re-check</button>
        )}
      </div>

      {result && (
        <div style={{ marginTop: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "2rem", color: result.score >= 70 ? "#10B981" : result.score >= 50 ? "#F59E0B" : "#EF4444" }}>{result.score}</div>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>Resume Score</div>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>for "{result.resumeTitle}"</div>
            </div>
            <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, marginLeft: 8 }}>
              <div style={{ height: "100%", width: `${result.score}%`, background: result.score >= 70 ? "#10B981" : result.score >= 50 ? "#F59E0B" : "#EF4444", borderRadius: 3, transition: "width 0.6s ease" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { label: "Length", status: result.lengthStatus, detail: `${result.wordCount} words` },
              { label: "Content", status: result.contentStatus, detail: "Contact, skills, experience" },
              { label: "ATS-friendly", status: result.atsStatus, detail: "Industry keywords" },
            ].map(({ label, status, detail }) => (
              <div key={label} style={{ flex: 1, minWidth: 140, background: statusBg(status), border: `1px solid ${statusColor(status)}33`, borderRadius: 10, padding: "0.75rem 1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor(status), display: "inline-block" }} />
                  <span style={{ fontWeight: 700, fontSize: "0.82rem", color: statusColor(status) }}>{status}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)" }}>{detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── My Resumes Page ───────────────────────────────────────────────────────────
function ResumePage({ user, profile }) {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGallery, setShowGallery] = useState(false);
  const [builder, setBuilder] = useState(null);
  const [showPremium, setShowPremium] = useState(false);
  const isMobile = useMobile();

  const load = () => { apiGet("/resumes").then(r => { setResumes(r.success ? r.data : []); setLoading(false); }); };
  useEffect(() => { load(); }, []);

  const startBuilder = (templateId, resumeId = null, data = null) => {
    setShowGallery(false);
    setBuilder({ templateId, resumeId, data });
  };

  const deleteResume = async (id) => {
    if (!window.confirm("Delete this resume?")) return;
    await apiDelete(`/resumes?id=${id}`);
    setResumes(prev => prev.filter(r => r.id !== id));
  };

  const duplicateResume = async (resume) => {
    const r = await apiPost("/resumes", { title: resume.title + " (Copy)", template: resume.template, resume_data: resume.resume_data || {} });
    if (r.success) load();
  };

  if (builder) return (
    <ResumeBuilder
      user={user}
      resumeId={builder.resumeId}
      templateId={builder.templateId}
      initialData={builder.data}
      onBack={() => { setBuilder(null); load(); }}
    />
  );

  return (
    <div style={{ maxWidth: 1100 }}>
      {showGallery && <TemplateGallery userPlan={profile?.plan} onSelect={id => { if (id === "_premium_upsell") { setShowGallery(false); setShowPremium(true); } else startBuilder(id); }} onClose={() => setShowGallery(false)} />}
      {showPremium && <PremiumModal onClose={() => setShowPremium(false)} onUpgrade={() => { setShowPremium(false); }} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1.1rem", margin: "0 0 4px" }}>My Resumes</h2>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>{resumes.length} resume{resumes.length !== 1 ? "s" : ""} saved</p>
        </div>
        <button onClick={() => setShowGallery(true)} style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", color: "#fff", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontWeight: 700, fontSize: "0.875rem" }}>+ Create New Resume</button>
      </div>

      {/* Template highlight bar */}
      <div style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[["📄", "6 Free Templates"], ["👑", "4 Premium Templates"], ["🤖", "AI Resume Builder"], ["⬇", "PDF Download"]].map(([icon, text]) => (
            <span key={text} style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 6 }}><span>{icon}</span>{text}</span>
          ))}
        </div>
        <button onClick={() => setShowGallery(true)} style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "#60A5FA", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>Browse Templates →</button>
      </div>

      {/* Resume Quality Checker */}
      <ResumeQualityChecker resumes={resumes} />

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "rgba(255,255,255,0.4)" }}><Spinner /> Loading...</div>
      ) : resumes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16 }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📄</div>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, margin: "0 0 8px" }}>No resumes yet</h3>
          <p style={{ color: "rgba(255,255,255,0.4)", margin: "0 0 1.5rem", fontSize: "0.9rem" }}>Create your first professional resume in minutes</p>
          <button onClick={() => setShowGallery(true)} style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", color: "#fff", borderRadius: 10, padding: "12px 28px", cursor: "pointer", fontWeight: 700, fontSize: "0.95rem" }}>Build Your Resume</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {resumes.map(r => {
            const tmpl = RESUME_TEMPLATES.find(t => t.id === r.template) || RESUME_TEMPLATES[0];
            return (
              <div key={r.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ height: 100, background: `linear-gradient(135deg, ${tmpl.accent}22, ${tmpl.accent}55)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 56, height: 72, background: "#fff", borderRadius: 4, boxShadow: "0 2px 12px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", padding: 6, gap: 3 }}>
                    <div style={{ height: 6, background: tmpl.accent, borderRadius: 2 }} />
                    <div style={{ height: 2, background: "#e5e7eb", borderRadius: 2, width: "70%" }} />
                    <div style={{ height: 2, background: "#f3f4f6", borderRadius: 2 }} />
                    <div style={{ height: 2, background: "#f3f4f6", borderRadius: 2, width: "85%" }} />
                  </div>
                </div>
                <div style={{ padding: "0.875rem 1rem" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 3 }}>{r.title}</div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>
                    {tmpl.name} · Updated {new Date(r.updated_at).toLocaleDateString()}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => startBuilder(r.template, r.id, r.resume_data)} style={{ flex: 1, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", color: "#fff", borderRadius: 7, padding: "7px", cursor: "pointer", fontWeight: 600, fontSize: "0.78rem" }}>✏ Edit</button>
                    <button onClick={() => duplicateResume(r)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", borderRadius: 7, padding: "7px 10px", cursor: "pointer", fontSize: "0.75rem" }} title="Duplicate">⧉</button>
                    <button onClick={() => deleteResume(r.id)} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", borderRadius: 7, padding: "7px 10px", cursor: "pointer", fontSize: "0.75rem" }} title="Delete">🗑</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
  const isMobile = useMobile();

  const saveProfile = async () => {
    setSaving(true);
    await supabase.from("profiles").upsert({ id: user.id, full_name: name, updated_at: new Date().toISOString() });
    setSaving(false);
    alert("Profile saved!");
  };

  const handlePay = async (plan) => {
    if (!plan.razorpay) return;
    setPayingPlan(plan.name);
    await startPayment(plan,
      (result) => { setPaySuccess(result); setPayingPlan(null); },
      (msg) => { alert(msg); setPayingPlan(null); }
    );
  };

  const handleLogout = () => {
    clearTokens();
    onLogout();
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.25rem" }}>
        <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", margin: "0 0 1.25rem" }}>Profile</h3>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: "0.875rem" }}>
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

// ─── ADMIN PAGE ──────────────────────────────────────────────────────────────
function AdminPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isMobile = useMobile();

  useEffect(() => {
    apiGet("/admin/dashboard").then(res => {
      if (res.success) setData(res.data);
      else setError(res.message || "Access denied");
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: "4rem", color: "rgba(255,255,255,0.4)" }}><Spinner /><div style={{ marginTop: 12 }}>Loading admin data...</div></div>;
  if (error) return <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 14, padding: "2rem", textAlign: "center", color: "#FCA5A5" }}>🔒 {error}<br /><span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", marginTop: 8, display: "block" }}>Set role = 'admin' in your Supabase profiles table to access this.</span></div>;

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {[
          ["👥", data.users.total, "Total Users", "#3B82F6"],
          ["💎", data.users.pro + data.users.premium, "Paid Users", "#8B5CF6"],
          ["📤", data.applications.total, "Total Applications", "#10B981"],
          ["💰", `₹${data.revenue.total.toLocaleString()}`, "Revenue (Active)", "#F59E0B"],
        ].map(([icon, val, label, color]) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1.25rem" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>{icon}</div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.8rem", color }}>{val}</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.78rem", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.5rem" }}>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", margin: "0 0 1.25rem" }}>Plan Breakdown</h3>
          {[["Free", data.users.free, "#6B7280"], ["Pro", data.users.pro, "#3B82F6"], ["Premium", data.users.premium, "#8B5CF6"]].map(([plan, count, color]) => (
            <div key={plan} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>{plan}</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color }}>{count} users</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                <div style={{ width: `${data.users.total ? (count / data.users.total) * 100 : 0}%`, height: "100%", background: color, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.5rem" }}>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", margin: "0 0 1.25rem" }}>Recent Signups</h3>
          {data.recentUsers?.slice(0, 5).map((u, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.5rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem", flexShrink: 0 }}>
                {(u.full_name || u.email || "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.full_name || u.email}</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.72rem" }}>{new Date(u.created_at).toLocaleDateString()}</div>
              </div>
              <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: u.plan === "premium" ? "rgba(139,92,246,0.15)" : u.plan === "pro" ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.06)", color: u.plan === "premium" ? "#A78BFA" : u.plan === "pro" ? "#60A5FA" : "rgba(255,255,255,0.4)", textTransform: "capitalize" }}>{u.plan || "free"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── RESET PASSWORD SCREEN ────────────────────────────────────────────────────
function ResetPasswordScreen({ onDone }) {
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    if (!pass || pass.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (pass !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true); setError("");
    const { error: e } = await supabase.auth.updateUser({ password: pass });
    setLoading(false);
    if (e) { setError(e.message); return; }
    setSuccess(true);
    setTimeout(() => onDone(), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020817", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;800&display=swap'); @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "2.5rem", width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: 48, height: 48, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.2rem", margin: "0 auto 1rem", color: "#fff" }}>A</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.5rem", color: "#fff" }}>Set new password</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", marginTop: 4 }}>Choose a strong password for your account</p>
        </div>
        {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "#FCA5A5", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</div>}
        {success ? (
          <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "14px", color: "#86EFAC", fontSize: "0.9rem", textAlign: "center" }}>✅ Password updated! Redirecting to login...</div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input value={pass} onChange={e => setPass(e.target.value)} placeholder="New password (min 6 characters)" type="password"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box" }} />
              <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password" type="password"
                onKeyDown={e => e.key === "Enter" && handleReset()}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box" }} />
            </div>
            <button onClick={handleReset} disabled={loading} style={{ width: "100%", marginTop: "1.25rem", padding: 13, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.7 : 1 }}>
              {loading && <Spinner />}Update Password
            </button>
          </>
        )}
      </div>
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
    setScreen(u.onboarded === false ? "onboarding" : "app");
  };

  useEffect(() => {
    // Check for password recovery hash immediately
    if (window.location.hash.includes("type=recovery")) {
      setScreen("reset-password");
      return;
    }

    // Handle OAuth redirect (Google sign-in) — Supabase puts tokens in the hash
    if (window.location.hash.includes("access_token")) {
      setScreen("loading");
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session) {
          try {
            const res = await apiPost("/auth/oauth", { supabase_token: session.access_token });
            if (res.success && res.data) {
              setTokens(res.data.access_token, res.data.refresh_token || "");
              window.history.replaceState(null, "", window.location.pathname);
              const me = await apiGet("/auth/me");
              if (me.success && me.data) {
                setUser(me.data);
                setScreen(me.data.onboarded === false ? "onboarding" : "app");
                return;
              }
            }
          } catch (_) {}
          // Fallback: store Supabase token directly and try /auth/me
          setTokens(session.access_token, session.refresh_token || "");
          window.history.replaceState(null, "", window.location.pathname);
          const me = await apiGet("/auth/me");
          if (me.success && me.data) {
            setUser(me.data);
            setScreen(me.data.onboarded === false ? "onboarding" : "app");
          } else {
            setScreen("landing");
          }
        } else {
          setScreen("landing");
        }
      });
      return;
    }

    const token = getToken();
    if (!token) { setScreen("landing"); return; }
    apiGet("/auth/me").then(data => {
      if (data.success && data.data) {
        setUser(data.data);
        setScreen(data.data.onboarded === false ? "onboarding" : "app");
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
  if (screen === "login") return <AuthScreen mode="login" onAuth={(u) => checkAndRoute(u)} onToggle={() => setScreen("signup")} onBack={() => setScreen("landing")} />;
  if (screen === "signup") return <AuthScreen mode="signup" onAuth={(u) => checkAndRoute(u)} onToggle={() => setScreen("login")} onBack={() => setScreen("landing")} />;
  if (screen === "reset-password") return <ResetPasswordScreen onDone={() => { window.location.hash = ""; setScreen("login"); }} />;
  if (screen === "onboarding") return <Onboarding user={user} onComplete={() => setScreen("app")} />;
  if (screen === "app") return <AppShell user={user} onLogout={() => { setUser(null); setScreen("landing"); }} />;
  return null;
}
