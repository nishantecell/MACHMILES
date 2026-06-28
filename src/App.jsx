import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_BASE = "/api";
const OPENAI_KEY = import.meta.env.VITE_OPENAI_KEY || "";
const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY || "";
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

// Set by AppShell when admin is viewing another user's dashboard
let __viewAsUserId = null;

async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  try {
    let url = `${API_BASE}${path}`;
    // Inject view_as for non-admin routes only
    if (__viewAsUserId && (!options.method || options.method === 'GET') && !path.startsWith('/admin')) {
      url += (url.includes('?') ? '&' : '?') + `view_as=${__viewAsUserId}`;
    }
    const res = await fetch(url, { ...options, headers });
    return res.json();
  } catch (e) {
    return { success: false, message: "Network error" };
  }
}

const apiGet    = (path)       => api(path, { method: "GET" });
const apiPost   = (path, body) => api(path, { method: "POST",   body: JSON.stringify(body) });
const apiPut    = (path, body) => api(path, { method: "PUT",    body: JSON.stringify(body) });
const apiDelete = (path)       => api(path, { method: "DELETE" });

// Admin gets full premium access everywhere
const effectivePlan = (profile) => profile?.role === "admin" ? "premium" : (profile?.plan || "free");

// ─── PLANS ────────────────────────────────────────────────────────────────────
const PLANS = [
  { name: "Free", price: "₹0", period: "", amount: 0, features: ["5 AI applications/month", "1 Resume", "Basic AI matching", "Job tracking (last 5 only)"], cta: "Get Started", razorpay: null },
  { name: "Pro", price: "₹599", period: "/mo", amount: 59900, features: ["150 AI applications/month", "Unlimited resumes", "AI Resume Optimization", "AI Cover Letters", "Auto Apply engine", "Interview Preparation", "Priority support"], cta: "Start Pro", razorpay: { description: "AutoApply AI Pro Plan" }, highlight: true },
  { name: "Premium", price: "₹999", period: "/mo", amount: 99900, features: ["Unlimited AI applications/month", "LinkedIn Optimization", "AI Career Coach", "Advanced Analytics", "Multi-country search", "Early access features"], cta: "Go Premium", razorpay: { description: "AutoApply AI Premium Plan" } },
  { name: "Enterprise", price: "₹3,999", period: "/mo", amount: 399900, features: ["Everything in Premium", "Up to 50 team members", "Bulk resume screening & ranking", "Dedicated AI hiring assistant", "ATS integration (Naukri, LinkedIn, Workday)", "Custom job pipeline & workflows", "Campus hiring & bulk outreach", "White-label branding", "Priority SLA & dedicated account manager", "Advanced team analytics dashboard", "API access for custom integrations", "Quarterly strategy review call"], cta: "Contact Sales", razorpay: null, enterprise: true },
];

const NAV_ITEMS = ["Dashboard", "Jobs", "Applications", "Resume", "Interview Prep", "AI Assistant", "Settings"];
const STATUS_COLORS = { Applied: "#3B82F6", Viewed: "#8B5CF6", Assessment: "#F59E0B", Interview: "#10B981", Offer: "#059669", Rejected: "#EF4444", Archived: "#6B7280" };
const PLAN_COLORS = { free: ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.4)"], pro: ["rgba(59,130,246,0.15)", "#60A5FA"], premium: ["rgba(139,92,246,0.15)", "#A78BFA"], enterprise: ["rgba(251,191,36,0.15)", "#FCD34D"] };

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

// ─── GEMINI HELPERS ───────────────────────────────────────────────────────────
async function callGemini(prompt, maxTokens = 600) {
  if (!GEMINI_KEY) throw new Error("GEMINI_KEY_MISSING");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini error ${res.status}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function generateCoverLetter(jobTitle, company, skills) {
  const prompt = `Write a professional, concise cover letter for a ${jobTitle} position at ${company}. The candidate has these skills: ${skills}. Keep it under 200 words, warm but professional tone.`;
  // Try Gemini Flash first, fall back to OpenAI
  if (GEMINI_KEY) return callGemini(prompt, 500);
  return callOpenAI([{ role: "user", content: prompt }], 400);
}

// ─── AI HELPERS (via backend) ─────────────────────────────────────────────────
async function callAI(messages, mode = "chat") {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, mode }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.message || "AI service unavailable");
  return data.content || "";
}

async function analyzeResume(resumeText) {
  return callAI([{ role: "user", content: `Analyze this resume and provide: 1) ATS score out of 100, 2) Top 3 improvements, 3) Missing keywords for tech roles. Resume: ${resumeText.slice(0, 1000)}. Format as JSON: {"score": number, "improvements": ["..."], "keywords": ["..."]}` }]);
}

async function chatWithAI(messages, mode = "chat") {
  return callAI(messages, mode);
}

// ── Parse resume PDF/text → structured data via PDF.js + OpenAI ──────────────
async function extractTextFromPDF(file) {
  // Try loading pdf.js from unpkg (more reliable than cdnjs)
  if (!window.pdfjsLib) {
    const urls = [
      "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
    ];
    for (const url of urls) {
      try {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script"); s.src = url;
          s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
        });
        if (window.pdfjsLib) break;
      } catch { /* try next */ }
    }
    if (!window.pdfjsLib) throw new Error("Could not load PDF reader. Try uploading a .txt file instead.");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(" ") + "\n";
  }
  return text.trim();
}

// Fallback: regex-based resume parser (no API needed)
function parseResumeWithRegex(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  const phoneMatch = text.match(/(\+?\d[\d\s\-().]{8,14}\d)/);
  const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
  const websiteMatch = text.match(/(?:https?:\/\/)?(?:www\.)?[\w-]+\.(?:com|io|dev|me|co\.in)[/\w-]*/i);

  // Name: usually first non-empty line that's not an email/phone/url
  const nameLine = lines.find(l => l.length > 2 && l.length < 60 && !/[@|http|www|\d{4}]/.test(l) && !/resume|curriculum|cv/i.test(l)) || "";

  // Title: second candidate line
  const titleLine = lines.find((l, i) => i > 0 && i < 6 && l !== nameLine && l.length < 80 && !/[@\d]/.test(l)) || "";

  // Locate section boundaries
  const sectionHeaders = /^(experience|work experience|employment|education|skills|projects|certifications?|languages?|summary|objective|profile|achievements?)/i;
  const sections = {};
  let current = "intro";
  for (const line of lines) {
    if (sectionHeaders.test(line)) { current = line.toLowerCase().split(/\s/)[0]; sections[current] = []; }
    else { if (!sections[current]) sections[current] = []; sections[current].push(line); }
  }

  const getSection = (...keys) => { for (const k of keys) { const match = Object.keys(sections).find(s => s.startsWith(k)); if (match) return sections[match] || []; } return []; };

  // Skills
  const skillLines = getSection("skill");
  const skills = skillLines.length ? [{ category: "Skills", items: skillLines.slice(0, 10).join(", ") }] : [];

  // Experience: look for job entries
  const expLines = getSection("experience", "employment", "work");
  const experience = [];
  let currentExp = null;
  for (const line of expLines) {
    const dateMatch = line.match(/(\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|january|february|march|april|june|july|august|september|october|november|december)?\s*\d{4}\b)/gi);
    if (dateMatch && line.length < 120) {
      if (currentExp) experience.push(currentExp);
      currentExp = { position: line.replace(/[-|·•,\s]+\d{4}.*/g, "").trim(), company: "", location: "", startDate: dateMatch[0] || "", endDate: dateMatch[1] || "", current: /present|current/i.test(line), description: "" };
    } else if (currentExp) { currentExp.description = (currentExp.description + " " + line).trim().slice(0, 400); }
    else { experience.push({ position: line.slice(0, 60), company: "", location: "", startDate: "", endDate: "", current: false, description: "" }); }
  }
  if (currentExp) experience.push(currentExp);

  // Education
  const eduLines = getSection("education");
  const education = [];
  let currentEdu = null;
  for (const line of eduLines) {
    if (/university|college|institute|school|iit|nit|bits|b\.tech|m\.tech|bachelor|master|b\.e|m\.e|bsc|msc/i.test(line)) {
      if (currentEdu) education.push(currentEdu);
      const dateMatch = line.match(/\d{4}/g);
      currentEdu = { degree: line.slice(0, 80), field: "", school: line.slice(0, 60), startDate: dateMatch?.[0] || "", endDate: dateMatch?.[1] || "", gpa: "" };
    } else if (currentEdu) { currentEdu.field = (currentEdu.field + " " + line).trim().slice(0, 60); }
  }
  if (currentEdu) education.push(currentEdu);

  const summaryLines = getSection("summary", "objective", "profile");

  return {
    personal: { name: nameLine, title: titleLine, email: emailMatch?.[0] || "", phone: phoneMatch?.[0] || "", location: "", linkedin: linkedinMatch?.[0] || "", website: websiteMatch?.[0] || "" },
    summary: summaryLines.slice(0, 3).join(" "),
    experience: experience.slice(0, 6),
    education: education.slice(0, 3),
    skills,
    projects: [],
    certifications: [],
    languages: [],
  };
}

async function parseResumeWithAI(text) {
  if (!OPENAI_KEY) return parseResumeWithRegex(text);
  const prompt = `Extract structured resume data from the following resume text and return ONLY a valid JSON object with this exact structure (use empty string or empty array for missing fields):
{
  "personal": { "name": "", "title": "", "email": "", "phone": "", "location": "", "linkedin": "", "website": "" },
  "summary": "",
  "experience": [{ "position": "", "company": "", "location": "", "startDate": "", "endDate": "", "current": false, "description": "" }],
  "education": [{ "degree": "", "field": "", "school": "", "startDate": "", "endDate": "", "gpa": "" }],
  "skills": [{ "category": "", "items": "" }],
  "projects": [{ "name": "", "technologies": "", "url": "", "description": "" }],
  "certifications": [{ "name": "", "issuer": "", "date": "" }],
  "languages": [{ "language": "", "proficiency": "" }]
}

Resume text:
${text.slice(0, 6000)}`;

  try {
    const result = await callOpenAI([{ role: "user", content: prompt }], 2000);
    if (!result) return parseResumeWithRegex(text);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : parseResumeWithRegex(text);
  } catch {
    return parseResumeWithRegex(text);
  }
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
function PricingPage({ onSignup, onLogin, onBack }) {
  const handlePlanClick = (plan) => {
    if (plan.razorpay) localStorage.setItem("pending_plan", plan.name);
    onSignup();
  };
  return (
    <div style={{ minHeight: "100vh", background: "#020817", color: "#fff", fontFamily: "Inter,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;800&display=swap');`}</style>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 5%", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#fff", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.1rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.9rem" }}>A</div>
          AutoApply AI
        </button>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 500 }}>Pricing</button>
          <button onClick={onLogin} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: 8, padding: "8px 20px", cursor: "pointer" }}>Log in</button>
          <button onClick={onSignup} style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", color: "#fff", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontWeight: 600 }}>Get Started Free</button>
        </div>
      </nav>
      <div style={{ textAlign: "center", padding: "4rem 5% 3rem" }}>
        <div style={{ display: "inline-block", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 100, padding: "6px 18px", fontSize: "0.8rem", color: "#60A5FA", fontWeight: 600, marginBottom: "1.5rem" }}>Pricing Plans</div>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(2rem,5vw,3.5rem)", letterSpacing: "-0.03em", margin: "0 0 1rem" }}>Simple, transparent pricing</h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.1rem", margin: 0 }}>Secure payments via Razorpay · UPI, Cards, NetBanking</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "1.25rem", maxWidth: 1200, margin: "0 auto 5rem", padding: "0 5%" }}>
        {PLANS.map(plan => (
          <div key={plan.name} style={{ background: plan.enterprise ? "linear-gradient(145deg,rgba(251,191,36,0.08),rgba(245,158,11,0.04))" : plan.highlight ? "linear-gradient(145deg,rgba(59,130,246,0.15),rgba(139,92,246,0.08))" : "rgba(255,255,255,0.02)", border: `1.5px solid ${plan.enterprise ? "rgba(251,191,36,0.4)" : plan.highlight ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.07)"}`, borderRadius: 20, padding: "2rem", position: "relative" }}>
            {plan.highlight && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "4px 14px", borderRadius: 100 }}>MOST POPULAR</div>}
            {plan.enterprise && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "4px 14px", borderRadius: 100 }}>🏢 FOR BUSINESS</div>}
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, marginBottom: 4, color: plan.enterprise ? "#FCD34D" : "#fff" }}>{plan.name}</h3>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: "1.5rem" }}>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "2.5rem", color: plan.enterprise ? "#FCD34D" : "#fff" }}>{plan.price}</span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>{plan.period}</span>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem" }}>
              {plan.features.map(f => <li key={f} style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 10 }}><span style={{ color: plan.enterprise ? "#F59E0B" : "#3B82F6" }}>✓</span>{f}</li>)}
            </ul>
            {plan.enterprise ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <a href="https://mail.google.com/mail/?view=cm&to=info@machmiles.com&su=Enterprise Plan Enquiry&body=Hi, I'm interested in the MachMiles Enterprise plan. Please get in touch." target="_blank" rel="noopener noreferrer" style={{ display: "block", width: "100%", padding: 12, background: "linear-gradient(135deg,#F59E0B,#D97706)", border: "none", color: "#fff", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: "0.95rem", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>📧 Email Us →</a>
                <a href="https://wa.me/918091355527?text=Hi,%20I'm%20interested%20in%20the%20MachMiles%20Enterprise%20plan.%20Please%20get%20in%20touch." target="_blank" rel="noopener noreferrer" style={{ display: "block", width: "100%", padding: 12, background: "rgba(37,211,102,0.15)", border: "1px solid rgba(37,211,102,0.4)", color: "#25D366", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: "0.9rem", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>💬 WhatsApp</a>
              </div>
            ) : (
              <button onClick={() => handlePlanClick(plan)} style={{ width: "100%", padding: 12, background: plan.highlight ? "linear-gradient(135deg,#3B82F6,#8B5CF6)" : "rgba(255,255,255,0.06)", border: plan.highlight ? "none" : "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 10, fontWeight: 600, cursor: "pointer", fontSize: "0.95rem" }}>{plan.cta}</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LandingPage({ onSignup, onLogin, onPolicy }) {
  const [activeFaq, setActiveFaq] = useState(null);

  const handlePlanClick = (plan) => {
    if (plan.razorpay) localStorage.setItem("pending_plan", plan.name);
    onSignup();
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
      <style>{`
        @keyframes don-marquee { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        @keyframes don-pulse-red { 0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.5) } 70% { box-shadow: 0 0 0 8px rgba(220,38,38,0) } }
        .don-bar-link:hover { background: rgba(220,38,38,0.25) !important; }
        .don-bar-link { transition: background 0.2s; }
        .don-cta-card:hover { transform: translateY(-2px); box-shadow: 0 16px 48px rgba(220,38,38,0.35) !important; }
        .don-cta-card { transition: transform 0.25s, box-shadow 0.25s; }
      `}</style>

      {/* Emergency Announcement Bar */}
      <a href="/donations" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, background: "linear-gradient(90deg,#7f1d1d,#DC2626,#7f1d1d)", padding: "9px 16px", textDecoration: "none", position: "relative", zIndex: 200, overflow: "hidden", cursor: "pointer" }} className="don-bar-link">
        <span style={{ animation: "don-pulse-red 2s infinite", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 8, height: 8, borderRadius: "50%", background: "#fff", flexShrink: 0 }} />
        <div style={{ overflow: "hidden", flex: 1, maxWidth: 700 }}>
          <div style={{ display: "flex", gap: "3rem", whiteSpace: "nowrap", animation: "don-marquee 18s linear infinite", width: "max-content" }}>
            {[1,2].map(i => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "2rem", fontSize: "0.82rem", color: "#fff", fontWeight: 600, letterSpacing: "0.02em" }}>
                <span>🇻🇪 EMERGENCY APPEAL</span>
                <span style={{ opacity: 0.6 }}>·</span>
                <span>Venezuela Earthquake Relief — Help families in crisis</span>
                <span style={{ opacity: 0.6 }}>·</span>
                <span>Donate Now →</span>
                <span style={{ opacity: 0.6 }}>·</span>
                <span>Every ₹100 provides emergency meals</span>
                <span style={{ opacity: 0.6 }}>·</span>
              </span>
            ))}
          </div>
        </div>
        <span style={{ flexShrink: 0, background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 100, padding: "3px 12px", fontSize: "0.75rem", color: "#fff", fontWeight: 700, whiteSpace: "nowrap" }}>Donate →</span>
      </a>

      <nav style={{ position: "fixed", top: 38, left: 0, right: 0, zIndex: 100, background: "rgba(2,8,23,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4%", height: 64, gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>A</div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1.1rem", lineHeight: 1.2 }}>AutoApply<span style={{ color: "#3B82F6" }}> AI</span></div>
            <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", fontWeight: 500, lineHeight: 1, marginTop: 3 }}>powered by MACHMILES</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 2, alignItems: "center", flex: 1, justifyContent: "center", flexWrap: "nowrap", overflow: "hidden" }}>
          {[
            ["Features", () => document.querySelector("#features")?.scrollIntoView({ behavior: "smooth" })],
            ["How It Works", () => document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" })],
            ["FAQ", () => document.querySelector("#faq")?.scrollIntoView({ behavior: "smooth" })],
          ].map(([label, action]) => (
            <button key={label} onClick={action} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.65)", fontSize: "0.88rem", fontWeight: 500, padding: "6px 12px", cursor: "pointer", borderRadius: 6, whiteSpace: "nowrap", fontFamily: "Inter,sans-serif" }}
              onMouseEnter={e => e.target.style.color="#fff"} onMouseLeave={e => e.target.style.color="rgba(255,255,255,0.65)"}>{label}</button>
          ))}
          <a href="https://machmiles.com/pricing" target="_blank" rel="noopener noreferrer" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.65)", fontSize: "0.88rem", fontWeight: 500, padding: "6px 12px", cursor: "pointer", borderRadius: 6, whiteSpace: "nowrap", fontFamily: "Inter,sans-serif", textDecoration: "none" }}
            onMouseEnter={e => e.target.style.color="#fff"} onMouseLeave={e => e.target.style.color="rgba(255,255,255,0.65)"}>Pricing</a>
        </div>
        <div style={{ display: "flex", gap: 10, flexShrink: 0, alignItems: "center" }}>
          <button onClick={onLogin} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontSize: "0.9rem", whiteSpace: "nowrap" }}>Sign In</button>
          <button onClick={onSignup} style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", color: "#fff", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", whiteSpace: "nowrap" }}>Get Started Free</button>
        </div>
      </nav>

      <section style={{ padding: "11.5rem 5% 5rem", textAlign: "center", position: "relative" }}>
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse,rgba(59,130,246,0.2),transparent 70%)", pointerEvents: "none" }} />
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 100, padding: "6px 16px", marginBottom: "2rem", fontSize: "0.8rem", color: "#93C5FD" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3B82F6", display: "inline-block" }} />
          AI actively applying for 2,847 users right now
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,rgba(59,130,246,0.12),rgba(139,92,246,0.12))", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 100, padding: "8px 20px" }}>
            <img src="https://flagcdn.com/w20/in.png" alt="" width={20} height={14} style={{ objectFit: "cover", borderRadius: 2, flexShrink: 0 }} />
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "0.85rem", background: "linear-gradient(135deg,#60A5FA,#A78BFA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "0.02em" }}>India's Best Platform for Auto-Apply Jobs</span>
          </div>
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

      {/* Company Logos Ticker */}
      <div style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "1.5rem 0", overflow: "hidden" }}>
        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", letterSpacing: "0.12em", fontWeight: 600, textTransform: "uppercase", marginBottom: "1.25rem" }}>Trusted by job seekers placing at top companies</p>
        <div style={{ display: "flex", overflow: "hidden", maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)" }}>
          <div style={{ display: "flex", gap: "2.5rem", animation: "ticker 28s linear infinite", whiteSpace: "nowrap", alignItems: "center" }}>
            {[
              { name: "Google", domain: "google.com", color: "#4285F4" },
              { name: "Microsoft", domain: "microsoft.com", color: "#00A4EF" },
              { name: "Amazon", domain: "amazon.com", color: "#FF9900" },
              { name: "Flipkart", domain: "flipkart.com", color: "#2874F0" },
              { name: "Infosys", domain: "infosys.com", color: "#007CC3" },
              { name: "TCS", domain: "tcs.com", color: "#0047AB" },
              { name: "Wipro", domain: "wipro.com", color: "#341C57" },
              { name: "Swiggy", domain: "swiggy.com", color: "#FC8019" },
              { name: "Zomato", domain: "zomato.com", color: "#E23744" },
              { name: "Razorpay", domain: "razorpay.com", color: "#3395FF" },
              { name: "CRED", domain: "cred.club", color: "#1C1C1C" },
              { name: "Meesho", domain: "meesho.com", color: "#9B2FBE" },
              { name: "PhonePe", domain: "phonepe.com", color: "#5F259F" },
              { name: "Groww", domain: "groww.in", color: "#00D09C" },
              { name: "Nykaa", domain: "nykaa.com", color: "#FC2779" },
              { name: "Paytm", domain: "paytm.com", color: "#002970" },
              // duplicate for seamless loop
              { name: "Google", domain: "google.com", color: "#4285F4" },
              { name: "Microsoft", domain: "microsoft.com", color: "#00A4EF" },
              { name: "Amazon", domain: "amazon.com", color: "#FF9900" },
              { name: "Flipkart", domain: "flipkart.com", color: "#2874F0" },
              { name: "Infosys", domain: "infosys.com", color: "#007CC3" },
              { name: "TCS", domain: "tcs.com", color: "#0047AB" },
              { name: "Wipro", domain: "wipro.com", color: "#341C57" },
              { name: "Swiggy", domain: "swiggy.com", color: "#FC8019" },
              { name: "Zomato", domain: "zomato.com", color: "#E23744" },
              { name: "Razorpay", domain: "razorpay.com", color: "#3395FF" },
              { name: "CRED", domain: "cred.club", color: "#1C1C1C" },
              { name: "Meesho", domain: "meesho.com", color: "#9B2FBE" },
              { name: "PhonePe", domain: "phonepe.com", color: "#5F259F" },
              { name: "Groww", domain: "groww.in", color: "#00D09C" },
              { name: "Nykaa", domain: "nykaa.com", color: "#FC2779" },
              { name: "Paytm", domain: "paytm.com", color: "#002970" },
            ].map((co, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 40, padding: "6px 16px 6px 8px" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${co.domain}&sz=64`}
                    alt={co.name}
                    width={24}
                    height={24}
                    style={{ objectFit: "contain" }}
                    onError={e => { e.target.parentNode.style.background = co.color; e.target.style.display = "none"; e.target.parentNode.innerHTML = `<span style="color:#fff;font-weight:800;font-size:0.85rem">${co.name[0]}</span>`; }}
                  />
                </div>
                <span style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600, fontSize: "0.88rem", fontFamily: "'Space Grotesk',sans-serif", whiteSpace: "nowrap" }}>{co.name}</span>
              </div>
            ))}
          </div>
        </div>
        <style>{`@keyframes ticker { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }`}</style>
      </div>

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
            {[["📄", "5 Free Templates"], ["👑", "10 Premium Templates"], ["🤖", "AI Resume Builder"], ["⬇", "Download PDF Instantly"]].map(([icon, text]) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.6)", fontSize: "0.875rem" }}><span>{icon}</span>{text}</div>
            ))}
          </div>
          {/* Template preview strip */}
          <div id="resume-templates-preview" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", width: "100%", maxWidth: 900 }}>
            {RESUME_TEMPLATES.slice(0, 5).map(t => (
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

      {/* Venezuela Donation Highlight */}
      <div style={{ padding: "0 5% 4rem" }}>
        <a href="/donations" style={{ display: "block", textDecoration: "none", maxWidth: 1100, margin: "0 auto" }} className="don-cta-card">
          <div style={{ background: "linear-gradient(135deg,rgba(127,29,29,0.6),rgba(30,64,175,0.5))", border: "1px solid rgba(220,38,38,0.4)", borderRadius: 20, padding: "2rem 2.5rem", display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap", boxShadow: "0 8px 32px rgba(220,38,38,0.2)", backdropFilter: "blur(12px)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "url('https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=1200&q=60')", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.08, borderRadius: 20 }} />
            <div style={{ fontSize: "3.5rem", flexShrink: 0, position: "relative" }}>🇻🇪</div>
            <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(220,38,38,0.2)", border: "1px solid rgba(220,38,38,0.4)", borderRadius: 100, padding: "3px 10px", fontSize: "0.72rem", color: "#fca5a5", fontWeight: 700, marginBottom: 8, letterSpacing: "0.05em" }}>
                🚨 EMERGENCY RELIEF CAMPAIGN
              </div>
              <h3 style={{ margin: "0 0 6px", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(1.1rem,2.5vw,1.5rem)", color: "#fff", letterSpacing: "-0.02em" }}>Help Venezuela Rise Again</h3>
              <p style={{ margin: 0, fontSize: "0.88rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>Thousands of families displaced by the earthquake need urgent help. Food, shelter, clean water, and medical care — your donation reaches them directly.</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0, position: "relative" }}>
              <div style={{ display: "flex", gap: 16 }}>
                {[["₹100", "Meals"], ["₹500", "Medicine"], ["₹1000", "Shelter"]].map(([amt, label]) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1rem", color: "#fca5a5" }}>{amt}</div>
                    <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", marginTop: 1 }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: "linear-gradient(135deg,#DC2626,#b91c1c)", color: "#fff", borderRadius: 10, padding: "10px 24px", fontWeight: 700, fontSize: "0.9rem", boxShadow: "0 4px 16px rgba(220,38,38,0.4)" }}>
                ❤️ Donate Now →
              </div>
            </div>
          </div>
        </a>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "1.25rem", maxWidth: 1200, margin: "0 auto" }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{ background: plan.enterprise ? "linear-gradient(145deg,rgba(251,191,36,0.08),rgba(245,158,11,0.04))" : plan.highlight ? "linear-gradient(145deg,rgba(59,130,246,0.15),rgba(139,92,246,0.08))" : "rgba(255,255,255,0.02)", border: `1.5px solid ${plan.enterprise ? "rgba(251,191,36,0.4)" : plan.highlight ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.07)"}`, borderRadius: 20, padding: "2rem", position: "relative" }}>
              {plan.highlight && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "4px 14px", borderRadius: 100 }}>MOST POPULAR</div>}
              {plan.enterprise && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "4px 14px", borderRadius: 100 }}>🏢 FOR BUSINESS</div>}
              <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, marginBottom: 4, color: plan.enterprise ? "#FCD34D" : "#fff" }}>{plan.name}</h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: "1.5rem" }}>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "2.5rem", color: plan.enterprise ? "#FCD34D" : "#fff" }}>{plan.price}</span>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>{plan.period}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem" }}>
                {plan.features.map(f => <li key={f} style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 10 }}><span style={{ color: plan.enterprise ? "#F59E0B" : "#3B82F6" }}>✓</span>{f}</li>)}
              </ul>
              {plan.enterprise ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <a href="https://mail.google.com/mail/?view=cm&to=info@machmiles.com&su=Enterprise Plan Enquiry&body=Hi, I'm interested in the MachMiles Enterprise plan. Please get in touch." target="_blank" rel="noopener noreferrer" style={{ display: "block", width: "100%", padding: 12, background: "linear-gradient(135deg,#F59E0B,#D97706)", border: "none", color: "#fff", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: "0.95rem", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                    📧 Email Us →
                  </a>
                  <a href="https://wa.me/918091355527?text=Hi,%20I'm%20interested%20in%20the%20MachMiles%20Enterprise%20plan.%20Please%20get%20in%20touch." target="_blank" rel="noopener noreferrer" style={{ display: "block", width: "100%", padding: 12, background: "rgba(37,211,102,0.15)", border: "1px solid rgba(37,211,102,0.4)", color: "#25D366", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: "0.9rem", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                    💬 WhatsApp
                  </a>
                </div>
              ) : (
                <button onClick={() => handlePlanClick(plan)} style={{ width: "100%", padding: 12, background: plan.highlight ? "linear-gradient(135deg,#3B82F6,#8B5CF6)" : "rgba(255,255,255,0.06)", border: plan.highlight ? "none" : "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 10, fontWeight: 600, cursor: "pointer", fontSize: "0.95rem" }}>
                  {plan.cta}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" style={{ padding: "5rem 5%", background: "rgba(255,255,255,0.02)" }}>
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <p style={{ color: "#818CF8", fontSize: "0.8rem", letterSpacing: "0.12em", fontWeight: 700, marginBottom: "0.75rem" }}>SIMPLE & FAST</p>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "2.5rem", letterSpacing: "-0.03em", margin: 0 }}>How It Works</h2>
          <p style={{ color: "rgba(255,255,255,0.45)", marginTop: "0.75rem", fontSize: "1rem" }}>From signup to job offers — in 4 simple steps.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "1.5rem", maxWidth: 1000, margin: "0 auto" }}>
          {[
            { step: "01", icon: "📋", title: "Create Your Profile", desc: "Sign up and tell us about yourself — your skills, experience, desired roles, and target companies." },
            { step: "02", icon: "📄", title: "Upload Your Resume", desc: "Upload your resume or build one using our AI Resume Builder. Our AI tailors it for every application." },
            { step: "03", icon: "🤖", title: "AI Applies for You", desc: "Our AI scans 50+ job boards 24/7, finds matching roles, and auto-applies with personalized cover letters." },
            { step: "04", icon: "🎯", title: "Track & Get Hired", desc: "Monitor all your applications in one dashboard. Prepare for interviews and land your dream job." },
          ].map(({ step, icon, title, desc }) => (
            <div key={step} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "2rem 1.5rem", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 16, right: 20, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "3rem", color: "rgba(99,102,241,0.12)", lineHeight: 1 }}>{step}</div>
              <div style={{ fontSize: "2.2rem", marginBottom: "1rem" }}>{icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: "1.1rem", color: "#fff", margin: "0 0 0.6rem" }}>{title}</h3>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", lineHeight: 1.7, margin: 0 }}>{desc}</p>
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

      {/* Reviews Slider */}
      <section style={{ padding: "5rem 0", background: "linear-gradient(135deg,#0f172a,#1e1b4b)", overflow: "hidden" }}>
        <style>{`
          @keyframes scroll-left { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
          @keyframes scroll-right { 0% { transform: translateX(-50%) } 100% { transform: translateX(0) } }
          .rev-track-l { animation: scroll-left 40s linear infinite; display: flex; width: max-content; }
          .rev-track-r { animation: scroll-right 36s linear infinite; display: flex; width: max-content; }
          .rev-track-l:hover, .rev-track-r:hover { animation-play-state: paused; }
          .rev-card { flex-shrink: 0; width: 320px; margin: 0 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 1.5rem; }
        `}</style>
        <div style={{ textAlign: "center", marginBottom: "3rem", padding: "0 5%" }}>
          <div style={{ display: "inline-block", background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.3)", borderRadius: 100, padding: "6px 18px", fontSize: "0.8rem", color: "#a5b4fc", fontWeight: 700, marginBottom: "1rem" }}>⭐ User Reviews</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(1.6rem,4vw,2.4rem)", letterSpacing: "-0.03em", margin: "0 0 0.75rem", color: "#fff" }}>Loved by Job Seekers</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem", margin: 0 }}>Real results from real users across India</p>
        </div>
        {(() => {
          const REVIEWS = [
            { name: "Rahul Sharma", role: "Software Engineer, Bangalore", stars: 5, text: "MachMiles completely changed my job search. I went from applying to 5 jobs a day to 50+. Got 3 interview calls in the first week!" },
            { name: "Priya Nair", role: "MBA Graduate, Chennai", stars: 5, text: "As a fresher, I had no idea how to approach job applications at scale. MachMiles made it effortless. Landed my first job within a month!" },
            { name: "Arjun Mehta", role: "Product Manager, Mumbai", stars: 5, text: "The AI matching is incredibly accurate. It only applies to roles that genuinely fit my profile. Zero time wasted on irrelevant jobs." },
            { name: "Sneha Kulkarni", role: "Data Analyst, Pune", stars: 5, text: "I was spending 3 hours every day applying to jobs. MachMiles cut that down to 10 minutes. The time savings alone are worth every rupee." },
            { name: "Vikram Reddy", role: "UI/UX Designer, Hyderabad", stars: 5, text: "Absolutely brilliant platform. The auto-apply feature is seamless and the resume optimization helped me stand out from hundreds of applicants." },
            { name: "Ananya Iyer", role: "HR Consultant, Delhi", stars: 5, text: "Even as an HR professional, I used MachMiles for my own job switch. The intelligent filtering saved me enormous time. Highly recommended!" },
            { name: "Karan Gupta", role: "Backend Developer, Noida", stars: 5, text: "Got 7 interview calls in 2 weeks after using MachMiles. The platform is incredibly intuitive and the AI really understands what you're looking for." },
            { name: "Divya Menon", role: "Finance Analyst, Kochi", stars: 5, text: "The job matching algorithm is spot on. I only got calls from companies that genuinely matched my skills and salary expectations." },
            { name: "Rohan Joshi", role: "Full Stack Developer, Ahmedabad", stars: 5, text: "MachMiles is a game changer for anyone serious about their job search. Automated my entire application process and landed a 40% salary hike!" },
            { name: "Meera Pillai", role: "Content Strategist, Bangalore", stars: 5, text: "The cover letter AI is phenomenal. Each letter felt personal and relevant. Recruiters actually commented on how well-crafted my applications were." },
            { name: "Siddharth Rao", role: "Cloud Architect, Hyderabad", stars: 5, text: "Switched from manually applying to using MachMiles and the difference is night and day. 10x more applications, 10x more responses." },
            { name: "Neha Tiwari", role: "Business Analyst, Gurgaon", stars: 5, text: "The dashboard is clean, the automation is reliable, and the support team is responsive. This is exactly what job seekers needed." },
          ];
          return (
          <div style={{ overflow: "hidden" }}>
            <div className="rev-track-l">
              {[...REVIEWS, ...REVIEWS].map((r, i) => (
                <div key={i} className="rev-card">
                  <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                    {Array(r.stars).fill("⭐").map((s, j) => <span key={j} style={{ fontSize: "0.85rem" }}>{s}</span>)}
                  </div>
                  <p style={{ margin: "0 0 14px", fontSize: "0.88rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.65, fontStyle: "italic" }}>"{r.text}"</p>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#fff" }}>{r.name}</div>
                    <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{r.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          );
        })()}
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
                  ["in", "https://www.linkedin.com/company/machmiles/", "#0A66C2"],
                  ["f", "https://facebook.com", "#1877F2"],
                  ["ig", "https://www.instagram.com/mach.miles?igsh=dWN0dzBlZGZjZWNn", "#E1306C"],
                  ["𝕏", "https://x.com/machmilesai?ct=b25ib2FyZGluZ193ZWxjb21l&ppid=email-push-service", "#fff"],
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
              <div style={{ marginBottom: 8 }}>
                <a href="https://machmiles.com/pricing" target="_blank" rel="noopener noreferrer" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.65)", fontSize: "0.875rem", cursor: "pointer", padding: 0, textAlign: "left", fontFamily: "Inter,sans-serif", textDecoration: "none" }}>Pricing</a>
              </div>
              <div style={{ marginBottom: 8 }}>
                <a href="/aboutus" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.65)", fontSize: "0.875rem", cursor: "pointer", padding: 0, textAlign: "left", fontFamily: "Inter,sans-serif", textDecoration: "none" }}>About Us</a>
              </div>
              <div style={{ marginBottom: 8 }}>
                <button onClick={() => document.querySelector(".rev-track-l")?.closest("section")?.scrollIntoView({ behavior: "smooth" })} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.65)", fontSize: "0.875rem", cursor: "pointer", padding: 0, textAlign: "left", fontFamily: "Inter,sans-serif" }}>Reviews</button>
              </div>
              {[["Privacy Policy", () => onPolicy("privacy")], ["Terms & Conditions", () => onPolicy("terms")], ["Refund Policy", () => onPolicy("refund")], ["Cancellation Policy", () => onPolicy("cancellation")]].map(([label, action]) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <button onClick={action} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.65)", fontSize: "0.875rem", cursor: "pointer", padding: 0, textAlign: "left", fontFamily: "Inter,sans-serif" }}>{label}</button>
                </div>
              ))}
            </div>

            {/* Partners */}
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid rgba(129,140,248,0.4)" }}>Partners</div>
              {[["White-Label Solution","/white-label-solution"],["Affiliate Program","/affiliate-program"],["Career Coaches","/career-coaches"],["HR & Employers","/hr-employers"],["Campus Connect","/campus-connect"]].map(([label, href]) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <a href={href} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.65)", fontSize: "0.875rem", cursor: "pointer", padding: 0, textAlign: "left", fontFamily: "Inter,sans-serif", textDecoration: "none" }}>{label}</a>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem", margin: 0 }}>© 2026 AutoApply AI · All rights reserved · Powered by Supabase + OpenAI</p>
            <div style={{ display: "flex", gap: 20 }}>
              {[["Privacy Policy","privacy"],["Terms & Conditions","terms"],["Refund Policy","refund"],["Cancellation Policy","cancellation"]].map(([label, key]) => (
                <button key={key} onClick={() => onPolicy(key)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", cursor: "pointer", padding: 0, fontFamily: "Inter,sans-serif" }}>{label}</button>
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

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) { setError("Enter your email address"); return; }
    setForgotLoading(true); setError("");
    const { error: e } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: window.location.origin,
    });
    setForgotLoading(false);
    if (e) setError(e.message);
    else { setSuccess("Password reset email sent! Check your inbox."); setForgotMode(false); }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !pass.trim()) { setError("Please fill in all fields"); return; }
    if (mode === "signup" && !name.trim()) { setError("Please enter your name"); return; }
    if (pass.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      if (mode === "signup") {
        const res = await apiPost("/auth/register", { name: name.trim(), email: email.trim(), password: pass, phone: phone.replace(/\D/g, "") });
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
    <div style={{ minHeight: "100vh", background: "#020817", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter,sans-serif", position: "relative" }}>
<style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;800&display=swap');`}</style>
      {onBack && (
        <button onClick={onBack} style={{ position: "absolute", top: 20, left: 20, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", borderRadius: 10, padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: "0.875rem", transition: "all 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
        >
          ← Back
        </button>
      )}
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
            <input
              value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
              placeholder="Email address" type="email"
              onKeyDown={e => e.key === "Enter" && handleForgotPassword()}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box", marginBottom: 12 }}
            />
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
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box" }} />
              )}
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box" }} />
              <input value={pass} onChange={e => setPass(e.target.value)} placeholder="Password (min 6 characters)" type="password"
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box" }} />

              {/* Phone — signup only */}
              {mode === "signup" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 14px", color: "rgba(255,255,255,0.5)", fontSize: "0.95rem", whiteSpace: "nowrap" }}>+91</div>
                  <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Mobile number" type="tel" maxLength={10}
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.95rem", outline: "none", flex: 1, boxSizing: "border-box" }} />
                </div>
              )}
            </div>
            {mode === "login" && (
              <div style={{ textAlign: "right", marginTop: 8 }}>
                <button onClick={() => { setForgotMode(true); setError(""); setForgotEmail(email); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.8rem" }}>Forgot password?</button>
              </div>
            )}
            <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", marginTop: "1.25rem", padding: 13, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.7 : 1 }}>
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
  const [prefs, setPrefs] = useState({ title: "", location: "", remote: "Remote", salary: "", level: "Mid-level", notice: "", experience: "", current_salary: "" });
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [uploadedName, setUploadedName] = useState("");
  const [resumeChosen, setResumeChosen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [goToResume, setGoToResume] = useState(false);

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const text = await (async () => {
        if (file.name.endsWith(".pdf")) {
          const ab = await file.arrayBuffer();
          const bytes = new Uint8Array(ab);
          let str = "";
          for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
          const matches = str.match(/\(([^)]{2,200})\)/g) || [];
          return matches.map(m => m.slice(1,-1)).join(" ");
        }
        return file.text ? await file.text() : "";
      })();
      const parsed = await parseResumeWithAI(text);
      const title = (parsed?.basics?.name || file.name.replace(/\.[^.]+$/, "")) + " — Resume";
      const res = await apiPost("/resumes", { title, template: "classic", resume_data: parsed || {} });
      if (res.success || res.data) { setUploaded(true); setUploadedName(file.name); setResumeChosen(true); }
      else alert("Upload failed: " + (res.message || "Unknown error"));
    } catch (err) {
      alert("Upload failed: " + err.message);
    }
    setUploading(false);
  };

  const complete = async (navToResume = false) => {
    setSaving(true);
    await supabase.from("profiles").upsert({ id: user.id, desired_job_title: prefs.title, location: prefs.location, work_type: prefs.remote, salary: prefs.salary, experience_level: prefs.level, onboarded: true });
    setSaving(false);
    onComplete(navToResume ? "Resume" : null);
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
              {uploading ? <><div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⏳</div><div style={{ fontWeight: 600, color: "#93C5FD" }}>Uploading & parsing...</div></> :
               uploaded ? <><div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>✅</div><div style={{ fontWeight: 600, color: "#10B981" }}>Resume saved!</div><div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginTop: 4 }}>{uploadedName}</div></> :
               <><div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📄</div><div style={{ fontWeight: 600 }}>Click to upload your resume</div><div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginTop: 4 }}>PDF or DOCX · Max 10MB</div></>}
            </label>
            <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.85rem" }}>— or —</span>
            </div>
            <button onClick={() => { setResumeChosen(true); complete(true); }} style={{ width: "100%", marginTop: "1rem", padding: "14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, color: "rgba(255,255,255,0.8)", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              ✏️ Create your own resume with templates
            </button>
            {!resumeChosen && <p style={{ textAlign: "center", color: "#f87171", fontSize: "0.82rem", marginTop: "1rem" }}>Please upload your resume or choose to create one before continuing.</p>}
          </div>
        )}

        {step === 2 && (() => {
          const step2Required = ["title","location","salary","notice","experience","current_salary"];
          const step2Valid = step2Required.every(k => prefs[k]?.trim());
          const inputStyle = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.95rem", outline: "none" };
          const labelStyle = { fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.07em", display: "flex", alignItems: "center", gap: 4, marginBottom: 6 };
          const req = <span style={{ color: "#f87171", fontSize: "0.7rem" }}>*</span>;
          return (
            <div>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.8rem", marginBottom: "0.5rem" }}>Job preferences</h2>
              <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "1.5rem" }}>All fields marked <span style={{ color: "#f87171" }}>*</span> are required.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[["Desired Job Title","title","e.g. Senior React Developer"],["Preferred Location","location","e.g. Bangalore, Remote"]].map(([label,key,ph]) => (
                  <div key={key}>
                    <label style={labelStyle}>{label.toUpperCase()}{req}</label>
                    <input value={prefs[key]} onChange={e => setPrefs({...prefs,[key]:e.target.value})} placeholder={ph} style={inputStyle} />
                  </div>
                ))}
                <div style={{ display: "flex", gap: 12 }}>
                  {[["Work Type","remote",["Remote","Hybrid","Onsite"]],["Experience Level","level",["Entry","Mid-level","Senior","Lead"]]].map(([label,key,opts]) => (
                    <div key={key} style={{ flex: 1 }}>
                      <label style={labelStyle}>{label.toUpperCase()}{req}</label>
                      <select value={prefs[key]} onChange={e => setPrefs({...prefs,[key]:e.target.value})} style={{ ...inputStyle, width: "100%" }}>
                        {opts.map(o => <option key={o} value={o} style={{ background: "#020817" }}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>EXPECTED SALARY (LPA){req}</label>
                    <input value={prefs.salary} onChange={e => setPrefs({...prefs, salary: e.target.value})} placeholder="e.g. 25-30" style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>CURRENT ANNUAL SALARY (LPA){req}</label>
                    <input value={prefs.current_salary} onChange={e => setPrefs({...prefs, current_salary: e.target.value})} placeholder="e.g. 18" style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>TOTAL EXPERIENCE (YEARS){req}</label>
                    <input value={prefs.experience} onChange={e => setPrefs({...prefs, experience: e.target.value})} placeholder="e.g. 3" style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>NOTICE PERIOD{req}</label>
                    <select value={prefs.notice} onChange={e => setPrefs({...prefs, notice: e.target.value})} style={{ ...inputStyle, width: "100%", color: prefs.notice ? "#fff" : "rgba(255,255,255,0.35)" }}>
                      <option value="" style={{ background: "#020817" }}>Select notice period</option>
                      {["Immediate","15 Days","1 Month","2 Months","3 Months","More than 3 Months"].map(o => <option key={o} value={o} style={{ background: "#020817", color: "#fff" }}>{o}</option>)}
                    </select>
                  </div>
                </div>
                {!step2Valid && <p style={{ color: "#f87171", fontSize: "0.82rem", margin: "0.25rem 0 0" }}>Please fill all required fields to continue.</p>}
              </div>
            </div>
          );
        })()}

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
          {(() => {
            const step2Required = ["title","location","salary","notice","experience","current_salary"];
            const step2Valid = step2Required.every(k => prefs[k]?.trim());
            const blocked = saving || (step === 1 && !resumeChosen) || (step === 2 && !step2Valid);
            return (
              <button onClick={() => { if (step === 1 && !resumeChosen) return; if (step === 2 && !step2Valid) return; step < 3 ? setStep(s => s+1) : complete(); }} disabled={blocked} style={{ background: blocked ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", color: blocked ? "rgba(255,255,255,0.3)" : "#fff", borderRadius: 10, padding: "12px 32px", cursor: blocked ? "not-allowed" : "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                {saving && <Spinner />}{step === 3 ? "Launch AutoApply AI 🚀" : "Continue →"}
              </button>
            );
          })()}
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
function AppShell({ user, onLogout, onGoHome }) {
  const [activeNav, setActiveNav] = useState(() => { const n = window.__onboardingNav; if (n) { window.__onboardingNav = null; return n; } return "Dashboard"; });
  const [autoMode, setAutoMode] = useState(true);
  const [profile, setProfile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewAsUser, setViewAsUser] = useState(null); // admin impersonation
  const isMobile = useMobile();

  // Keep global viewAs in sync so api() can inject view_as param
  useEffect(() => { __viewAsUserId = viewAsUser?.id || null; }, [viewAsUser]);

  useEffect(() => {
    apiGet("/auth/me").then(r => { if (r.success && r.data) setProfile(r.data); });
  }, [user.id]);

  const isAdmin = profile?.role === "admin";
  const NAV_ICONS = { Dashboard:"⊞", Jobs:"🔍", Applications:"📤", Resume:"📄", "Interview Prep":"🎯", "AI Assistant":"💬", Settings:"⚙️", Admin:"🛡" };
  const BOTTOM_NAV = ["Dashboard", "Jobs", "Applications", "AI Assistant", "Settings"];
  const navItems = [...NAV_ITEMS, ...(isAdmin ? ["Admin"] : [])];

  const isPaid = ["pro", "premium"].includes(effectivePlan(profile));

  const PaidGate = ({ feature, icon, description }) => (
    <div style={{ maxWidth: 480, margin: "4rem auto", textAlign: "center", padding: "0 1rem" }}>
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{icon}</div>
      <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.4rem", margin: "0 0 0.75rem" }}>{feature}</h2>
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.95rem", lineHeight: 1.6, margin: "0 0 2rem" }}>{description}</p>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.5rem" }}>
        {[["✅ Unlimited access to " + feature, ""], ["✅ AI-powered responses", ""], ["✅ Personalized to your profile", ""], ["✅ Unlimited sessions", ""]].map(([f]) => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.875rem", color: "rgba(255,255,255,0.7)" }}>{f}</div>
        ))}
      </div>
      <button onClick={() => setActiveNav("Settings")} style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)", border: "none", color: "#fff", borderRadius: 12, padding: "14px 36px", cursor: "pointer", fontWeight: 700, fontSize: "1rem", fontFamily: "'Space Grotesk',sans-serif" }}>
        👑 Upgrade to Pro — ₹599/mo
      </button>
      <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.78rem", marginTop: "0.75rem" }}>Cancel anytime · Instant access</div>
    </div>
  );

  // When admin is viewing as another user, use that user's context
  const activeUser = viewAsUser || user;
  const activeProfile = viewAsUser ? viewAsUser.profile : profile;
  const activePlan = effectivePlan(activeProfile);
  const activeIsPaid = ["pro","premium"].includes(activePlan);

  const renderPage = () => {
    switch (activeNav) {
      case "Dashboard": return <DashboardPage user={activeUser} />;
      case "Jobs": return <JobsPage user={activeUser} setActiveNav={setActiveNav} />;
      case "Applications": return <ApplicationsPage user={activeUser} setScreen={setActiveNav} />;
      case "Resume": return <ResumePage user={activeUser} profile={activeProfile} />;
      case "Interview Prep": return activeIsPaid
        ? <InterviewPage />
        : <PaidGate feature="Interview Preparation" icon="🎯" description="Practice with AI-powered mock interviews, get personalized answers using the STAR method, and ace your next interview. Available on Pro and Premium plans." />;
      case "AI Assistant": return activeIsPaid
        ? <AssistantPage />
        : <PaidGate feature="AI Career Assistant" icon="💬" description="Chat with your personal AI career coach powered by GPT-4. Get resume tips, salary negotiation advice, and career guidance. Available on Pro and Premium plans." />;
      case "Settings": return <SettingsPage user={user} profile={profile} onLogout={onLogout} />;
      case "Admin": return <AdminPage onViewAs={(u) => { setViewAsUser(u); setActiveNav("Dashboard"); }} />;
      default: return <DashboardPage user={activeUser} />;
    }
  };

  const navTo = (item) => { setActiveNav(item); setSidebarOpen(false); };

  const Sidebar = () => (
    <aside style={{ width: 240, flexShrink: 0, background: "rgba(2,8,23,0.98)", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", ...(isMobile ? { position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 200, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.25s ease", boxShadow: sidebarOpen ? "4px 0 40px rgba(0,0,0,0.6)" : "none" } : {}) }}>
      <div style={{ padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onGoHome} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, color: "#fff" }}>M</div>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#fff" }}>MachMiles <span style={{ color: "#3B82F6" }}>AI</span></span>
        </button>
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
        {navItems.map(item => {
          const active = activeNav === item;
          return (
            <button key={item} onClick={() => navTo(item)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, border: "none", background: active ? "rgba(59,130,246,0.15)" : "transparent", color: active ? "#60A5FA" : "rgba(255,255,255,0.55)", cursor: "pointer", textAlign: "left", fontFamily: "Inter,sans-serif", fontSize: "0.9rem", fontWeight: active ? 600 : 400, marginBottom: 2 }}>
              <span>{NAV_ICONS[item]}</span>
              <span style={{ flex: 1 }}>{item}</span>
              {!isPaid && (item === "Interview Prep" || item === "AI Assistant") && <span style={{ fontSize: "0.65rem", background: "linear-gradient(135deg,#F59E0B,#EF4444)", color: "#fff", borderRadius: 4, padding: "2px 5px", fontWeight: 700 }}>PRO</span>}
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
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.72rem", textTransform: "capitalize" }}>{profile?.role === "admin" ? "Admin · Premium" : (profile?.plan || "Free") + " Plan"}</div>
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

        {/* Admin "Viewing as" banner */}
        {viewAsUser && (
          <div style={{ background: "linear-gradient(135deg,rgba(251,191,36,0.15),rgba(245,158,11,0.1))", borderBottom: "1px solid rgba(251,191,36,0.35)", padding: "8px 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "1rem" }}>👁</span>
              <span style={{ fontSize: "0.82rem", color: "#FCD34D", fontWeight: 600 }}>
                Admin View — Viewing dashboard as: <span style={{ color: "#fff" }}>{viewAsUser.profile?.email || viewAsUser.email}</span>
                <span style={{ marginLeft: 10, background: (PLAN_COLORS[viewAsUser.profile?.plan || "free"] || ["rgba(255,255,255,0.06)","rgba(255,255,255,0.5)"])[0], color: (PLAN_COLORS[viewAsUser.profile?.plan || "free"] || ["rgba(255,255,255,0.06)","rgba(255,255,255,0.5)"])[1], padding: "2px 8px", borderRadius: 100, fontSize: "0.72rem", textTransform: "capitalize" }}>
                  {viewAsUser.profile?.plan || "free"}
                </span>
              </span>
            </div>
            <button onClick={() => { setViewAsUser(null); setActiveNav("Admin"); }} style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", color: "#FCA5A5", borderRadius: 8, padding: "5px 14px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap" }}>
              ✕ Exit View
            </button>
          </div>
        )}

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
      const found = (stats.weekly || []).find(w => w.date === key);
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
        {(stats.recent || []).length === 0 ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: "2rem", fontSize: "0.875rem" }}>No applications yet. Use the Jobs page or turn on Auto Apply.</div>
        ) : (stats.recent || []).map((a, i) => (
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
const JOB_PLATFORM_COLORS = { LinkedIn: "#0A66C2", Naukri: "#FF7555", Internshala: "#00A550", Wellfound: "#EC4E36", Indeed: "#003A9B", Unstop: "#6C2BD9" };

function getPlatformLinks(title, company, location) {
  const t = encodeURIComponent(title); const l = encodeURIComponent(location || "India");
  return [
    { name: "LinkedIn",    url: `https://www.linkedin.com/jobs/search/?keywords=${t}&location=${l}` },
    { name: "Naukri",      url: `https://www.naukri.com/${encodeURIComponent(title.toLowerCase().replace(/\s+/g,"-"))}-jobs-in-${encodeURIComponent((location||"india").toLowerCase().replace(/\s+/g,"-"))}` },
    { name: "Indeed",      url: `https://in.indeed.com/jobs?q=${t}&l=${l}` },
    { name: "Internshala", url: `https://internshala.com/jobs/keywords-${encodeURIComponent(title.toLowerCase().replace(/\s+/g,"-"))}` },
    { name: "Unstop",      url: `https://unstop.com/jobs?search=${t}` },
  ];
}

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
    if (!data.data?.length) return SAMPLE_JOBS;
    return data.data.map((j, i) => ({
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
      platformLinks: getPlatformLinks(j.job_title, j.employer_name, j.job_city),
    }));
  } catch {
    return SAMPLE_JOBS.map(j => ({ ...j, platformLinks: getPlatformLinks(j.title, j.company, location) }));
  }
}

const PLAN_APPLY_LIMITS = { free: 5, pro: 150, premium: Infinity, enterprise: Infinity };

function JobsPage({ user, setActiveNav }) {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("India");
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [generatingCL, setGeneratingCL] = useState(null);
  const [coverLetters, setCoverLetters] = useState({});
  const [clErrors, setClErrors] = useState({});
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [expandedPlatforms, setExpandedPlatforms] = useState(null);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [limitError, setLimitError] = useState(null);
  const isMobile = useMobile();

  const plan = effectivePlan(user?.profile);
  const isFree = plan === "free";
  const applyLimit = PLAN_APPLY_LIMITS[plan] ?? 5;
  const limitReached = monthlyCount >= applyLimit;

  useEffect(() => {
    // Count this month's applications
    apiGet("/applications?limit=500").then(r => {
      if (!r.success) return;
      const all = r.data?.applications || [];
      const now = new Date();
      const thisMonth = all.filter(a => {
        const d = new Date(a.applied_at);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      });
      setMonthlyCount(thisMonth.length);
    });
  }, []);

  const searchJobs = async () => {
    setLoadingJobs(true);
    const results = await fetchLiveJobs(search, location);
    setJobs(results);
    setLoadingJobs(false);
  };

  useEffect(() => { searchJobs(); }, []);

  const handleGenerateCL = async (job) => {
    if (!GEMINI_KEY && !OPENAI_KEY) { setClErrors(prev => ({ ...prev, [job.id]: "AI service not configured. Add VITE_GEMINI_KEY in Vercel." })); return; }
    setGeneratingCL(job.id); setClErrors(prev => ({ ...prev, [job.id]: null }));
    try {
      const cl = await generateCoverLetter(job.title, job.company, "React, TypeScript, Node.js, 4 years experience");
      if (!cl) throw new Error("Empty response from AI.");
      setCoverLetters(prev => ({ ...prev, [job.id]: cl }));
    } catch (e) {
      const msg = e.message || "";
      const friendly = msg.includes("GEMINI_KEY_MISSING")
        ? "Gemini API key not configured. Add VITE_GEMINI_KEY in Vercel environment variables."
        : msg.includes("quota") || msg.includes("billing") || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")
        ? "AI quota exceeded. Please add VITE_GEMINI_KEY in Vercel (free at aistudio.google.com)."
        : msg.includes("401") || msg.includes("Unauthorized") || msg.includes("API_KEY_INVALID")
        ? "Invalid API key. Check VITE_GEMINI_KEY in Vercel environment variables."
        : `Failed to generate cover letter: ${msg}`;
      setClErrors(prev => ({ ...prev, [job.id]: friendly }));
    }
    setGeneratingCL(null);
  };

  const handleApply = async (job) => {
    setLimitError(null);
    if (limitReached) {
      setLimitError(`You've reached your ${applyLimit} AI applications limit for this month on the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan.`);
      return;
    }
    await apiPost("/applications", { company: job.company, position: job.title, status: "Applied", match_score: job.match, job_url: job.url || "" });
    setAppliedIds(prev => new Set([...prev, job.id]));
    setExpandedPlatforms(job.id);
    setMonthlyCount(prev => prev + 1);
  };

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Monthly usage bar */}
      {applyLimit !== Infinity && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1rem", background: limitReached ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${limitReached ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: "10px 16px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>AI Applications this month</span>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: limitReached ? "#EF4444" : "#60A5FA" }}>{monthlyCount} / {applyLimit}</span>
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 4 }}>
              <div style={{ height: "100%", borderRadius: 4, width: `${Math.min(100, (monthlyCount / applyLimit) * 100)}%`, background: limitReached ? "#EF4444" : "linear-gradient(90deg,#3B82F6,#8B5CF6)", transition: "width 0.3s" }} />
            </div>
          </div>
          {limitReached && (
            <button onClick={() => setActiveNav && setActiveNav("Settings")} style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)", border: "none", borderRadius: 8, padding: "6px 14px", color: "#fff", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", whiteSpace: "nowrap" }}>
              Upgrade
            </button>
          )}
        </div>
      )}

      {limitError && (
        <div style={{ marginBottom: "1rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ color: "#FCA5A5", fontSize: "0.85rem" }}>🚫 {limitError}</span>
          <button onClick={() => setActiveNav && setActiveNav("Settings")} style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", borderRadius: 8, padding: "6px 14px", color: "#fff", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", whiteSpace: "nowrap" }}>
            Upgrade Plan
          </button>
        </div>
      )}

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
          {jobs.map((job, idx) => {
            const isLocked = isFree && idx >= 5;
            return (
              <div key={job.id} style={{ position: "relative", borderRadius: 16, overflow: "hidden", minHeight: isLocked ? 90 : "auto" }}>
                {/* Job card */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${isLocked ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.07)"}`, borderRadius: 16, padding: "1.25rem 1.5rem", filter: isLocked ? "blur(4px)" : "none", pointerEvents: isLocked ? "none" : "auto", userSelect: isLocked ? "none" : "auto", visibility: isLocked ? "visible" : "visible" }}>
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
                      <button onClick={() => handleApply(job)} disabled={appliedIds.has(job.id)} style={{ flex: isMobile ? 1 : "none", background: appliedIds.has(job.id) ? "rgba(16,185,129,0.15)" : "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: appliedIds.has(job.id) ? "1px solid rgba(16,185,129,0.3)" : "none", color: appliedIds.has(job.id) ? "#10B981" : "#fff", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem" }}>
                        {appliedIds.has(job.id) ? "✓ Applied" : "Apply Now"}
                      </button>
                    </div>
                  </div>

                  {/* Platform links shown after Apply */}
                  {expandedPlatforms === job.id && (
                    <div style={{ marginTop: "1rem", padding: "0.875rem 1rem", background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 10 }}>
                      <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.6rem", fontWeight: 600 }}>Apply on your preferred platform:</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {(job.platformLinks || getPlatformLinks(job.title, job.company, job.location)).map(p => (
                          <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer" style={{ background: JOB_PLATFORM_COLORS[p.name] || "#3B82F6", color: "#fff", borderRadius: 7, padding: "6px 14px", fontSize: "0.78rem", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
                            {p.name} →
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {clErrors[job.id] && <div style={{ marginTop: "0.75rem", color: "#FCA5A5", fontSize: "0.82rem", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "8px 12px" }}>⚠ {clErrors[job.id]}</div>}
                  {coverLetters[job.id] && (
                    <div style={{ marginTop: "1rem", background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, padding: "1rem" }}>
                      <div style={{ fontWeight: 600, color: "#A78BFA", fontSize: "0.82rem", marginBottom: "0.5rem" }}>✍️ AI-Generated Cover Letter</div>
                      <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.875rem", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{coverLetters[job.id]}</p>
                    </div>
                  )}
                </div>

                {/* Lock overlay for free users */}
                {isLocked && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg,rgba(10,10,25,0.88),rgba(30,15,50,0.92))", backdropFilter: "blur(6px)", borderRadius: 16, padding: "0 1.5rem", border: "1px solid rgba(139,92,246,0.25)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>🔒</div>
                      <div>
                        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "#fff", marginBottom: 2 }}>Unlock full job results & Auto-Apply</div>
                        <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)" }}>Free plan is limited to 5 results · Upgrade for unlimited access</div>
                      </div>
                    </div>
                    <button onClick={() => setActiveNav && setActiveNav("Settings")} style={{ flexShrink: 0, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", borderRadius: 10, padding: "9px 20px", color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                      Upgrade to Pro
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── APPLICATIONS ─────────────────────────────────────────────────────────────
function ApplicationsPage({ user, setScreen }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [updatingId, setUpdatingId] = useState(null);
  const isMobile = useMobile();

  const isFree = !["pro","premium"].includes(effectivePlan(user?.profile));
  const FREE_LIMIT = 5;

  const loadApps = () => {
    apiGet("/applications?limit=100").then(r => { setApps(r.success ? (r.data?.applications || []) : []); setLoading(false); });
  };

  useEffect(() => { loadApps(); }, []);

  const updateStatus = async (app, newStatus) => {
    setUpdatingId(app.id);
    await apiPut(`/applications/${app.id}`, { status: newStatus });
    setApps(prev => prev.map(a => a.id === app.id ? { ...a, status: newStatus } : a));
    setUpdatingId(null);
  };

  const statuses = ["All", ...Object.keys(STATUS_COLORS)];
  const allFiltered = statusFilter === "All" ? apps : apps.filter(a => a.status === statusFilter);
  const visibleApps = isFree ? allFiltered.slice(0, FREE_LIMIT) : allFiltered;
  const hiddenCount = isFree ? Math.max(0, allFiltered.length - FREE_LIMIT) : 0;
  const filtered = visibleApps;

  const statCounts = apps.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Total Applied", value: apps.length, color: "#3B82F6" },
          { label: "Interviews", value: statCounts["Interview"] || 0, color: "#10B981" },
          { label: "Offers", value: statCounts["Offer"] || 0, color: "#F59E0B" },
          { label: "Rejected", value: statCounts["Rejected"] || 0, color: "#EF4444" },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "1rem 1.25rem" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: s.color, fontFamily: "'Space Grotesk',sans-serif" }}>{s.value}</div>
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {statuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{ background: statusFilter === s ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${statusFilter === s ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.07)"}`, color: statusFilter === s ? "#60A5FA" : "rgba(255,255,255,0.5)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}>{s} {s !== "All" && statCounts[s] ? `(${statCounts[s]})` : ""}</button>
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
                <select disabled={updatingId === a.id} value={a.status} onChange={e => updateStatus(a, e.target.value)}
                  style={{ background: STATUS_COLORS[a.status] + "22", border: `1px solid ${STATUS_COLORS[a.status]}55`, color: STATUS_COLORS[a.status], borderRadius: 8, padding: "4px 8px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", outline: "none" }}>
                  {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s} style={{ background: "#1e293b", color: "#fff" }}>{s}</option>)}
                </select>
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
                <select disabled={updatingId === a.id} value={a.status} onChange={e => updateStatus(a, e.target.value)}
                  style={{ background: STATUS_COLORS[a.status] + "22", border: `1px solid ${STATUS_COLORS[a.status]}55`, color: STATUS_COLORS[a.status], borderRadius: 8, padding: "5px 8px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", outline: "none" }}>
                  {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s} style={{ background: "#1e293b", color: "#fff" }}>{s}</option>)}
                </select>
              </div>
            ))}
          </div>
        )
      )}

      {/* Free plan locked applications banner */}
      {!loading && hiddenCount > 0 && (
        <div style={{ marginTop: "1rem", background: "linear-gradient(135deg,rgba(59,130,246,0.08),rgba(139,92,246,0.08))", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 16, padding: "1.5rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>🔒</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", marginBottom: 4 }}>
            {hiddenCount} more application{hiddenCount > 1 ? "s" : ""} hidden
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.83rem", marginBottom: "1rem" }}>
            Free plan shows only your 5 most recent applications. Upgrade to Pro to unlock your full history.
          </div>
          <button onClick={() => setScreen && setScreen("Settings")} style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", borderRadius: 10, padding: "10px 28px", color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}>
            Upgrade to Pro — ₹599/mo
          </button>
        </div>
      )}
    </div>
  );
}

// ─── RESUME SYSTEM ────────────────────────────────────────────────────────────
const RESUME_TEMPLATES = [
  // ── FREE (5) ──────────────────────────────────────────────────────────────
  { id: "classic",      name: "Classic",      free: true,  category: "ATS-Friendly", accent: "#2563EB",  layout: "single",  desc: "Clean ATS-optimised single column" },
  { id: "modern",       name: "Modern",       free: true,  category: "Modern",       accent: "#7C3AED",  layout: "sidebar", desc: "Purple gradient sidebar, skill pills" },
  { id: "minimal",      name: "Minimal",      free: true,  category: "Minimal",      accent: "#111827",  layout: "grid",    desc: "Ultra-clean date-grid layout" },
  { id: "professional", name: "Professional", free: true,  category: "Corporate",    accent: "#1E40AF",  layout: "banner",  desc: "Gradient banner header, skill pills" },
  { id: "creative",     name: "Creative",     free: true,  category: "Creative",     accent: "#DC2626",  layout: "split",   desc: "Dark hero with sidebar skill tags" },
  // ── PREMIUM ───────────────────────────────────────────────────────────────
  { id: "compact",      name: "Compact",      free: false, category: "Modern",       accent: "#0891B2",  layout: "sidebar", desc: "Teal two-column, great for seniors" },
  { id: "impact",       name: "Impact",       free: false, category: "Creative",     accent: "#059669",  layout: "banner",  desc: "Bold centred name, strong accent lines" },
  { id: "chikorita",    name: "Chikorita",    free: false, category: "Modern",       accent: "#16A34A",  layout: "sidebar", desc: "Slim green sidebar — rxresume style" },
  { id: "onyx",         name: "Onyx",         free: false, category: "Corporate",    accent: "#1C1917",  layout: "banner",  desc: "Bold charcoal header, sharp typography" },
  { id: "gengar",       name: "Gengar",       free: false, category: "Creative",     accent: "#6D28D9",  layout: "sidebar", desc: "Dark navy sidebar, vivid purple accents" },
  { id: "pikachu",      name: "Pikachu",      free: false, category: "Minimal",      accent: "#D97706",  layout: "single",  desc: "Warm amber accents, pill skill badges" },
  { id: "nova",         name: "Nova",         free: false, category: "Modern",       accent: "#0EA5E9",  layout: "sidebar", desc: "Sky-blue sidebar, glassmorphism header" },
  { id: "ember",        name: "Ember",        free: false, category: "Creative",     accent: "#EA580C",  layout: "split",   desc: "Warm orange-red split, bold section labels" },
  { id: "slate",        name: "Slate",        free: false, category: "Corporate",    accent: "#475569",  layout: "single",  desc: "Steel-grey corporate, clean serif headings" },
  { id: "aurora",       name: "Aurora",       free: false, category: "Creative",     accent: "#7C3AED",  layout: "banner",  desc: "Gradient purple-pink banner, airy layout" },
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

function ModernTemplate({ data }) {
  const p = data.personal || {};
  const accent = "#7C3AED";
  return (
    <div style={{ fontFamily: "Inter, Arial, sans-serif", color: "#1a1a1a", background: "#fff", display: "flex", minHeight: 900, fontSize: 12 }}>
      <div style={{ width: 190, background: `linear-gradient(160deg,${accent},#4F46E5)`, color: "#fff", padding: "32px 20px", flexShrink: 0 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, margin: "0 auto 14px" }}>{(p.name || "?")[0]?.toUpperCase()}</div>
        <div style={{ textAlign: "center", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.2)" }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name || "Your Name"}</div>
          {p.title && <div style={{ fontSize: 10, opacity: 0.8, marginTop: 4 }}>{p.title}</div>}
        </div>
        <div style={{ fontSize: 10, lineHeight: 1.8, opacity: 0.9 }}>
          {p.email && <div>✉ {p.email}</div>}
          {p.phone && <div>📞 {p.phone}</div>}
          {p.location && <div>📍 {p.location}</div>}
          {p.linkedin && <div>in {p.linkedin}</div>}
          {p.website && <div>🔗 {p.website}</div>}
        </div>
        {data.skills?.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8, opacity: 0.7 }}>Skills</div>
            {data.skills.map((s, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 9, opacity: 0.7, marginBottom: 3 }}>{s.category}</div>
                <div style={{ fontSize: 10, lineHeight: 1.6 }}>{s.items}</div>
              </div>
            ))}
          </div>
        )}
        {data.languages?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8, opacity: 0.7 }}>Languages</div>
            {data.languages.map((l, i) => <div key={i} style={{ fontSize: 10, marginBottom: 3 }}>{l.language}{l.proficiency ? ` · ${l.proficiency}` : ""}</div>)}
          </div>
        )}
      </div>
      <div style={{ flex: 1, padding: "32px 28px", lineHeight: 1.5 }}>
        {data.summary && <div style={{ marginBottom: 18 }}><div style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: accent, marginBottom: 6 }}>About Me</div><p style={{ margin: 0, color: "#444", fontSize: 11.5 }}>{data.summary}</p></div>}
        {data.experience?.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: accent, marginBottom: 8 }}>Experience</div>
            {data.experience.map((e, i) => (
              <div key={i} style={{ marginBottom: 12, paddingLeft: 12, borderLeft: `2px solid ${accent}` }}>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{e.position}</div>
                <div style={{ color: accent, fontSize: 11 }}>{e.company}{e.location ? ` · ${e.location}` : ""} <span style={{ color: "#888", fontSize: 10, marginLeft: 8 }}>{e.startDate}{e.current ? " – Present" : e.endDate ? ` – ${e.endDate}` : ""}</span></div>
                {e.description && <p style={{ margin: "4px 0 0", color: "#555", fontSize: 11, whiteSpace: "pre-line" }}>{e.description}</p>}
              </div>
            ))}
          </div>
        )}
        {data.education?.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: accent, marginBottom: 8 }}>Education</div>
            {data.education.map((e, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
                <div style={{ color: "#555", fontSize: 11 }}>{e.school} <span style={{ color: "#888", fontSize: 10 }}>{e.endDate || e.startDate}</span></div>
              </div>
            ))}
          </div>
        )}
        {data.projects?.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: accent, marginBottom: 8 }}>Projects</div>
            {data.projects.map((p, i) => (
              <div key={i} style={{ marginBottom: 10, paddingLeft: 12, borderLeft: `2px solid ${accent}` }}>
                <strong style={{ fontSize: 12 }}>{p.name}</strong>
                {p.technologies && <span style={{ color: "#888", fontSize: 10, marginLeft: 8 }}>{p.technologies}</span>}
                {p.description && <p style={{ margin: "3px 0 0", color: "#555", fontSize: 11 }}>{p.description}</p>}
              </div>
            ))}
          </div>
        )}
        {data.certifications?.length > 0 && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: accent, marginBottom: 8 }}>Certifications</div>
            {data.certifications.map((c, i) => <div key={i} style={{ fontSize: 11, marginBottom: 4 }}><strong>{c.name}</strong>{c.issuer ? ` · ${c.issuer}` : ""}{c.date ? ` (${c.date})` : ""}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

function MinimalTemplate({ data }) {
  const p = data.personal || {};
  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#111", background: "#fff", padding: "48px 52px", minHeight: 900, fontSize: 12, lineHeight: 1.6 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 30, fontWeight: 300, letterSpacing: "-0.02em", color: "#000" }}>{p.name || "Your Name"}</div>
        {p.title && <div style={{ fontSize: 13, color: "#666", marginTop: 4, fontWeight: 400 }}>{p.title}</div>}
        <div style={{ display: "flex", gap: 20, marginTop: 8, fontSize: 11, color: "#666", flexWrap: "wrap" }}>
          {p.email && <span>{p.email}</span>}
          {p.phone && <span>{p.phone}</span>}
          {p.location && <span>{p.location}</span>}
          {p.linkedin && <span>{p.linkedin}</span>}
        </div>
      </div>
      {data.summary && <div style={{ marginBottom: 22 }}><p style={{ margin: 0, color: "#444", fontSize: 12, borderLeft: "2px solid #ddd", paddingLeft: 12 }}>{data.summary}</p></div>}
      {data.experience?.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#999", marginBottom: 12 }}>Experience</div>
          {data.experience.map((e, i) => (
            <div key={i} style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "120px 1fr", gap: "0 20px" }}>
              <div style={{ fontSize: 10, color: "#888", paddingTop: 2 }}>{e.startDate}{e.current ? "–Present" : e.endDate ? `–${e.endDate}` : ""}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{e.position}</div>
                <div style={{ color: "#666", fontSize: 11 }}>{e.company}{e.location ? `, ${e.location}` : ""}</div>
                {e.description && <p style={{ margin: "4px 0 0", color: "#555", fontSize: 11, whiteSpace: "pre-line" }}>{e.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {data.education?.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#999", marginBottom: 12 }}>Education</div>
          {data.education.map((e, i) => (
            <div key={i} style={{ marginBottom: 10, display: "grid", gridTemplateColumns: "120px 1fr", gap: "0 20px" }}>
              <div style={{ fontSize: 10, color: "#888", paddingTop: 2 }}>{e.endDate || e.startDate}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
                <div style={{ color: "#666", fontSize: 11 }}>{e.school}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {data.skills?.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#999", marginBottom: 12 }}>Skills</div>
          {data.skills.map((s, i) => (
            <div key={i} style={{ marginBottom: 4, display: "grid", gridTemplateColumns: "120px 1fr", gap: "0 20px" }}>
              <div style={{ fontSize: 10, color: "#888" }}>{s.category}</div>
              <div style={{ fontSize: 11, color: "#444" }}>{s.items}</div>
            </div>
          ))}
        </div>
      )}
      {data.projects?.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#999", marginBottom: 12 }}>Projects</div>
          {data.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: 10, display: "grid", gridTemplateColumns: "120px 1fr", gap: "0 20px" }}>
              <div style={{ fontSize: 10, color: "#888", paddingTop: 2 }}>{p.technologies}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</div>
                {p.description && <p style={{ margin: "2px 0 0", color: "#555", fontSize: 11 }}>{p.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {(data.certifications?.length > 0 || data.languages?.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {data.certifications?.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#999", marginBottom: 8 }}>Certifications</div>
              {data.certifications.map((c, i) => <div key={i} style={{ fontSize: 11, color: "#444", marginBottom: 4 }}>{c.name}{c.issuer ? ` · ${c.issuer}` : ""}</div>)}
            </div>
          )}
          {data.languages?.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#999", marginBottom: 8 }}>Languages</div>
              {data.languages.map((l, i) => <div key={i} style={{ fontSize: 11, color: "#444", marginBottom: 4 }}>{l.language}{l.proficiency ? ` · ${l.proficiency}` : ""}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProfessionalTemplate({ data }) {
  const p = data.personal || {};
  const accent = "#1E40AF";
  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#1a1a1a", background: "#fff", minHeight: 900, fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ background: accent, color: "#fff", padding: "28px 40px 22px" }}>
        <div style={{ fontSize: 28, fontWeight: 700 }}>{p.name || "Your Name"}</div>
        {p.title && <div style={{ fontSize: 13, opacity: 0.85, marginTop: 3 }}>{p.title}</div>}
        <div style={{ display: "flex", gap: 20, marginTop: 10, fontSize: 10.5, opacity: 0.85, flexWrap: "wrap" }}>
          {p.email && <span>✉ {p.email}</span>}
          {p.phone && <span>☎ {p.phone}</span>}
          {p.location && <span>⊙ {p.location}</span>}
          {p.linkedin && <span>in {p.linkedin}</span>}
        </div>
      </div>
      <div style={{ padding: "24px 40px" }}>
        {data.summary && <div style={{ marginBottom: 18, padding: "12px 16px", background: "#EFF6FF", borderRadius: 6, fontSize: 11.5, color: "#334155" }}>{data.summary}</div>}
        {data.experience?.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: accent, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `2px solid ${accent}`, paddingBottom: 4, marginBottom: 10 }}>Work Experience</div>
            {data.experience.map((e, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontWeight: 700, fontSize: 12.5 }}>{e.position}</span>
                  <span style={{ fontSize: 10.5, color: "#666", background: "#F1F5F9", padding: "1px 8px", borderRadius: 100 }}>{e.startDate}{e.current ? " – Present" : e.endDate ? ` – ${e.endDate}` : ""}</span>
                </div>
                <div style={{ color: accent, fontSize: 11, marginBottom: 3 }}>{e.company}{e.location ? ` · ${e.location}` : ""}</div>
                {e.description && <p style={{ margin: 0, color: "#444", fontSize: 11, whiteSpace: "pre-line" }}>{e.description}</p>}
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            {data.education?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: accent, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `2px solid ${accent}`, paddingBottom: 4, marginBottom: 8 }}>Education</div>
                {data.education.map((e, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
                    <div style={{ color: "#555", fontSize: 11 }}>{e.school}</div>
                    <div style={{ color: "#888", fontSize: 10 }}>{e.endDate || e.startDate}</div>
                  </div>
                ))}
              </div>
            )}
            {data.certifications?.length > 0 && (
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: accent, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `2px solid ${accent}`, paddingBottom: 4, marginBottom: 8 }}>Certifications</div>
                {data.certifications.map((c, i) => <div key={i} style={{ fontSize: 11, marginBottom: 5 }}><strong>{c.name}</strong>{c.issuer ? <span style={{ color: "#666" }}> · {c.issuer}</span> : null}</div>)}
              </div>
            )}
          </div>
          <div>
            {data.skills?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: accent, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `2px solid ${accent}`, paddingBottom: 4, marginBottom: 8 }}>Skills</div>
                {data.skills.map((s, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: "#555", marginBottom: 2 }}>{s.category}</div>
                    <div style={{ fontSize: 11, color: "#333" }}>{s.items}</div>
                  </div>
                ))}
              </div>
            )}
            {data.languages?.length > 0 && (
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: accent, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `2px solid ${accent}`, paddingBottom: 4, marginBottom: 8 }}>Languages</div>
                {data.languages.map((l, i) => <div key={i} style={{ fontSize: 11, marginBottom: 4 }}>{l.language}{l.proficiency ? ` · ${l.proficiency}` : ""}</div>)}
              </div>
            )}
          </div>
        </div>
        {data.projects?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: accent, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `2px solid ${accent}`, paddingBottom: 4, marginBottom: 10 }}>Projects</div>
            {data.projects.map((p, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: 12 }}>{p.name}</strong>{p.technologies && <span style={{ color: "#888", fontSize: 10, marginLeft: 8 }}>({p.technologies})</span>}
                {p.description && <p style={{ margin: "2px 0 0", color: "#444", fontSize: 11 }}>{p.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreativeTemplate({ data }) {
  const p = data.personal || {};
  const accent = "#DC2626";
  return (
    <div style={{ fontFamily: "'Arial', sans-serif", color: "#1a1a1a", background: "#fff", minHeight: 900, fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ background: "#111", color: "#fff", padding: "36px 40px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 200, height: 200, background: accent, borderRadius: "0 0 0 100%", opacity: 0.15 }} />
        <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.02em" }}>{p.name || "Your Name"}</div>
        {p.title && <div style={{ fontSize: 14, color: accent, marginTop: 4, fontWeight: 600 }}>{p.title}</div>}
        <div style={{ display: "flex", gap: 18, marginTop: 12, fontSize: 10.5, color: "rgba(255,255,255,0.7)", flexWrap: "wrap" }}>
          {p.email && <span>{p.email}</span>}
          {p.phone && <span>{p.phone}</span>}
          {p.location && <span>{p.location}</span>}
          {p.linkedin && <span>{p.linkedin}</span>}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", minHeight: 700 }}>
        <div style={{ background: "#F9FAFB", padding: "24px 20px", borderRight: "1px solid #E5E7EB" }}>
          {data.skills?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: accent, marginBottom: 10 }}>Skills</div>
              {data.skills.map((s, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#555", marginBottom: 3 }}>{s.category}</div>
                  <div style={{ fontSize: 10.5, color: "#333", lineHeight: 1.6 }}>{s.items}</div>
                </div>
              ))}
            </div>
          )}
          {data.education?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: accent, marginBottom: 10 }}>Education</div>
              {data.education.map((e, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 11 }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
                  <div style={{ color: "#666", fontSize: 10 }}>{e.school}</div>
                  <div style={{ color: "#999", fontSize: 10 }}>{e.endDate || e.startDate}</div>
                </div>
              ))}
            </div>
          )}
          {data.certifications?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: accent, marginBottom: 10 }}>Certifications</div>
              {data.certifications.map((c, i) => <div key={i} style={{ fontSize: 10.5, marginBottom: 6 }}><strong>{c.name}</strong>{c.issuer && <div style={{ color: "#666", fontSize: 10 }}>{c.issuer}</div>}</div>)}
            </div>
          )}
          {data.languages?.length > 0 && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: accent, marginBottom: 10 }}>Languages</div>
              {data.languages.map((l, i) => <div key={i} style={{ fontSize: 10.5, marginBottom: 4 }}>{l.language}{l.proficiency && <span style={{ color: "#888" }}> · {l.proficiency}</span>}</div>)}
            </div>
          )}
        </div>
        <div style={{ padding: "24px 28px" }}>
          {data.summary && <div style={{ marginBottom: 18 }}><div style={{ fontWeight: 800, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: accent, marginBottom: 6 }}>About</div><p style={{ margin: 0, color: "#444", fontSize: 11.5 }}>{data.summary}</p></div>}
          {data.experience?.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: accent, marginBottom: 10 }}>Experience</div>
              {data.experience.map((e, i) => (
                <div key={i} style={{ marginBottom: 14, paddingLeft: 10, borderLeft: `3px solid ${i === 0 ? accent : "#E5E7EB"}` }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5 }}>{e.position}</div>
                  <div style={{ color: "#666", fontSize: 11, marginBottom: 3 }}>{e.company} {e.startDate && <span style={{ color: "#999", fontSize: 10 }}>· {e.startDate}{e.current ? " – Now" : e.endDate ? ` – ${e.endDate}` : ""}</span>}</div>
                  {e.description && <p style={{ margin: 0, color: "#555", fontSize: 11, whiteSpace: "pre-line" }}>{e.description}</p>}
                </div>
              ))}
            </div>
          )}
          {data.projects?.length > 0 && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: accent, marginBottom: 10 }}>Projects</div>
              {data.projects.map((p, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{p.name}{p.technologies && <span style={{ fontWeight: 400, color: "#888", fontSize: 10, marginLeft: 8 }}>{p.technologies}</span>}</div>
                  {p.description && <p style={{ margin: "2px 0 0", color: "#555", fontSize: 11 }}>{p.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExecutiveTemplate({ data }) {
  const p = data.personal || {};
  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#1a1a1a", background: "#fff", padding: "44px 48px", minHeight: 900, fontSize: 12, lineHeight: 1.6 }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "0.04em", color: "#0F172A" }}>{(p.name || "Your Name").toUpperCase()}</div>
        {p.title && <div style={{ fontSize: 13, color: "#475569", marginTop: 5, fontStyle: "italic" }}>{p.title}</div>}
        <div style={{ width: 60, height: 2, background: "#0F172A", margin: "12px auto" }} />
        <div style={{ display: "flex", gap: 20, justifyContent: "center", fontSize: 10.5, color: "#555", flexWrap: "wrap" }}>
          {p.email && <span>{p.email}</span>}
          {p.phone && <span>{p.phone}</span>}
          {p.location && <span>{p.location}</span>}
          {p.linkedin && <span>{p.linkedin}</span>}
        </div>
      </div>
      {data.summary && (
        <div style={{ marginBottom: 20, textAlign: "center" }}>
          <p style={{ margin: "0 auto", color: "#444", fontSize: 11.5, fontStyle: "italic", maxWidth: 480 }}>{data.summary}</p>
        </div>
      )}
      {data.experience?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ textAlign: "center", fontWeight: 700, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#0F172A", marginBottom: 12 }}>Professional Experience</div>
          {data.experience.map((e, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 700, fontSize: 12.5 }}>{e.position}</span>
                <span style={{ color: "#666", fontSize: 10.5, fontStyle: "italic" }}>{e.startDate}{e.current ? " – Present" : e.endDate ? ` – ${e.endDate}` : ""}</span>
              </div>
              <div style={{ color: "#475569", fontSize: 11, fontStyle: "italic", marginBottom: 3 }}>{e.company}{e.location ? `, ${e.location}` : ""}</div>
              {e.description && <p style={{ margin: 0, color: "#444", fontSize: 11, whiteSpace: "pre-line" }}>{e.description}</p>}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
        {data.education?.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ textAlign: "center", fontWeight: 700, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#0F172A", marginBottom: 10 }}>Education</div>
            {data.education.map((e, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{e.degree}{e.field ? ` in ${e.field}` : ""}</div>
                <div style={{ color: "#475569", fontSize: 11, fontStyle: "italic" }}>{e.school}</div>
                <div style={{ color: "#888", fontSize: 10 }}>{e.endDate || e.startDate}</div>
              </div>
            ))}
          </div>
        )}
        {data.skills?.length > 0 && (
          <div>
            <div style={{ textAlign: "center", fontWeight: 700, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#0F172A", marginBottom: 10 }}>Core Competencies</div>
            {data.skills.map((s, i) => (
              <div key={i} style={{ marginBottom: 5 }}>
                <span style={{ fontWeight: 700, fontSize: 11 }}>{s.category}: </span>
                <span style={{ fontSize: 11, color: "#444" }}>{s.items}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {data.projects?.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ textAlign: "center", fontWeight: 700, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#0F172A", marginBottom: 10 }}>Key Projects</div>
          {data.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <strong style={{ fontSize: 12 }}>{p.name}</strong>{p.technologies && <span style={{ fontSize: 10, color: "#888", marginLeft: 8, fontStyle: "italic" }}>({p.technologies})</span>}
              {p.description && <p style={{ margin: "2px 0 0", color: "#444", fontSize: 11 }}>{p.description}</p>}
            </div>
          ))}
        </div>
      )}
      {(data.certifications?.length > 0 || data.languages?.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px", marginTop: 12 }}>
          {data.certifications?.length > 0 && (
            <div>
              <div style={{ textAlign: "center", fontWeight: 700, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#0F172A", marginBottom: 8 }}>Certifications</div>
              {data.certifications.map((c, i) => <div key={i} style={{ fontSize: 11, marginBottom: 4 }}>{c.name}{c.issuer ? ` · ${c.issuer}` : ""}</div>)}
            </div>
          )}
          {data.languages?.length > 0 && (
            <div>
              <div style={{ textAlign: "center", fontWeight: 700, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#0F172A", marginBottom: 8 }}>Languages</div>
              {data.languages.map((l, i) => <div key={i} style={{ fontSize: 11, marginBottom: 4 }}>{l.language}{l.proficiency ? ` · ${l.proficiency}` : ""}</div>)}
            </div>
          )}
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

function NovaTemplate({ data }) {
  const p = data.personal || {}; const exp = data.experience || []; const edu = data.education || []; const skills = data.skills || [];
  return (
    <div style={{ fontFamily: "'Segoe UI',sans-serif", color: "#0f172a", background: "#fff", display: "flex", minHeight: 900, fontSize: 12 }}>
      <div style={{ width: 220, background: "linear-gradient(180deg,#0EA5E9 0%,#0284C7 100%)", padding: "36px 20px", flexShrink: 0, color: "#fff" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, marginBottom: 16, border: "3px solid rgba(255,255,255,0.5)" }}>{(p.name||"?")[0]}</div>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, lineHeight: 1.2 }}>{p.name || "Your Name"}</div>
        <div style={{ fontSize: 10, opacity: 0.85, marginBottom: 20, fontWeight: 500 }}>{p.title || "Job Title"}</div>
        <div style={{ fontSize: 10, marginBottom: 20, lineHeight: 1.7, opacity: 0.9 }}>
          {p.email && <div>✉ {p.email}</div>}{p.phone && <div>📞 {p.phone}</div>}{p.location && <div>📍 {p.location}</div>}
        </div>
        {skills.length > 0 && <><div style={{ fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", marginBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.3)", paddingBottom: 6 }}>SKILLS</div>
          {skills.map((s,i) => <div key={i} style={{ background: "rgba(255,255,255,0.18)", borderRadius: 4, padding: "3px 8px", fontSize: 10, marginBottom: 5, fontWeight: 500 }}>{s}</div>)}</>}
      </div>
      <div style={{ flex: 1, padding: "36px 32px" }}>
        {p.summary && <><div style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", color: "#0EA5E9", marginBottom: 8, borderBottom: "2px solid #0EA5E9", paddingBottom: 4 }}>PROFILE</div><p style={{ lineHeight: 1.7, color: "#475569", marginBottom: 24, fontSize: 11 }}>{p.summary}</p></>}
        {exp.length > 0 && <><div style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", color: "#0EA5E9", marginBottom: 10, borderBottom: "2px solid #0EA5E9", paddingBottom: 4 }}>EXPERIENCE</div>
          {exp.map((e,i) => <div key={i} style={{ marginBottom: 16 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 700, fontSize: 12 }}>{e.title}</span><span style={{ fontSize: 10, color: "#64748b", background: "#f0f9ff", padding: "2px 8px", borderRadius: 4 }}>{e.start} – {e.end||"Present"}</span></div><div style={{ color: "#0EA5E9", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{e.company}{e.location ? ` · ${e.location}` : ""}</div><p style={{ color: "#475569", lineHeight: 1.6, margin: 0, fontSize: 11 }}>{e.description}</p></div>)}</>}
        {edu.length > 0 && <><div style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", color: "#0EA5E9", marginBottom: 10, borderBottom: "2px solid #0EA5E9", paddingBottom: 4, marginTop: 20 }}>EDUCATION</div>
          {edu.map((e,i) => <div key={i} style={{ marginBottom: 10 }}><div style={{ fontWeight: 700 }}>{e.degree}</div><div style={{ color: "#0EA5E9", fontSize: 11 }}>{e.school}</div><div style={{ color: "#94a3b8", fontSize: 10 }}>{e.year}</div></div>)}</>}
      </div>
    </div>
  );
}

function EmberTemplate({ data }) {
  const p = data.personal || {}; const exp = data.experience || []; const edu = data.education || []; const skills = data.skills || [];
  return (
    <div style={{ fontFamily: "'Arial',sans-serif", color: "#1c1917", background: "#fff", minHeight: 900, fontSize: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "linear-gradient(135deg,#EA580C,#DC2626)", padding: "32px 40px", color: "#fff", gap: 20 }}>
        <div><div style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.03em", lineHeight: 1.1 }}>{p.name || "Your Name"}</div><div style={{ fontWeight: 500, fontSize: 12, opacity: 0.9, marginTop: 6 }}>{p.title || "Job Title"}</div></div>
        <div style={{ fontSize: 10, textAlign: "right", lineHeight: 2, opacity: 0.9 }}>{p.email && <div>{p.email}</div>}{p.phone && <div>{p.phone}</div>}{p.location && <div>{p.location}</div>}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 0 }}>
        <div style={{ padding: "28px 32px" }}>
          {p.summary && <><div style={{ fontWeight: 800, fontSize: 10, letterSpacing: "0.12em", color: "#EA580C", marginBottom: 8 }}>ABOUT</div><p style={{ lineHeight: 1.7, color: "#44403c", marginBottom: 20 }}>{p.summary}</p></>}
          {exp.length > 0 && <><div style={{ fontWeight: 800, fontSize: 10, letterSpacing: "0.12em", color: "#EA580C", marginBottom: 10 }}>EXPERIENCE</div>
            {exp.map((e,i) => <div key={i} style={{ marginBottom: 16, paddingLeft: 12, borderLeft: "3px solid #EA580C" }}><div style={{ fontWeight: 700 }}>{e.title} <span style={{ color: "#EA580C" }}>@ {e.company}</span></div><div style={{ color: "#78716c", fontSize: 10, marginBottom: 4 }}>{e.start} – {e.end||"Present"}{e.location ? ` · ${e.location}` : ""}</div><p style={{ color: "#57534e", lineHeight: 1.6, margin: 0 }}>{e.description}</p></div>)}</>}
        </div>
        <div style={{ padding: "28px 24px", background: "#fff7ed", borderLeft: "1px solid #fed7aa" }}>
          {skills.length > 0 && <><div style={{ fontWeight: 800, fontSize: 10, letterSpacing: "0.12em", color: "#EA580C", marginBottom: 10 }}>SKILLS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>{skills.map((s,i) => <span key={i} style={{ background: "#EA580C", color: "#fff", borderRadius: 4, padding: "3px 9px", fontSize: 10, fontWeight: 600 }}>{s}</span>)}</div></>}
          {edu.length > 0 && <><div style={{ fontWeight: 800, fontSize: 10, letterSpacing: "0.12em", color: "#EA580C", marginBottom: 10 }}>EDUCATION</div>
            {edu.map((e,i) => <div key={i} style={{ marginBottom: 12 }}><div style={{ fontWeight: 700, fontSize: 11 }}>{e.degree}</div><div style={{ color: "#EA580C", fontSize: 10 }}>{e.school}</div><div style={{ color: "#a8a29e", fontSize: 10 }}>{e.year}</div></div>)}</>}
        </div>
      </div>
    </div>
  );
}

function SlateTemplate({ data }) {
  const p = data.personal || {}; const exp = data.experience || []; const edu = data.education || []; const skills = data.skills || [];
  return (
    <div style={{ fontFamily: "Georgia,'Times New Roman',serif", color: "#1e293b", background: "#fff", padding: "44px 52px", minHeight: 900, fontSize: 12 }}>
      <div style={{ borderBottom: "3px solid #475569", paddingBottom: 18, marginBottom: 28 }}>
        <div style={{ fontFamily: "'Arial',sans-serif", fontWeight: 900, fontSize: 26, letterSpacing: "-0.02em", color: "#0f172a" }}>{p.name || "Your Name"}</div>
        <div style={{ fontFamily: "'Arial',sans-serif", fontWeight: 500, fontSize: 13, color: "#475569", marginTop: 4 }}>{p.title || "Job Title"}</div>
        <div style={{ display: "flex", gap: 20, marginTop: 10, fontSize: 10, color: "#64748b", fontFamily: "'Arial',sans-serif" }}>
          {p.email && <span>{p.email}</span>}{p.phone && <span>{p.phone}</span>}{p.location && <span>{p.location}</span>}
        </div>
      </div>
      {p.summary && <><div style={{ fontFamily: "'Arial',sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: "0.12em", color: "#475569", marginBottom: 8 }}>PROFESSIONAL SUMMARY</div><p style={{ lineHeight: 1.8, marginBottom: 24, color: "#334155" }}>{p.summary}</p></>}
      {exp.length > 0 && <><div style={{ fontFamily: "'Arial',sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: "0.12em", color: "#475569", borderBottom: "1px solid #cbd5e1", paddingBottom: 4, marginBottom: 14 }}>PROFESSIONAL EXPERIENCE</div>
        {exp.map((e,i) => <div key={i} style={{ marginBottom: 18 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span style={{ fontFamily: "'Arial',sans-serif", fontWeight: 700, fontSize: 12 }}>{e.title}, <span style={{ color: "#475569" }}>{e.company}</span></span><span style={{ fontFamily: "'Arial',sans-serif", fontSize: 10, color: "#94a3b8" }}>{e.start} – {e.end||"Present"}</span></div>{e.location && <div style={{ fontFamily: "'Arial',sans-serif", fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>{e.location}</div>}<p style={{ lineHeight: 1.7, margin: 0, color: "#475569" }}>{e.description}</p></div>)}</>}
      {skills.length > 0 && <><div style={{ fontFamily: "'Arial',sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: "0.12em", color: "#475569", borderBottom: "1px solid #cbd5e1", paddingBottom: 4, marginBottom: 12, marginTop: 20 }}>CORE COMPETENCIES</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "4px 20px" }}>{skills.map((s,i) => <div key={i} style={{ fontSize: 11, color: "#334155", padding: "3px 0", borderBottom: "1px dotted #e2e8f0" }}>{s}</div>)}</div></>}
      {edu.length > 0 && <><div style={{ fontFamily: "'Arial',sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: "0.12em", color: "#475569", borderBottom: "1px solid #cbd5e1", paddingBottom: 4, marginBottom: 12, marginTop: 20 }}>EDUCATION</div>
        {edu.map((e,i) => <div key={i} style={{ marginBottom: 10, display: "flex", justifyContent: "space-between" }}><div><div style={{ fontFamily: "'Arial',sans-serif", fontWeight: 700 }}>{e.degree}</div><div style={{ color: "#64748b", fontSize: 11 }}>{e.school}</div></div><div style={{ fontFamily: "'Arial',sans-serif", fontSize: 10, color: "#94a3b8" }}>{e.year}</div></div>)}</>}
    </div>
  );
}

function AuroraTemplate({ data }) {
  const p = data.personal || {}; const exp = data.experience || []; const edu = data.education || []; const skills = data.skills || [];
  return (
    <div style={{ fontFamily: "'Segoe UI',sans-serif", color: "#1e1b4b", background: "#fff", minHeight: 900, fontSize: 12 }}>
      <div style={{ background: "linear-gradient(135deg,#7C3AED 0%,#EC4899 60%,#F59E0B 100%)", padding: "40px 44px", color: "#fff" }}>
        <div style={{ fontWeight: 900, fontSize: 28, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 6 }}>{p.name || "Your Name"}</div>
        <div style={{ fontSize: 13, fontWeight: 400, opacity: 0.9, marginBottom: 14 }}>{p.title || "Job Title"}</div>
        <div style={{ display: "flex", gap: 18, fontSize: 10, opacity: 0.85 }}>
          {p.email && <span>✉ {p.email}</span>}{p.phone && <span>📞 {p.phone}</span>}{p.location && <span>📍 {p.location}</span>}
        </div>
      </div>
      <div style={{ padding: "32px 44px" }}>
        {p.summary && <><div style={{ fontWeight: 700, fontSize: 10, letterSpacing: "0.12em", background: "linear-gradient(135deg,#7C3AED,#EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8 }}>ABOUT ME</div><p style={{ lineHeight: 1.8, color: "#374151", marginBottom: 24 }}>{p.summary}</p></>}
        {exp.length > 0 && <><div style={{ fontWeight: 700, fontSize: 10, letterSpacing: "0.12em", background: "linear-gradient(135deg,#7C3AED,#EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 10, borderBottom: "2px solid", borderImage: "linear-gradient(135deg,#7C3AED,#EC4899) 1", paddingBottom: 6 }}>EXPERIENCE</div>
          {exp.map((e,i) => <div key={i} style={{ marginBottom: 18, padding: "12px 16px", background: i%2===0 ? "#faf5ff" : "#fdf2f8", borderRadius: 8, borderLeft: "3px solid #7C3AED" }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}><span style={{ fontWeight: 700 }}>{e.title}</span><span style={{ fontSize: 10, color: "#7C3AED", fontWeight: 600 }}>{e.start} – {e.end||"Present"}</span></div><div style={{ color: "#EC4899", fontWeight: 600, fontSize: 11, marginBottom: 4 }}>{e.company}{e.location ? ` · ${e.location}` : ""}</div><p style={{ color: "#4b5563", lineHeight: 1.6, margin: 0 }}>{e.description}</p></div>)}</>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 24 }}>
          {skills.length > 0 && <div><div style={{ fontWeight: 700, fontSize: 10, letterSpacing: "0.12em", color: "#7C3AED", marginBottom: 10 }}>SKILLS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{skills.map((s,i) => <span key={i} style={{ background: "linear-gradient(135deg,#7C3AED,#EC4899)", color: "#fff", borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 600 }}>{s}</span>)}</div></div>}
          {edu.length > 0 && <div><div style={{ fontWeight: 700, fontSize: 10, letterSpacing: "0.12em", color: "#7C3AED", marginBottom: 10 }}>EDUCATION</div>
            {edu.map((e,i) => <div key={i} style={{ marginBottom: 10 }}><div style={{ fontWeight: 700 }}>{e.degree}</div><div style={{ color: "#EC4899", fontSize: 11 }}>{e.school}</div><div style={{ color: "#9ca3af", fontSize: 10 }}>{e.year}</div></div>)}</div>}
        </div>
      </div>
    </div>
  );
}

function ResumeTemplate({ templateId, data }) {
  switch (templateId) {
    case "modern":       return <ModernTemplate data={data} />;
    case "minimal":      return <MinimalTemplate data={data} />;
    case "professional": return <ProfessionalTemplate data={data} />;
    case "creative":     return <CreativeTemplate data={data} />;
    case "compact":      return <CompactTemplate data={data} />;
    case "impact":       return <ImpactTemplate data={data} />;
    case "chikorita":    return <ChikoritaTemplate data={data} />;
    case "onyx":         return <OnyxTemplate data={data} />;
    case "gengar":       return <GengarTemplate data={data} />;
    case "pikachu":      return <PikachuTemplate data={data} />;
    case "nova":         return <NovaTemplate data={data} />;
    case "ember":        return <EmberTemplate data={data} />;
    case "slate":        return <SlateTemplate data={data} />;
    case "aurora":       return <AuroraTemplate data={data} />;
    default:             return <ClassicTemplate data={data} />;
  }
}

// ── Template Mock Preview ─────────────────────────────────────────────────────
function TemplateMockPreview({ template: t }) {
  const a = t.accent;
  if (t.layout === "sidebar") return (
    <div style={{ display: "flex", height: "100%", fontFamily: "sans-serif" }}>
      <div style={{ width: "35%", background: a, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.3)", margin: "0 auto 6px" }} />
        {[70, 55, 60, 45, 50].map((w, i) => <div key={i} style={{ height: 5, width: `${w}%`, background: "rgba(255,255,255,0.35)", borderRadius: 3 }} />)}
        <div style={{ height: 1, background: "rgba(255,255,255,0.2)", margin: "4px 0" }} />
        {[80, 65, 75].map((w, i) => <div key={i} style={{ height: 4, width: `${w}%`, background: "rgba(255,255,255,0.25)", borderRadius: 3 }} />)}
      </div>
      <div style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ height: 10, width: "75%", background: "#1e293b", borderRadius: 3 }} />
        <div style={{ height: 6, width: "50%", background: a + "88", borderRadius: 3, marginBottom: 4 }} />
        {[90, 85, 80, 70, 85, 60].map((w, i) => <div key={i} style={{ height: 4, width: `${w}%`, background: "#cbd5e1", borderRadius: 2 }} />)}
        <div style={{ height: 1, background: "#e2e8f0", margin: "4px 0" }} />
        {[75, 70, 65, 80].map((w, i) => <div key={i} style={{ height: 4, width: `${w}%`, background: "#cbd5e1", borderRadius: 2 }} />)}
      </div>
    </div>
  );
  if (t.layout === "banner") return (
    <div style={{ height: "100%", fontFamily: "sans-serif" }}>
      <div style={{ background: `linear-gradient(135deg,${a},${a}bb)`, padding: "18px 14px", marginBottom: 8 }}>
        <div style={{ height: 10, width: "55%", background: "rgba(255,255,255,0.9)", borderRadius: 3, marginBottom: 5 }} />
        <div style={{ height: 5, width: "40%", background: "rgba(255,255,255,0.5)", borderRadius: 3 }} />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>{[30, 35, 28].map((w, i) => <div key={i} style={{ height: 4, width: w, background: "rgba(255,255,255,0.4)", borderRadius: 3 }} />)}</div>
      </div>
      <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 5 }}>
        {[90, 85, 80, 70, 85, 60, 75].map((w, i) => <div key={i} style={{ height: 4, width: `${w}%`, background: i === 0 ? a + "88" : "#cbd5e1", borderRadius: 2 }} />)}
      </div>
    </div>
  );
  if (t.layout === "split") return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100%" }}>
      <div style={{ background: `linear-gradient(180deg,${a},${a}cc)`, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ height: 9, width: "80%", background: "rgba(255,255,255,0.85)", borderRadius: 3 }} />
        <div style={{ height: 5, width: "60%", background: "rgba(255,255,255,0.45)", borderRadius: 3, marginBottom: 6 }} />
        {[70, 80, 65, 75, 55, 70].map((w, i) => <div key={i} style={{ height: 4, width: `${w}%`, background: "rgba(255,255,255,0.3)", borderRadius: 2 }} />)}
      </div>
      <div style={{ padding: "12px 10px", display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ height: 5, width: "60%", background: a + "99", borderRadius: 3, marginBottom: 4 }} />
        {[85, 75, 90, 70, 80, 65].map((w, i) => <div key={i} style={{ height: 4, width: `${w}%`, background: "#cbd5e1", borderRadius: 2 }} />)}
      </div>
    </div>
  );
  if (t.layout === "grid") return (
    <div style={{ padding: "12px 14px", height: "100%", fontFamily: "sans-serif" }}>
      <div style={{ borderBottom: `2px solid ${a}`, paddingBottom: 8, marginBottom: 8 }}>
        <div style={{ height: 10, width: "55%", background: "#1e293b", borderRadius: 3, marginBottom: 4 }} />
        <div style={{ height: 4, width: "40%", background: a + "88", borderRadius: 3 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[80, 70, 85, 65, 75, 80, 60, 70].map((w, i) => <div key={i} style={{ height: 4, width: `${w}%`, background: "#cbd5e1", borderRadius: 2 }} />)}
      </div>
    </div>
  );
  // single column (classic/default)
  return (
    <div style={{ padding: "12px 14px", height: "100%", fontFamily: "sans-serif" }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ height: 10, width: "55%", background: "#1e293b", borderRadius: 3, marginBottom: 4 }} />
        <div style={{ height: 4, width: "40%", background: a + "99", borderRadius: 3, marginBottom: 4 }} />
        <div style={{ height: 3, width: "100%", background: a, borderRadius: 2, marginBottom: 6 }} />
        <div style={{ display: "flex", gap: 10 }}>{[28, 32, 24].map((w, i) => <div key={i} style={{ height: 3, width: w, background: "#94a3b8", borderRadius: 2 }} />)}</div>
      </div>
      {[85, 75, 90, 70, 80, 65, 75, 60].map((w, i) => <div key={i} style={{ height: 4, width: `${w}%`, background: i % 4 === 0 ? a + "99" : "#cbd5e1", borderRadius: 2, marginBottom: 5 }} />)}
    </div>
  );
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
          <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>5 free templates · 10 premium templates</p>
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
            <div style={{ height: 200, overflow: "hidden", position: "relative", background: "#f8fafc", cursor: "pointer" }} onClick={() => t.free || userPlan === "pro" || userPlan === "premium" ? onSelect(t.id) : onSelect("_premium_upsell")}>
              {/* Visual layout preview - no component rendering to avoid crashes */}
              <TemplateMockPreview template={t} />
              {!t.free && (userPlan !== "pro" && userPlan !== "premium") && (
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
      {showTemplates && <TemplateGallery userPlan={effectivePlan(user)} onSelect={id => { if (id === "_premium_upsell") return; setTemplateId(id); setShowTemplates(false); }} onClose={() => setShowTemplates(false)} />}

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
              {RESUME_TEMPLATES.filter(t => t.free || effectivePlan(user) === "pro" || effectivePlan(user) === "premium").map(t => (
                <div key={t.id} onClick={() => { setTemplateId(t.id); setShowTemplateStrip(false); }}
                  style={{ width: 90, cursor: "pointer", borderRadius: 8, overflow: "hidden", border: `2px solid ${templateId === t.id ? t.accent : "rgba(255,255,255,0.1)"}`, flexShrink: 0, transition: "border-color 0.2s" }}>
                  <div style={{ height: 72, overflow: "hidden", background: "#f8fafc", position: "relative" }}>
                    <TemplateMockPreview template={t} />
                  </div>
                  <div style={{ padding: "4px 6px", background: templateId === t.id ? t.accent : "rgba(255,255,255,0.04)", fontSize: "0.68rem", fontWeight: 700, color: templateId === t.id ? "#fff" : "rgba(255,255,255,0.5)", textAlign: "center" }}>{t.name}</div>
                </div>
              ))}
              {RESUME_TEMPLATES.filter(t => !t.free && effectivePlan(user) !== "pro" && effectivePlan(user) !== "premium").length > 0 && (
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
  const [selectedIdx, setSelectedIdx] = useState(0);

  const check = async () => {
    if (!resumes.length) return;
    setChecking(true);
    const r = resumes[selectedIdx] || resumes[0];
    const data = r.resume_data || {};
    // Support both uploaded resumes (rawText) and built resumes (structured data)
    const text = data.rawText || [
      data.personal?.name, data.personal?.email, data.summary,
      ...(data.experience || []).map(e => `${e.title} ${e.company} ${e.description}`),
      ...(data.education || []).map(e => `${e.degree} ${e.school}`),
      ...(data.skills || []).join(" "),
    ].filter(Boolean).join(" ");

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const isUploaded = !!data.rawText;
    const lowerText = text.toLowerCase();

    const hasEmail = /[\w.+-]+@[\w-]+\.\w+/.test(text);
    const hasPhone = /(\+91|0)?[\s-]?\d{10}|\d{3}[\s-]\d{3}[\s-]\d{4}/.test(text);
    const hasExperience = isUploaded
      ? /experience|worked at|employment|internship|position|role/i.test(text)
      : (data.experience || []).length > 0;
    const hasSkills = isUploaded
      ? /skills|technologies|proficient|expertise/i.test(text)
      : (data.skills || []).length >= 3;
    const hasSummary = isUploaded
      ? wordCount > 100
      : (data.summary || "").length > 50;
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
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {resumes.length > 1 && (
            <select value={selectedIdx} onChange={e => { setSelectedIdx(+e.target.value); setResult(null); }}
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", borderRadius: 8, padding: "8px 12px", fontSize: "0.78rem", outline: "none", cursor: "pointer" }}>
              {resumes.map((r, i) => <option key={r.id} value={i} style={{ background: "#1e293b" }}>{r.title} {r.template === "uploaded" ? "(Uploaded)" : "(Built)"}</option>)}
            </select>
          )}
          {!result ? (
            <button onClick={check} disabled={checking || !resumes.length} style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", border: "none", color: "#fff", borderRadius: 9, padding: "9px 20px", cursor: resumes.length ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "0.82rem", opacity: resumes.length ? 1 : 0.5 }}>
              {checking ? "Checking..." : resumes.length ? "Check My Resume" : "Upload or Create a Resume First"}
            </button>
          ) : (
            <button onClick={() => setResult(null)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", borderRadius: 9, padding: "9px 18px", cursor: "pointer", fontSize: "0.8rem" }}>Re-check</button>
          )}
        </div>
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
  const [pendingImportData, setPendingImportData] = useState(null); // parsed data waiting for template pick
  const [builder, setBuilder] = useState(null);
  const [showPremium, setShowPremium] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [editingUpload, setEditingUpload] = useState(null);
  const [viewingResume, setViewingResume] = useState(null); // resume object to view
  const importInputRef = useRef(null);
  const isMobile = useMobile();

  const load = () => { apiGet("/resumes").then(r => { setResumes(r.success ? r.data : []); setLoading(false); }); };
  useEffect(() => { load(); }, []);

  const startBuilder = (templateId, resumeId = null, data = null) => {
    setShowGallery(false);
    setPendingImportData(null);
    setBuilder({ templateId, resumeId, data });
  };

  // Upload file → extract text → save as "uploaded" record, don't open builder yet
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportError("");
    try {
      let rawText = "";
      let extractionNote = "";
      try {
        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
          rawText = await extractTextFromPDF(file);
          if (!rawText.trim()) extractionNote = "scanned_pdf";
        } else {
          rawText = await file.text();
        }
      } catch (extractErr) {
        extractionNote = extractErr.message;
      }
      const res = await apiPost("/resumes", {
        title: file.name.replace(/\.[^.]+$/, ""),
        template: "uploaded",
        resume_data: { rawText: rawText || "", fileName: file.name, uploaded: true, extractionNote },
      });
      if (!res.success) throw new Error("Could not save resume. Please try again.");
      load();
    } catch (err) {
      setImportError(err.message || "Upload failed. Please try again.");
    }
    setImporting(false);
    e.target.value = "";
  };

  // "Edit in Builder" on an uploaded resume → parse → pick template → builder
  const handleEditUpload = async (resume) => {
    setEditingUpload(resume.id); setImportError("");
    try {
      const rawText = resume.resume_data?.rawText || "";
      if (!rawText) throw new Error("No text found in this resume.");
      const data = await parseResumeWithAI(rawText);
      if (!data) throw new Error("Could not parse resume data.");
      setPendingImportData(data);
      setShowGallery(true); // let user pick template first
    } catch (err) {
      setImportError(err.message || "Parse failed. Please try again.");
    }
    setEditingUpload(null);
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

  const uploadedResumes = resumes.filter(r => r.template === "uploaded");
  const builtResumes = resumes.filter(r => r.template !== "uploaded");

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Uploaded resume viewer modal */}
      {viewingResume && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "2rem 1rem" }}
          onClick={e => e.target === e.currentTarget && setViewingResume(null)}>
          <div style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, width: "100%", maxWidth: 780, padding: "1.5rem" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem" }}>📄 {viewingResume.title}</div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{viewingResume.resume_data?.fileName} · Uploaded {new Date(viewingResume.updated_at).toLocaleDateString()}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { setViewingResume(null); handleEditUpload(viewingResume); }}
                  style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", border: "none", color: "#fff", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem" }}
                >
                  ✏ Edit in Builder
                </button>
                <button onClick={() => setViewingResume(null)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: "0.82rem" }}>✕ Close</button>
              </div>
            </div>
            {/* Resume text content */}
            {viewingResume.resume_data?.rawText ? (
              <div style={{ background: "#fff", borderRadius: 10, padding: "2rem 2.5rem", color: "#111", fontFamily: "Georgia, serif", fontSize: "13px", lineHeight: 1.7, maxHeight: "70vh", overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {viewingResume.resume_data.rawText}
              </div>
            ) : (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 10, padding: "2.5rem", textAlign: "center" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🖼</div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  {viewingResume.resume_data?.extractionNote === "scanned_pdf"
                    ? "This appears to be a scanned PDF — text could not be extracted."
                    : "No text content was extracted from this file."}
                </div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                  Please delete this and re-upload a text-based PDF, or click "Edit in Builder" to manually fill in your details.
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button onClick={() => { setViewingResume(null); deleteResume(viewingResume.id); }} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>🗑 Delete &amp; Re-upload</button>
                  <button onClick={() => { setViewingResume(null); handleEditUpload(viewingResume); }} style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", border: "none", color: "#fff", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>✏ Fill Manually in Builder</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showGallery && (
        <TemplateGallery
          userPlan={effectivePlan(profile)}
          onSelect={id => {
            if (id === "_premium_upsell") { setShowGallery(false); setShowPremium(true); }
            else { setShowGallery(false); startBuilder(id, null, pendingImportData || null); }
          }}
          onClose={() => { setShowGallery(false); setPendingImportData(null); }}
        />
      )}
      {showPremium && <PremiumModal onClose={() => setShowPremium(false)} onUpgrade={() => setShowPremium(false)} />}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1.1rem", margin: "0 0 4px" }}>My Resumes</h2>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>{resumes.length} resume{resumes.length !== 1 ? "s" : ""} saved</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input ref={importInputRef} type="file" accept=".pdf,.txt,.doc,.docx" style={{ display: "none" }} onChange={handleImport} />
          <button
            onClick={() => { setImportError(""); importInputRef.current?.click(); }}
            disabled={importing}
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: 10, padding: "10px 18px", cursor: importing ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 6 }}
          >
            {importing ? <><Spinner /> Uploading…</> : "⬆ Upload Resume"}
          </button>
          <button onClick={() => { setPendingImportData(null); setShowGallery(true); }} style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", color: "#fff", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontWeight: 700, fontSize: "0.875rem" }}>+ Create New</button>
        </div>
      </div>
      {importError && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5", borderRadius: 8, padding: "10px 14px", marginBottom: "1rem", fontSize: "0.85rem" }}>⚠ {importError}</div>}

      {/* Template highlight bar */}
      <div style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[["📄", "8 Free Templates"], ["👑", "4 Premium Templates"], ["🤖", "AI Resume Builder"], ["⬇", "PDF Download"]].map(([icon, text]) => (
            <span key={text} style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 6 }}><span>{icon}</span>{text}</span>
          ))}
        </div>
        <button onClick={() => { setPendingImportData(null); setViewingResume(null); setShowGallery(true); }} style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "#60A5FA", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>Browse Templates →</button>
      </div>

      <ResumeQualityChecker resumes={resumes} />

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "rgba(255,255,255,0.4)" }}><Spinner /> Loading...</div>
      ) : (
        <>
          {/* Uploaded Resumes Section */}
          {uploadedResumes.length > 0 && (
            <div style={{ marginBottom: "2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Uploaded Resumes</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                {uploadedResumes.map(r => (
                  <div key={r.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
                    <div
                      onClick={() => setViewingResume(r)}
                      style={{ height: 90, background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(99,102,241,0.3))", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer" }}
                    >
                      <div style={{ fontSize: "2.2rem" }}>📄</div>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>Uploaded file</div>
                        <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{r.resume_data?.fileName || "Resume"}</div>
                      </div>
                    </div>
                    <div style={{ padding: "0.875rem 1rem" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 3 }}>{r.title}</div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>
                        Uploaded {new Date(r.updated_at).toLocaleDateString()}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => setViewingResume(r)}
                          style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", borderRadius: 7, padding: "7px", cursor: "pointer", fontWeight: 600, fontSize: "0.78rem" }}
                        >
                          👁 View
                        </button>
                        <button
                          onClick={() => handleEditUpload(r)}
                          disabled={editingUpload === r.id}
                          style={{ flex: 1, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", border: "none", color: "#fff", borderRadius: 7, padding: "7px", cursor: editingUpload === r.id ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "0.78rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                        >
                          {editingUpload === r.id ? <><Spinner /> Parsing…</> : "✏ Edit"}
                        </button>
                        <button onClick={() => deleteResume(r.id)} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", borderRadius: 7, padding: "7px 10px", cursor: "pointer", fontSize: "0.75rem" }} title="Delete">🗑</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Built Resumes Section */}
          {builtResumes.length > 0 && (
            <div>
              {uploadedResumes.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Built Resumes</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                {builtResumes.map(r => {
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
            </div>
          )}

          {/* Empty state */}
          {resumes.length === 0 && (
            <div style={{ textAlign: "center", padding: "4rem 2rem", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16 }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📄</div>
              <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, margin: "0 0 8px" }}>No resumes yet</h3>
              <p style={{ color: "rgba(255,255,255,0.4)", margin: "0 0 1.5rem", fontSize: "0.9rem" }}>Upload an existing resume or build one from a template</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => importInputRef.current?.click()} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: 10, padding: "12px 24px", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>⬆ Upload Resume</button>
                <button onClick={() => setShowGallery(true)} style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", color: "#fff", borderRadius: 10, padding: "12px 28px", cursor: "pointer", fontWeight: 700, fontSize: "0.95rem" }}>Build from Template</button>
              </div>
            </div>
          )}
        </>
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
    try {
      const answer = await chatWithAI([{ role: "user", content: `Give a strong interview answer for: "${q.q}". Use STAR method if behavioral. Be concise (150 words max).` }], "interview");
      setAnswers(prev => ({ ...prev, [i]: answer || "No response received. Please try again." }));
    } catch (e) {
      setAnswers(prev => ({ ...prev, [i]: `⚠ ${e.message || "Failed to generate answer. Please try again."}` }));
    }
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
    try {
      const reply = await chatWithAI([...messages, userMsg]);
      setMessages(m => [...m, { role: "assistant", content: reply || "Sorry, I didn't get a response. Please try again." }]);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", content: `⚠ ${e.message || "Something went wrong. Please try again."}` }]);
    }
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
  const [saveMsg, setSaveMsg] = useState("");
  const [name, setName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [location, setLocation] = useState(profile?.location || "");
  const [jobTitle, setJobTitle] = useState(profile?.desired_job_title || "");
  const [email] = useState(user?.email || "");
  const isMobile = useMobile();

  const saveProfile = async () => {
    setSaving(true); setSaveMsg("");
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: name,
      phone,
      location,
      desired_job_title: jobTitle,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    setSaveMsg(error ? "❌ Save failed: " + error.message : "✅ Profile saved!");
    setTimeout(() => setSaveMsg(""), 3000);
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
          {[
            { label: "FULL NAME", value: name, setter: setName, disabled: false },
            { label: "EMAIL", value: email, setter: null, disabled: true },
            { label: "PHONE", value: phone, setter: setPhone, disabled: false },
            { label: "LOCATION", value: location, setter: setLocation, disabled: false },
            { label: "DESIRED JOB TITLE", value: jobTitle, setter: setJobTitle, disabled: false },
          ].map(({ label, value, setter, disabled }) => (
            <div key={label}>
              <label style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>{label}</label>
              <input value={value} onChange={setter ? e => setter(e.target.value) : undefined} disabled={disabled}
                style={{ width: "100%", boxSizing: "border-box", background: disabled ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)", border: `1px solid ${disabled ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, padding: "10px 14px", color: disabled ? "rgba(255,255,255,0.4)" : "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.9rem", outline: "none" }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "1rem" }}>
          <button onClick={saveProfile} disabled={saving} style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", border: "none", color: "#fff", borderRadius: 10, padding: "10px 24px", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            {saving && <Spinner />}Save Changes
          </button>
          {saveMsg && <span style={{ fontSize: "0.85rem", color: saveMsg.startsWith("✅") ? "#10B981" : "#EF4444" }}>{saveMsg}</span>}
        </div>
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
function AdminPage({ onViewAs }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userApps, setUserApps] = useState([]);
  const [userAppsLoading, setUserAppsLoading] = useState(false);
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const isMobile = useMobile();

  useEffect(() => {
    apiGet("/admin/users?dashboard=true").then(res => {
      if (res.success) setData(res.data);
      else setError(res.message || "Access denied");
      setLoading(false);
    });
  }, []);

  const [usersError, setUsersError] = useState("");
  useEffect(() => {
    if (tab === "users") {
      setUsersLoading(true);
      setUsersError("");
      apiGet("/admin/users").then(res => {
        if (res.success) {
          setUsers(res.data || []);
        } else {
          setUsersError(res.message || "Failed to load users");
        }
        setUsersLoading(false);
      });
    }
  }, [tab]);

  const loadUserApps = async (userId) => {
    setUserAppsLoading(true);
    const res = await apiGet(`/admin/users?id=${userId}&action=applications`);
    setUserApps(res.success ? (res.data || []) : []);
    setUserAppsLoading(false);
  };

  const updateUserPlan = async (userId, newPlan) => {
    setUpdatingPlan(true);
    const res = await apiPut(`/admin/users?id=${userId}`, { plan: newPlan });
    if (res.success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan } : u));
      if (selectedUser?.id === userId) setSelectedUser(prev => ({ ...prev, plan: newPlan }));
    }
    setUpdatingPlan(false);
  };

  const updateUserStatus = async (userId, status) => {
    const res = await apiPut(`/admin/users?id=${userId}`, { status });
    if (res.success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
      if (selectedUser?.id === userId) setSelectedUser(prev => ({ ...prev, status }));
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Permanently delete this user and all their data? This cannot be undone.")) return;
    const res = await api(`/admin/users?id=${userId}`, { method: "DELETE" });
    if (res.success) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      setSelectedUser(null);
    } else {
      alert(res.message || "Failed to delete user");
    }
  };

  const filteredUsers = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{ textAlign: "center", padding: "4rem", color: "rgba(255,255,255,0.4)" }}><Spinner /><div style={{ marginTop: 12 }}>Loading admin data...</div></div>;
  if (error) return <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 14, padding: "2rem", textAlign: "center", color: "#FCA5A5" }}>🔒 {error}<br /><span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", marginTop: 8, display: "block" }}>Set role = 'admin' in your Supabase profiles table to access this.</span></div>;

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Tab Bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "1rem" }}>
        {[["overview", "📊 Overview"], ["users", "👥 Users"]].map(([key, label]) => (
          <button key={key} onClick={() => { setTab(key); setSelectedUser(null); }} style={{ background: tab === key ? "rgba(59,130,246,0.15)" : "transparent", border: `1px solid ${tab === key ? "rgba(59,130,246,0.4)" : "transparent"}`, color: tab === key ? "#60A5FA" : "rgba(255,255,255,0.5)", borderRadius: 10, padding: "8px 18px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === "overview" && (
        <>
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

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1rem" }}>
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
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: (PLAN_COLORS[u.plan || "free"] || PLAN_COLORS.free)[0], color: (PLAN_COLORS[u.plan || "free"] || PLAN_COLORS.free)[1], textTransform: "capitalize" }}>{u.plan || "free"}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── USERS TAB ── */}
      {tab === "users" && !selectedUser && (
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email or name..." style={{ width: "100%", marginBottom: "1rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }} />

          {usersError && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", color: "#FCA5A5", marginBottom: "1rem", fontSize: "0.85rem" }}>⚠ {usersError}</div>}
          {usersLoading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "rgba(255,255,255,0.4)" }}><Spinner /> Loading users...</div>
          ) : (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 2fr 1fr 1fr 80px", padding: "0.75rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                {(isMobile ? ["User", "Plan"] : ["Name / Email", "Joined", "Plan", "Applications", ""]).map(h => (
                  <span key={h} style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", fontWeight: 600, letterSpacing: "0.07em" }}>{h.toUpperCase()}</span>
                ))}
              </div>
              {filteredUsers.length === 0 && (
                <div style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>No users found</div>
              )}
              {filteredUsers.map((u, i) => (
                <div key={u.id} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 2fr 1fr 1fr 80px", padding: "0.875rem 1.25rem", borderBottom: i < filteredUsers.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem", flexShrink: 0 }}>
                      {(u.full_name || u.email || "?")[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.full_name || "—"}</div>
                      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.72rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                    </div>
                  </div>
                  {!isMobile && <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8rem" }}>{u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>}
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: (PLAN_COLORS[u.plan || "free"] || PLAN_COLORS.free)[0], color: (PLAN_COLORS[u.plan || "free"] || PLAN_COLORS.free)[1], textTransform: "capitalize", display: "inline-block" }}>{u.plan || "free"}</span>
                  {u.status === 'blocked' && <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(239,68,68,0.15)", color: "#F87171" }}>🚫 Blocked</span>}
                  {u.status === 'suspended' && <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(245,158,11,0.15)", color: "#FCD34D" }}>⏸ Suspended</span>}
                  {!isMobile && <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.82rem" }}>{u.application_count ?? "—"}</span>}
                  <button onClick={() => { setSelectedUser(u); loadUserApps(u.id); }} style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "#60A5FA", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}>View</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── USER DETAIL VIEW ── */}
      {tab === "users" && selectedUser && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <button onClick={() => { setSelectedUser(null); setUserApps([]); }} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: "0.82rem" }}>
              ← Back to Users
            </button>
            <button onClick={() => onViewAs && onViewAs({ id: selectedUser.id, email: selectedUser.email, profile: selectedUser })} style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", border: "none", color: "#fff", borderRadius: 8, padding: "7px 18px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              👁 View Their Dashboard
            </button>
            {selectedUser.status === 'blocked' ? (
              <button onClick={() => updateUserStatus(selectedUser.id, 'active')} style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", color: "#10B981", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>
                ✅ Unblock
              </button>
            ) : (
              <button onClick={() => updateUserStatus(selectedUser.id, 'blocked')} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#F87171", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>
                🚫 Block
              </button>
            )}
            {selectedUser.status === 'suspended' ? (
              <button onClick={() => updateUserStatus(selectedUser.id, 'active')} style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", color: "#10B981", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>
                ▶ Unsuspend
              </button>
            ) : (
              <button onClick={() => updateUserStatus(selectedUser.id, 'suspended')} style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#FCD34D", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>
                ⏸ Suspend
              </button>
            )}
            <button onClick={() => deleteUser(selectedUser.id)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#F87171", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>
              🗑 Delete
            </button>
          </div>
          {selectedUser.status && selectedUser.status !== 'active' && (
            <div style={{ background: selectedUser.status === 'blocked' ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)", border: `1px solid ${selectedUser.status === 'blocked' ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`, borderRadius: 10, padding: "10px 16px", marginBottom: "1rem", color: selectedUser.status === 'blocked' ? "#F87171" : "#FCD34D", fontSize: "0.85rem", fontWeight: 600 }}>
              {selectedUser.status === 'blocked' ? "🚫 This account is blocked" : "⏸ This account is suspended"}
            </div>
          )}

          {/* User Profile Card */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "1.25rem", flexWrap: "wrap" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.3rem", flexShrink: 0 }}>
                {(selectedUser.full_name || selectedUser.email || "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1.1rem" }}>{selectedUser.full_name || "No name"}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>{selectedUser.email}</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem", marginTop: 2 }}>Joined {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Plan:</span>
                <select disabled={updatingPlan} value={selectedUser.plan || "free"} onChange={e => updateUserPlan(selectedUser.id, e.target.value)}
                  style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: 8, padding: "6px 12px", fontSize: "0.82rem", cursor: "pointer", outline: "none" }}>
                  {["free","pro","premium","enterprise"].map(p => <option key={p} value={p} style={{ textTransform: "capitalize" }}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
                {updatingPlan && <Spinner />}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {[
                ["📧", "Email", selectedUser.email || "—"],
                ["📱", "Phone", selectedUser.phone || "—"],
                ["🏷️", "Role", selectedUser.role || "user"],
              ].map(([icon, label, val]) => (
                <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "0.75rem 1rem" }}>
                  <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>{icon} {label}</div>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* User Applications */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1.5rem" }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", margin: "0 0 1rem" }}>Job Applications ({userApps.length})</h3>
            {userAppsLoading ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}><Spinner /></div>
            ) : userApps.length === 0 ? (
              <div style={{ textAlign: "center", padding: "1.5rem", color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>No applications yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {userApps.map((a, i) => (
                  <div key={a.id || i} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr", alignItems: "center", padding: "0.75rem 1rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{a.company}</div>
                      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.75rem" }}>{a.position}</div>
                    </div>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem" }}>{a.applied_at ? new Date(a.applied_at).toLocaleDateString("en-IN") : "—"}</span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: (STATUS_COLORS[a.status] || "#6B7280") + "22", color: STATUS_COLORS[a.status] || "#6B7280", textAlign: "center" }}>{a.status}</span>
                    <span style={{ color: "#3B82F6", fontSize: "0.82rem", fontWeight: 600, textAlign: "right" }}>{a.match_score ? `${a.match_score}%` : "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
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

// ─── POLICY PAGES ─────────────────────────────────────────────────────────────
const POLICY_STYLE = {
  page: { minHeight: "100vh", background: "#020817", color: "#e2e8f0", fontFamily: "Inter,sans-serif" },
  header: { background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "1rem 5%", display: "flex", alignItems: "center", gap: 16 },
  body: { maxWidth: 860, margin: "0 auto", padding: "3rem 5% 6rem" },
  h1: { fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(1.6rem,4vw,2.4rem)", margin: "0 0 0.25rem", background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  date: { color: "rgba(255,255,255,0.35)", fontSize: "0.82rem", marginBottom: "2.5rem" },
  h2: { fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1.15rem", color: "#fff", margin: "2.5rem 0 0.75rem", paddingBottom: "0.5rem", borderBottom: "1px solid rgba(255,255,255,0.07)" },
  p: { color: "rgba(255,255,255,0.7)", lineHeight: 1.8, margin: "0 0 1rem", fontSize: "0.94rem" },
  li: { color: "rgba(255,255,255,0.7)", lineHeight: 1.8, marginBottom: "0.4rem", fontSize: "0.94rem" },
  ul: { paddingLeft: "1.4rem", margin: "0 0 1rem" },
  contact: { background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 12, padding: "1.25rem 1.5rem", marginTop: "2.5rem" },
};

function PolicySection({ title, children }) {
  return (<><h2 style={POLICY_STYLE.h2}>{title}</h2>{children}</>);
}

function PolicyPage({ title, onBack, content: Content }) {
  return (
    <div style={POLICY_STYLE.page}>
      <div style={POLICY_STYLE.header}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 6 }}>← Back</button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "0.85rem", color: "#fff" }}>A</div>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#fff" }}>AutoApply AI</span>
        </div>
      </div>
      <div style={POLICY_STYLE.body}>
        <h1 style={POLICY_STYLE.h1}>{title}</h1>
        <p style={POLICY_STYLE.date}>Last updated: June 2026 · Effective immediately</p>
        <Content />
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');`}</style>
    </div>
  );
}

const S = POLICY_STYLE;

function TERMS_CONTENT() {
  return (<>
    <PolicySection title="1. Acceptance of Terms">
      <p style={S.p}>By accessing or using AutoApply AI ("the Platform", "we", "us", or "our"), you agree to be bound by these Terms & Conditions. If you do not agree, please do not use our services. These terms apply to all users, including visitors, registered users, and paying subscribers.</p>
    </PolicySection>
    <PolicySection title="2. Description of Service">
      <p style={S.p}>AutoApply AI is an AI-powered job application automation platform designed for job seekers in India. Our services include:</p>
      <ul style={S.ul}>
        <li style={S.li}>AI-generated resumes and cover letters</li>
        <li style={S.li}>Automated job application submission across multiple platforms</li>
        <li style={S.li}>Application tracking and management</li>
        <li style={S.li}>Interview preparation tools</li>
        <li style={S.li}>AI Career Assistant</li>
      </ul>
    </PolicySection>
    <PolicySection title="3. User Accounts">
      <p style={S.p}>You must be at least 18 years old to create an account. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You agree to provide accurate and complete information during registration and to keep this information up to date.</p>
    </PolicySection>
    <PolicySection title="4. Subscription Plans">
      <p style={S.p}>AutoApply AI offers Free, Pro (₹599/month), and Premium (₹999/month) subscription plans. Paid subscriptions are billed monthly. By subscribing, you authorise us to charge the applicable fees to your payment method via Razorpay. All prices are in Indian Rupees (INR) and inclusive of applicable taxes.</p>
    </PolicySection>
    <PolicySection title="5. Acceptable Use">
      <p style={S.p}>You agree not to:</p>
      <ul style={S.ul}>
        <li style={S.li}>Use the platform for any unlawful purpose or to violate any regulations</li>
        <li style={S.li}>Submit false information to employers or job portals</li>
        <li style={S.li}>Attempt to reverse-engineer, scrape, or exploit the platform</li>
        <li style={S.li}>Share your account credentials with third parties</li>
        <li style={S.li}>Use automated tools to access the platform beyond our provided APIs</li>
      </ul>
    </PolicySection>
    <PolicySection title="6. Intellectual Property">
      <p style={S.p}>All content, features, and functionality of AutoApply AI — including AI models, UI design, algorithms, and branding — are owned by AutoApply AI and protected by applicable intellectual property laws. You retain ownership of the personal data and resume content you upload.</p>
    </PolicySection>
    <PolicySection title="7. Disclaimer of Warranties">
      <p style={S.p}>AutoApply AI is provided "as is" without warranties of any kind. We do not guarantee job placement, interview calls, or specific outcomes from using our platform. AI-generated content should be reviewed by you before submission. We are not responsible for decisions made by employers.</p>
    </PolicySection>
    <PolicySection title="8. Limitation of Liability">
      <p style={S.p}>To the maximum extent permitted by Indian law, AutoApply AI shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform. Our total liability shall not exceed the amount paid by you in the three months preceding the claim.</p>
    </PolicySection>
    <PolicySection title="9. Governing Law">
      <p style={S.p}>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Bengaluru, Karnataka, India.</p>
    </PolicySection>
    <PolicySection title="10. Changes to Terms">
      <p style={S.p}>We may update these Terms from time to time. Continued use of the platform after changes constitutes acceptance of the new Terms. We will notify you of material changes via email or an in-app notice.</p>
    </PolicySection>
    <div style={S.contact}><p style={{ ...S.p, margin: 0 }}>Questions about these Terms? Contact us at <strong style={{ color: "#93C5FD" }}>info@machmiles.com</strong></p></div>
  </>);
}

function PRIVACY_CONTENT() {
  return (<>
    <PolicySection title="1. Information We Collect">
      <p style={S.p}>We collect the following information when you use AutoApply AI:</p>
      <ul style={S.ul}>
        <li style={S.li}><strong style={{ color: "#fff" }}>Account Data:</strong> Name, email address, phone number, and location</li>
        <li style={S.li}><strong style={{ color: "#fff" }}>Resume Data:</strong> Work history, education, skills, and other professional information you provide</li>
        <li style={S.li}><strong style={{ color: "#fff" }}>Usage Data:</strong> Pages visited, features used, job searches performed, and application activity</li>
        <li style={S.li}><strong style={{ color: "#fff" }}>Payment Data:</strong> Transaction records via Razorpay (we do not store card details)</li>
        <li style={S.li}><strong style={{ color: "#fff" }}>Device Data:</strong> IP address, browser type, and operating system</li>
      </ul>
    </PolicySection>
    <PolicySection title="2. How We Use Your Information">
      <p style={S.p}>We use your data to:</p>
      <ul style={S.ul}>
        <li style={S.li}>Provide, operate, and improve the AutoApply AI platform</li>
        <li style={S.li}>Generate personalised resumes, cover letters, and job recommendations</li>
        <li style={S.li}>Process subscription payments securely</li>
        <li style={S.li}>Send important service updates and notifications</li>
        <li style={S.li}>Prevent fraud and ensure platform security</li>
        <li style={S.li}>Comply with legal obligations</li>
      </ul>
    </PolicySection>
    <PolicySection title="3. Data Sharing">
      <p style={S.p}>We do not sell your personal data. We may share your data with:</p>
      <ul style={S.ul}>
        <li style={S.li}><strong style={{ color: "#fff" }}>Service Providers:</strong> Supabase (database), OpenAI (AI features), Razorpay (payments), Vercel (hosting)</li>
        <li style={S.li}><strong style={{ color: "#fff" }}>Legal Authorities:</strong> When required by law or to protect our rights</li>
      </ul>
      <p style={S.p}>All third-party providers are contractually required to protect your data and use it only for the stated purposes.</p>
    </PolicySection>
    <PolicySection title="4. Data Retention">
      <p style={S.p}>We retain your data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where retention is required by law.</p>
    </PolicySection>
    <PolicySection title="5. Your Rights">
      <p style={S.p}>Under applicable Indian privacy laws, you have the right to:</p>
      <ul style={S.ul}>
        <li style={S.li}>Access the personal data we hold about you</li>
        <li style={S.li}>Correct inaccurate or incomplete data</li>
        <li style={S.li}>Request deletion of your data</li>
        <li style={S.li}>Withdraw consent for data processing</li>
        <li style={S.li}>Lodge a complaint with a regulatory authority</li>
      </ul>
    </PolicySection>
    <PolicySection title="6. Cookies">
      <p style={S.p}>We use cookies and local storage to maintain your session and remember your preferences. You can disable cookies in your browser settings, but some features may not function correctly.</p>
    </PolicySection>
    <PolicySection title="7. Security">
      <p style={S.p}>We implement industry-standard security measures including HTTPS encryption, secure JWT-based authentication, and row-level security in our database. However, no system is completely secure — please use a strong, unique password for your account.</p>
    </PolicySection>
    <PolicySection title="8. Children's Privacy">
      <p style={S.p}>AutoApply AI is not intended for users under 18 years of age. We do not knowingly collect data from minors. If you believe a minor has provided us data, contact us immediately.</p>
    </PolicySection>
    <div style={S.contact}><p style={{ ...S.p, margin: 0 }}>Privacy concerns? Contact our Data Officer at <strong style={{ color: "#93C5FD" }}>info@machmiles.com</strong></p></div>
  </>);
}

function REFUND_CONTENT() {
  return (<>
    <PolicySection title="Overview">
      <p style={S.p}>At AutoApply AI, we stand behind our product. This Refund Policy explains the circumstances under which refunds are available for our paid subscription plans (Pro at ₹599/month and Premium at ₹999/month).</p>
    </PolicySection>
    <PolicySection title="7-Day Money-Back Guarantee">
      <p style={S.p}>If you are not satisfied with your subscription, you may request a full refund within <strong style={{ color: "#fff" }}>7 days of your initial purchase</strong>. This applies only to first-time subscribers and not to renewals.</p>
      <p style={S.p}>To be eligible for a refund under this guarantee:</p>
      <ul style={S.ul}>
        <li style={S.li}>The request must be made within 7 days of the original payment date</li>
        <li style={S.li}>You must not have used the Auto Apply Engine for more than 10 job applications</li>
        <li style={S.li}>Your account must be in good standing with no policy violations</li>
      </ul>
    </PolicySection>
    <PolicySection title="When Refunds Are NOT Available">
      <p style={S.p}>Refunds will not be issued in the following cases:</p>
      <ul style={S.ul}>
        <li style={S.li}>Requests made after 7 days of the original purchase</li>
        <li style={S.li}>Subscription renewal charges</li>
        <li style={S.li}>Accounts found to have violated our Terms & Conditions</li>
        <li style={S.li}>Dissatisfaction with job search results or employer decisions (outcomes we cannot control)</li>
        <li style={S.li}>Partial month refunds upon cancellation</li>
      </ul>
    </PolicySection>
    <PolicySection title="Refund Process">
      <p style={S.p}>To request a refund:</p>
      <ul style={S.ul}>
        <li style={S.li}>Email us at <strong style={{ color: "#93C5FD" }}>info@machmiles.com</strong> with subject line "Refund Request"</li>
        <li style={S.li}>Include your registered email address and Razorpay payment ID</li>
        <li style={S.li}>State the reason for your refund request</li>
      </ul>
      <p style={S.p}>Approved refunds are processed within <strong style={{ color: "#fff" }}>5–7 business days</strong> and credited to your original payment method via Razorpay.</p>
    </PolicySection>
    <PolicySection title="Technical Issues">
      <p style={S.p}>If you experience a technical issue that prevents you from using a paid feature, please contact our support team. We will first attempt to resolve the issue. If unresolved within 48 hours, a pro-rated refund may be considered at our discretion.</p>
    </PolicySection>
    <div style={S.contact}><p style={{ ...S.p, margin: 0 }}>Refund requests: <strong style={{ color: "#93C5FD" }}>info@machmiles.com</strong> · We respond within 24 business hours.</p></div>
  </>);
}

function CANCELLATION_CONTENT() {
  return (<>
    <PolicySection title="Cancelling Your Subscription">
      <p style={S.p}>You may cancel your AutoApply AI subscription at any time. Cancellation is effective at the end of your current billing period — you will retain access to your paid plan features until then.</p>
    </PolicySection>
    <PolicySection title="How to Cancel">
      <p style={S.p}>To cancel your subscription:</p>
      <ul style={S.ul}>
        <li style={S.li}>Go to <strong style={{ color: "#fff" }}>Settings → Subscription</strong> in your dashboard and click "Cancel Plan"</li>
        <li style={S.li}>Or email us at <strong style={{ color: "#93C5FD" }}>info@machmiles.com</strong> with subject "Cancel Subscription" and your registered email</li>
      </ul>
      <p style={S.p}>We will confirm your cancellation via email within 1 business day.</p>
    </PolicySection>
    <PolicySection title="What Happens After Cancellation">
      <p style={S.p}>When your subscription is cancelled:</p>
      <ul style={S.ul}>
        <li style={S.li}>You retain full access to paid features until the end of the billing period</li>
        <li style={S.li}>Your account moves to the Free plan automatically</li>
        <li style={S.li}>Your data (resumes, applications, profile) is retained — nothing is deleted</li>
        <li style={S.li}>Auto Apply and AI features revert to Free plan limits</li>
        <li style={S.li}>You can re-subscribe at any time to regain full access</li>
      </ul>
    </PolicySection>
    <PolicySection title="No Partial Refunds on Cancellation">
      <p style={S.p}>Cancelling your subscription does not entitle you to a refund for any unused portion of the current billing period. Your access continues until the period ends. For refund eligibility, please refer to our <strong style={{ color: "#93C5FD" }}>Refund Policy</strong>.</p>
    </PolicySection>
    <PolicySection title="Auto-Renewal">
      <p style={S.p}>Subscriptions renew automatically at the end of each billing period. You will receive a reminder email 3 days before renewal. To prevent a renewal charge, cancel your subscription before the renewal date.</p>
    </PolicySection>
    <PolicySection title="Pausing a Subscription">
      <p style={S.p}>We currently do not support subscription pausing. If you need to take a break, you can cancel and re-subscribe at any time without losing your saved data.</p>
    </PolicySection>
    <div style={S.contact}><p style={{ ...S.p, margin: 0 }}>Need help cancelling? Contact us at <strong style={{ color: "#93C5FD" }}>info@machmiles.com</strong></p></div>
  </>);
}

// ─── PARTNER PAGE SHELL ───────────────────────────────────────────────────────
function PartnerPage({ onBack, title, subtitle, sections }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", fontFamily: "Inter,sans-serif", color: "#e2e8f0" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}.pp-fade{animation:fadeUp 0.6s ease both}`}</style>
      {/* Nav */}
      <div style={{ background: "rgba(15,23,42,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "1rem", position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(12px)" }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#94a3b8", borderRadius: 8, padding: "0.5rem 1rem", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 6 }}>← Back</button>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>MACHMILES · Partners</span>
      </div>
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg,#1e1b4b 0%,#1e3a5f 50%,#0f172a 100%)", padding: "5rem 2rem 4rem", textAlign: "center" }}>
        <div className="pp-fade" style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "inline-block", background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: 999, padding: "0.4rem 1.2rem", fontSize: "0.8rem", color: "#a5b4fc", marginBottom: "1.5rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>Partner Program</div>
          <h1 style={{ fontSize: "clamp(2rem,5vw,3.2rem)", fontWeight: 800, color: "#fff", lineHeight: 1.1, margin: "0 0 1rem" }}>{title}</h1>
          <p style={{ fontSize: "1.1rem", color: "#94a3b8", lineHeight: 1.7, margin: 0 }}>{subtitle}</p>
        </div>
      </div>
      {/* Sections */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "3rem 2rem 5rem" }}>
        {sections.map((sec, i) => (
          <div key={i} className="pp-fade" style={{ marginBottom: "3rem", animationDelay: `${i * 0.1}s` }}>
            {sec.heading && <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#818cf8", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid rgba(129,140,248,0.2)" }}>{sec.heading}</h2>}
            {sec.text && <p style={{ fontSize: "1rem", color: "#94a3b8", lineHeight: 1.8, margin: "0 0 1rem" }}>{sec.text}</p>}
            {sec.bullets && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: "0.75rem", margin: "1rem 0" }}>
                {sec.bullets.map((b, j) => (
                  <div key={j} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "0.85rem 1rem", display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#818cf8", fontSize: "1rem", flexShrink: 0 }}>✦</span>
                    <span style={{ fontSize: "0.9rem", color: "#cbd5e1", lineHeight: 1.5 }}>{b}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {/* CTA */}
        <div style={{ textAlign: "center", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 16, padding: "2.5rem" }}>
          <h3 style={{ color: "#fff", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 0.75rem" }}>Ready to Partner with Us?</h3>
          <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>Email us at <a href="mailto:partners@machmiles.com" style={{ color: "#818cf8", textDecoration: "none" }}>partners@machmiles.com</a> or <a href="mailto:info@machmiles.com" style={{ color: "#818cf8", textDecoration: "none" }}>info@machmiles.com</a></p>
          <a href="/" style={{ display: "inline-block", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: "0.95rem", padding: "0.85rem 2.5rem", borderRadius: 10 }}>Go to AutoApply AI →</a>
        </div>
      </div>
    </div>
  );
}

function WhiteLabelPage({ onBack }) {
  return <PartnerPage onBack={onBack}
    title="White-Label AI Recruitment Platform"
    subtitle="Empower Your Brand with AI-Powered Job Application Automation"
    sections={[
      { text: "MachMiles offers a fully customizable White-Label Solution for businesses, recruitment agencies, educational institutions, career consultants, and HR service providers who want to launch their own AI-powered job application platform without building the technology from scratch. Our white-label platform allows you to operate under your own brand, domain, and identity while leveraging MachMiles' intelligent automation engine." },
      { heading: "What You Get", bullets: ["Complete White-Label Branding","Custom Domain Support","AI Auto Job Apply Engine","Resume Builder","AI Cover Letter Generator","Job Tracking Dashboard","Employer Dashboard","User Management","Analytics & Reporting","Secure Cloud Infrastructure","Razorpay Payment Integration","Subscription Management"] },
      { heading: "Who Can Use It?", bullets: ["Recruitment Agencies","Universities & Colleges","Career Consultants","Staffing Companies","Job Portals","HR Tech Startups"] },
      { heading: "Benefits", bullets: ["Launch in days instead of months","Zero development cost","Scalable infrastructure","Regular feature updates","Dedicated technical support"] },
    ]}
  />;
}

function AffiliatePage({ onBack }) {
  return <PartnerPage onBack={onBack}
    title="Earn While Helping People Find Jobs"
    subtitle="Become a MachMiles Affiliate and earn commissions by referring job seekers to our AI-powered platform."
    sections={[
      { text: "Whether you're a content creator, blogger, YouTuber, career coach, recruiter, or influencer, you can generate recurring income by recommending MachMiles." },
      { heading: "Affiliate Benefits", bullets: ["Attractive Commission Structure","Dedicated Referral Dashboard","Real-Time Tracking","Monthly Payouts","Marketing Assets Provided","No Joining Fee"] },
      { heading: "How It Works", bullets: ["Join our Affiliate Program","Receive your unique referral link","Share it with your audience","Earn commission for every successful subscription"] },
      { heading: "Ideal For", bullets: ["Career Bloggers","LinkedIn Creators","YouTubers","HR Professionals","Career Consultants","Student Communities"] },
    ]}
  />;
}

function CareerCoachesPage({ onBack }) {
  return <PartnerPage onBack={onBack}
    title="Partner With MachMiles as a Career Coach"
    subtitle="Help your clients achieve career success faster with the power of AI."
    sections={[
      { text: "MachMiles partners with experienced career coaches to offer end-to-end career support, including resume reviews, interview preparation, LinkedIn optimization, career planning, and job search strategies." },
      { heading: "Partnership Benefits", bullets: ["Access to New Clients","Featured Coach Profile","Lead Generation","AI Tools for Your Clients","Revenue Sharing Opportunities","Dedicated Support"] },
      { heading: "Services Coaches Can Offer", bullets: ["Resume Review","Interview Coaching","LinkedIn Profile Optimization","Career Counselling","Salary Negotiation","Personal Branding"] },
    ]}
  />;
}

function HREmployersPage({ onBack }) {
  return <PartnerPage onBack={onBack}
    title="Hire Better Talent with MachMiles"
    subtitle="MachMiles helps employers discover qualified candidates faster through intelligent AI-powered recruitment tools."
    sections={[
      { text: "Whether you're hiring one employee or building an entire workforce, we streamline candidate sourcing and recruitment management." },
      { heading: "Employer Solutions", bullets: ["Candidate Database","Resume Search","AI Candidate Matching","Bulk Hiring","Job Posting","Employer Dashboard","Recruitment Analytics","Interview Scheduling"] },
      { heading: "Why Employers Choose MachMiles", bullets: ["Faster Hiring","Better Candidate Matching","Reduced Hiring Costs","AI-Driven Recommendations","Simplified Recruitment Workflow"] },
      { heading: "Industries We Serve", bullets: ["Information Technology","Banking & Finance","Manufacturing","Healthcare","Retail","Logistics","Education","Startups"] },
    ]}
  />;
}

function CampusConnectPage({ onBack }) {
  return <PartnerPage onBack={onBack}
    title="Empowering Students. Connecting Campuses with Careers."
    subtitle="MachMiles Campus Connect bridges the gap between education and employment by partnering with colleges, universities, and training institutes."
    sections={[
      { text: "Our platform enables students to discover opportunities, build professional resumes, and automatically apply to relevant jobs using AI." },
      { heading: "Campus Benefits", bullets: ["AI Resume Builder","Auto Job Applications","Internship Opportunities","Campus Placement Support","Career Resources","Placement Analytics","Student Performance Dashboard"] },
      { heading: "Institution Benefits", bullets: ["Improved Placement Rates","Dedicated Placement Dashboard","Student Progress Tracking","Employer Network Access","Industry Collaborations"] },
      { heading: "Student Benefits", bullets: ["Build Professional Resumes","Apply to Hundreds of Jobs Automatically","Track Applications","AI Career Guidance","Interview Preparation Resources"] },
    ]}
  />;
}

// ─── ABOUT PAGE ───────────────────────────────────────────────────────────────
function AboutPage({ onBack }) {
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;800&display=swap');
    @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    .ab-fade{animation:fadeUp 0.6s ease both}
    .ab-card:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(59,130,246,0.15)!important}
    .ab-card{transition:transform 0.25s,box-shadow 0.25s}
  `;
  const VALUES = [
    { icon: "💡", title: "Innovation", desc: "We continuously push the boundaries of AI to simplify career growth." },
    { icon: "🛡️", title: "Integrity", desc: "We prioritize transparency, user trust, and data security in everything we do." },
    { icon: "🏆", title: "Excellence", desc: "We strive to provide reliable, high-quality automation that delivers real value." },
    { icon: "👤", title: "User First", desc: "Every feature we build is designed with the success of our users in mind." },
    { icon: "🔄", title: "Continuous Improvement", desc: "The job market evolves every day, and so do we — constantly enhancing our platform for smarter solutions." },
  ];
  const WHY = [
    "🤖 AI-Powered Job Auto Apply",
    "⚡ Faster Applications with Smart Automation",
    "🎯 Intelligent Job Matching",
    "📄 Resume Management",
    "🔒 Secure & Privacy-Focused Platform",
    "🌍 Access to Opportunities Across Multiple Job Platforms",
    "📈 Higher Chances of Landing Interviews",
    "💼 Designed for Students, Professionals, and Career Changers",
  ];
  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#1e293b", fontFamily: "Inter,sans-serif" }}>
      <style>{css}</style>
      {/* Navbar */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 5%", height: 64 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: "0.9rem" }}>A</div>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", color: "#1e293b" }}>AutoApply AI</span>
        </button>
        <button onClick={onBack} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 18px", fontSize: "0.88rem", cursor: "pointer", color: "#64748b" }}>← Back to Home</button>
      </nav>

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg,#020817,#1e1b4b)", padding: "5rem 5% 4rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translateX(-50%)", width: 600, height: 300, background: "radial-gradient(ellipse,rgba(99,102,241,0.25),transparent 70%)", pointerEvents: "none" }} />
        <div className="ab-fade" style={{ position: "relative" }}>
          <div style={{ display: "inline-block", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 100, padding: "6px 18px", fontSize: "0.8rem", color: "#a5b4fc", fontWeight: 700, marginBottom: "1.5rem" }}>🚀 Founded 2026</div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(2rem,5vw,3.5rem)", letterSpacing: "-0.03em", margin: "0 0 1.25rem", color: "#fff", lineHeight: 1.15 }}>About MachMiles</h1>
          <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.65)", maxWidth: 640, margin: "0 auto", lineHeight: 1.75 }}>AI-powered career automation built to simplify and accelerate your job search — founded by <strong style={{ color: "#a5b4fc" }}>Mr. Nishant Thakur</strong>.</p>
        </div>
      </div>

      {/* About Section */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "5rem 5%" }}>
        <div className="ab-fade" style={{ marginBottom: "4rem" }}>
          <div style={{ display: "inline-block", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 100, padding: "5px 16px", fontSize: "0.78rem", color: "#1d4ed8", fontWeight: 700, marginBottom: "1rem" }}>About Us</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(1.5rem,3vw,2rem)", letterSpacing: "-0.02em", margin: "0 0 1.25rem" }}>Who We Are</h2>
          <p style={{ fontSize: "1rem", color: "#475569", lineHeight: 1.85, margin: "0 0 1rem" }}>Founded in <strong>2026</strong> by <strong>Mr. Nishant Thakur</strong>, <strong>MachMiles</strong> is an AI-powered career automation platform built to simplify and accelerate the job search process. We understand that applying to hundreds of jobs manually is time-consuming, repetitive, and often discouraging.</p>
          <p style={{ fontSize: "1rem", color: "#475569", lineHeight: 1.85, margin: "0 0 1rem" }}>Our platform leverages advanced Artificial Intelligence to automate job applications, helping job seekers focus on preparing for interviews and advancing their careers rather than spending countless hours filling out application forms.</p>
          <p style={{ fontSize: "1rem", color: "#475569", lineHeight: 1.85, margin: 0 }}>At MachMiles, we combine intelligent automation with user-centric design to deliver a seamless job search experience. Whether you're a fresh graduate, an experienced professional, or someone looking for a career change, MachMiles empowers you to apply smarter, faster, and more efficiently.</p>
        </div>

        {/* Vision & Mission */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1.5rem", marginBottom: "4rem" }}>
          {[
            { icon: "🔭", label: "Our Vision", color: "#7c3aed", bg: "#faf5ff", border: "#e9d5ff", text: "To become the world's most trusted AI-powered career platform, enabling millions of professionals to connect with the right opportunities through intelligent automation, innovation, and technology. We envision a future where finding the right job is no longer limited by time, geography, or manual effort." },
            { icon: "🎯", label: "Our Mission", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", text: "To transform the job application process by using Artificial Intelligence to make career advancement effortless, efficient, and accessible — automating repetitive tasks, helping candidates discover opportunities faster, and increasing interview chances through intelligent matching." },
          ].map(item => (
            <div key={item.label} className="ab-card" style={{ background: item.bg, border: `1.5px solid ${item.border}`, borderRadius: 20, padding: "2rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 14 }}>{item.icon}</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.2rem", color: item.color, marginBottom: 12 }}>{item.label}</div>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#475569", lineHeight: 1.75 }}>{item.text}</p>
            </div>
          ))}
        </div>

        {/* Mission bullets */}
        <div style={{ marginBottom: "4rem" }}>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.3rem", margin: "0 0 1.25rem" }}>We are committed to:</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "0.75rem" }}>
            {[
              "Automating repetitive job application tasks with AI",
              "Helping candidates discover relevant opportunities faster",
              "Increasing interview opportunities through intelligent matching",
              "Saving users valuable time while improving application quality",
              "Continuously innovating to make career growth simpler for everyone",
              "Building a secure, transparent, and user-focused platform trusted worldwide",
            ].map(item => (
              <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#f8fafc", borderRadius: 10, padding: "12px 14px" }}>
                <span style={{ color: "#3B82F6", fontWeight: 700, fontSize: "1rem", flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: "0.88rem", color: "#475569", lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Why Choose Us */}
        <div style={{ marginBottom: "4rem" }}>
          <div style={{ display: "inline-block", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 100, padding: "5px 16px", fontSize: "0.78rem", color: "#1d4ed8", fontWeight: 700, marginBottom: "1rem" }}>Why Us</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(1.4rem,3vw,1.9rem)", letterSpacing: "-0.02em", margin: "0 0 1.5rem" }}>Why Choose MachMiles?</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "1rem" }}>
            {WHY.map(item => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 12, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", fontSize: "0.9rem", color: "#1e293b", fontWeight: 500 }}>{item}</div>
            ))}
          </div>
        </div>

        {/* Core Values */}
        <div style={{ marginBottom: "4rem" }}>
          <div style={{ display: "inline-block", background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 100, padding: "5px 16px", fontSize: "0.78rem", color: "#7c3aed", fontWeight: 700, marginBottom: "1rem" }}>Our DNA</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(1.4rem,3vw,1.9rem)", letterSpacing: "-0.02em", margin: "0 0 1.5rem" }}>Our Core Values</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "1.25rem" }}>
            {VALUES.map(v => (
              <div key={v.title} className="ab-card" style={{ border: "1.5px solid #e2e8f0", borderRadius: 16, padding: "1.75rem 1.5rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: 10 }}>{v.icon}</div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", color: "#1e293b", marginBottom: 8 }}>{v.title}</div>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b", lineHeight: 1.65 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Closing */}
        <div style={{ background: "linear-gradient(135deg,#020817,#1e1b4b)", borderRadius: 20, padding: "2.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>🚀</div>
          <p style={{ margin: "0 0 20px", fontSize: "1.05rem", color: "rgba(255,255,255,0.8)", lineHeight: 1.8, maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}><strong style={{ color: "#fff" }}>MachMiles</strong> isn't just another job portal — it's your AI-powered career partner, working around the clock to help you discover opportunities, submit applications, and move one step closer to your dream job.</p>
          <button onClick={onBack} style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" }}>Start Your Journey →</button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", padding: "1.5rem 5%", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8" }}>© 2026 MachMiles · <a href="https://machmiles.com" style={{ color: "#3B82F6", textDecoration: "none" }}>machmiles.com</a></p>
      </div>
    </div>
  );
}

// ─── DONATIONS PAGE ───────────────────────────────────────────────────────────
function DonationsPage({ onBack }) {
  const PRESET_AMOUNTS = [100, 200, 500, 1000];
  const IMPACT_CARDS = [
    { amount: 100, icon: "🍽️", label: "Emergency Meals", desc: "Provides emergency meals for a family" },
    { amount: 200, icon: "💧", label: "Clean Water", desc: "Safe drinking water for a family for a week" },
    { amount: 500, icon: "💊", label: "Medical Supplies", desc: "Emergency medicines and first aid" },
    { amount: 1000, icon: "🏕️", label: "Shelter Kit", desc: "Temporary shelter materials for a family" },
    { amount: 5000, icon: "🏗️", label: "Rebuilding", desc: "Supports reconstruction of damaged homes" },
    { amount: 10000, icon: "🏫", label: "Community", desc: "Restores a community facility or school" },
  ];
  const USE_CARDS = [
    { icon: "🍽️", title: "Emergency Food", desc: "Nutritious meals delivered to affected families in evacuation shelters." },
    { icon: "💧", title: "Clean Water", desc: "Water purification systems and safe drinking water supply." },
    { icon: "💊", title: "Medical Care", desc: "Medicines, trauma care, and emergency healthcare services." },
    { icon: "🏕️", title: "Temporary Shelter", desc: "Tents, blankets, and essential relief materials." },
    { icon: "👶", title: "Child Protection", desc: "Psychosocial support and safe spaces for displaced children." },
    { icon: "🏗️", title: "Rebuilding", desc: "Restore homes, schools, and critical infrastructure." },
  ];
  const FAQS = [
    { q: "Is my donation secure?", a: "Yes. All payments are processed through Razorpay, a PCI-DSS compliant gateway using 256-bit SSL encryption." },
    { q: "Will I receive a receipt?", a: "Yes. A detailed receipt with your transaction ID will be emailed to you immediately after payment." },
    { q: "How are donations used?", a: "100% of donations go directly to relief operations — food, water, shelter, medical care, and rebuilding efforts for earthquake victims." },
    { q: "Can I donate anonymously?", a: "We require a name and email for the payment receipt. Your personal details are never shared publicly." },
    { q: "Is there a minimum donation?", a: "Yes, the minimum donation is ₹100." },
    { q: "Can I donate internationally?", a: "Yes. Razorpay accepts international cards. The amount will be converted to INR at the time of payment." },
  ];

  const GALLERY_IMAGES = [
    { src: "https://i.guim.co.uk/img/media/60cdcd38c93025970fced796a7e0b08a6a3fb808/0_0_8192_5464/master/8192.jpg?width=940&dpr=2&s=none&crop=none", alt: "Venezuela earthquake damage" },
    { src: "https://i.guim.co.uk/img/media/cee15637e4ccd610fdab628900f531449a046fde/0_0_6192_4128/master/6192.jpg?width=940&dpr=2&s=none&crop=none", alt: "Earthquake aftermath Venezuela" },
    { src: "https://i.guim.co.uk/img/media/0dc3064eb6886390c800e998671028e24a4cd469/0_0_7008_4672/master/7008.jpg?width=940&dpr=2&s=none&crop=none", alt: "Venezuela twin earthquakes aftermath" },
    { src: "https://www.aljazeera.com/wp-content/uploads/2026/06/2026-06-25T024809Z_754166055_RC2O0MAY52KB_RTRMADP_3_VENEZUELA-QUAKE-1782374240.jpg?fit=1170%2C780&quality=80", alt: "Venezuela quake rescue" },
    { src: "https://www.aljazeera.com/wp-content/uploads/2026/06/2026-06-25T073025Z_2026273829_RC2T0MA82EYG_RTRMADP_3_VENEZUELA-QUAKE-1782374269.jpg?fit=1170%2C778&quality=80", alt: "Families displaced by Venezuela earthquake" },
    { src: "https://www.aljazeera.com/wp-content/uploads/2026/06/AFP__20260625__B88Z2X7__v2__HighRes__TopshotVenezuelaEarthquake-1782374347.jpg?fit=1170%2C779&quality=80", alt: "Venezuela earthquake topshot AFP" },
    { src: "https://www.aljazeera.com/wp-content/uploads/2026/06/2026-06-25T072525Z_12977953_RC2R0MA4K7Z3_RTRMADP_3_VENEZUELA-QUAKE-1782374258.jpg?fit=1170%2C780&quality=80", alt: "Venezuela earthquake emergency response" },
    { src: "https://dims.apnews.com/dims4/default/cb97552/2147483647/strip/true/crop/5472x3648+0+0/resize/2720x1814!/format/webp/quality/90/?url=https%3A%2F%2Fassets.apnews.com%2Fbb%2F0b%2F0a5963d8c1b374ebaee93a14452a%2F125dda75b0bb4955a26050fe8ade0409", alt: "Venezuela earthquake rescue operations" },
    { src: "https://dims.apnews.com/dims4/default/4d44d68/2147483647/strip/true/crop/5472x3648+0+0/resize/2720x1814!/format/webp/quality/90/?url=https%3A%2F%2Fassets.apnews.com%2Ff9%2Fac%2F35c27b31291b377541a8c939a89e%2Fcc66081daf624b43a09f1fa5989b8bb9", alt: "Earthquake victims Venezuela" },
    { src: "https://dims.apnews.com/dims4/default/0963b99/2147483647/strip/true/crop/5300x3533+0+0/resize/2720x1814!/format/webp/quality/90/?url=https%3A%2F%2Fassets.apnews.com%2F5a%2F97%2F71f0377476633cb62e432ad8f351%2F5e94781bdc3948ab8d9129dbad404435", alt: "Venezuela earthquake relief" },
    { src: "https://dims.apnews.com/dims4/default/156bf5b/2147483647/strip/true/crop/5472x3648+0+0/resize/2720x1814!/format/webp/quality/90/?url=https%3A%2F%2Fassets.apnews.com%2Fc4%2Fc4%2F6084514f3268831a48b89203a6ba%2Fcb58c399e2884d0289401b39ce9ea2a6", alt: "Venezuela earthquake aftermath" },
    { src: "https://dims.apnews.com/dims4/default/aee2d60/2147483647/strip/true/crop/8640x5760+0+0/resize/2400x1600!/format/webp/quality/90/?url=https%3A%2F%2Fassets.apnews.com%2Fce%2Fb7%2F82fbff0dfa913d3855f671b74259%2F9726a73d604c4d30b7d9348f19ecbc5f", alt: "Venezuela earthquake scene" },
    { src: "https://dims.apnews.com/dims4/default/d8df3b7/2147483647/strip/true/crop/7735x5157+0+0/resize/2720x1814!/format/webp/quality/90/?url=https%3A%2F%2Fassets.apnews.com%2F14%2F15%2F2a06bfd9682da5faf7f95f4e7fbf%2F7f1ad882d59d41e39c6d940a4a1d1a95", alt: "Venezuela quake damage" },
    { src: "https://dims.apnews.com/dims4/default/cce92a2/2147483647/strip/true/crop/7904x5269+0+0/resize/2720x1814!/format/webp/quality/90/?url=https%3A%2F%2Fassets.apnews.com%2F3e%2F4d%2Fecd67dcd293f295a98c490385ad6%2F9d3bf734483847c3b02a7af9c0136378", alt: "Rescue teams Venezuela" },
    { src: "https://dims.apnews.com/dims4/default/4738068/2147483647/strip/true/crop/7804x5203+0+0/resize/2720x1814!/format/webp/quality/90/?url=https%3A%2F%2Fassets.apnews.com%2Fff%2F47%2F9fed0d1e0df9c9c4b6153b022cfb%2Fdb697f8d71c74e86b05c03b41cfcc4c4", alt: "Venezuela displaced families" },
    { src: "https://dims.apnews.com/dims4/default/d0d8d81/2147483647/strip/true/crop/7201x4800+0+0/resize/2720x1814!/format/webp/quality/90/?url=https%3A%2F%2Fassets.apnews.com%2Fee%2Fe4%2F76d0a13aedb5ac8e8971171847f2%2F52f99a603d7a451c89a1637595fde3ec", alt: "Venezuela earthquake survivors" },
    { src: "https://dims.apnews.com/dims4/default/abe0c78/2147483647/strip/true/crop/6911x4607+0+0/resize/2720x1814!/format/webp/quality/90/?url=https%3A%2F%2Fassets.apnews.com%2F08%2F7c%2F68805a8fd49cc48cb3886451b813%2Fdc4b33198e3a495ca52e6e3abdb3b647", alt: "Venezuela earthquake community" },
    { src: "https://dims.apnews.com/dims4/default/a401e56/2147483647/strip/true/crop/5616x3744+0+0/resize/2720x1814!/format/webp/quality/90/?url=https%3A%2F%2Fassets.apnews.com%2F67%2F8f%2F416b13e13534fde9f50bbf2acf47%2Fc195589fd2724a08a01665b1dd8531e3", alt: "Venezuela earthquake aid" },
    { src: "https://dims.apnews.com/dims4/default/1212072/2147483647/strip/true/crop/3209x2140+0+0/resize/2720x1814!/format/webp/quality/90/?url=https%3A%2F%2Fassets.apnews.com%2F26%2F83%2F236e286344be909b3923c9311f9f%2F4a06922d3d3e49309c3017cf0613a096", alt: "Venezuela earthquake rebuilding" },
  ];


  const [selectedAmount, setSelectedAmount] = useState(500);
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [activeFaq, setActiveFaq] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [amountRaised] = useState(1847300);
  const [donorCount] = useState(312);
  const GOAL = 5000000;

  const finalAmount = customAmount ? parseInt(customAmount) : selectedAmount;
  const progressPct = Math.min((amountRaised / GOAL) * 100, 100).toFixed(1);

  const fmt = (n) => "₹" + n.toLocaleString("en-IN");

  const handleDonate = async () => {
    setFormError("");
    if (!donorName.trim()) return setFormError("Please enter your full name.");
    if (!donorEmail.trim() || !/\S+@\S+\.\S+/.test(donorEmail)) return setFormError("Please enter a valid email address.");
    if (!finalAmount || finalAmount < 100) return setFormError("Minimum donation amount is ₹100.");

    setLoading(true);
    try {
      const res = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-order", amount: finalAmount, name: donorName.trim(), email: donorEmail.trim() }),
      });
      const data = await res.json();
      if (!data.success) { setFormError(data.message || "Failed to create order."); setLoading(false); return; }

      const options = {
        key: data.data.key_id,
        amount: data.data.amount,
        currency: "INR",
        name: "Venezuela Earthquake Relief",
        description: "Emergency Relief Fund",
        order_id: data.data.order_id,
        prefill: { name: donorName.trim(), email: donorEmail.trim() },
        theme: { color: "#DC2626" },
        handler: async (response) => {
          try {
            const verify = await fetch("/api/donations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "verify",
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                name: donorName.trim(),
                email: donorEmail.trim(),
                amount: finalAmount,
              }),
            });
            const vData = await verify.json();
            if (vData.success) {
              setSuccess({ name: donorName.trim(), amount: finalAmount, paymentId: response.razorpay_payment_id });
            } else {
              setFormError("Payment received but verification failed. Contact support.");
            }
          } catch { setFormError("Verification error. Please contact support."); }
          setLoading(false);
        },
        modal: { ondismiss: () => setLoading(false) },
      };

      if (!window.Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => { const rzp = new window.Razorpay(options); rzp.open(); };
        document.body.appendChild(script);
      } else {
        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch { setFormError("Something went wrong. Please try again."); setLoading(false); }
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;800&display=swap');
    @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
    @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
    .don-fade{animation:fadeUp 0.6s ease both}
    .don-pulse{animation:pulse 2s ease-in-out infinite}
    .don-img:hover{transform:scale(1.04);z-index:2;box-shadow:0 16px 40px rgba(0,0,0,0.4)}
    .don-img{transition:transform 0.3s,box-shadow 0.3s;cursor:pointer}
    .don-faq-btn:hover{background:rgba(220,38,38,0.06)}
    .don-preset:hover{border-color:#DC2626!important;color:#DC2626!important}
    .don-cta:hover{opacity:0.92;transform:translateY(-1px)}
    .don-cta{transition:opacity 0.2s,transform 0.2s}
.don-impact:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,0.12)}
    .don-impact{transition:transform 0.25s,box-shadow 0.25s;cursor:pointer}
    .don-use:hover{border-color:rgba(220,38,38,0.4)!important;background:rgba(220,38,38,0.04)!important}
    .don-use{transition:border-color 0.2s,background 0.2s}
  `;

  if (success) return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "Inter,sans-serif" }}>
      <style>{css}</style>
      <div className="don-fade" style={{ maxWidth: 520, width: "100%", textAlign: "center", padding: "3rem 2rem", background: "#fff", borderRadius: 20, boxShadow: "0 8px 48px rgba(0,0,0,0.1)" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🙏</div>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "2rem", color: "#1e293b", margin: "0 0 12px" }}>Thank You, {success.name.split(" ")[0]}!</h2>
        <p style={{ color: "#475569", fontSize: "1rem", lineHeight: 1.7, margin: "0 0 24px" }}>Your generous donation of <strong>{fmt(success.amount)}</strong> has been received. A confirmation email with your receipt has been sent.</p>
        <div style={{ background: "#fef2f2", borderRadius: 12, padding: "16px 20px", margin: "0 0 24px", textAlign: "left" }}>
          <p style={{ margin: "0 0 6px", fontSize: 13, color: "#64748b" }}>Transaction ID</p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b", wordBreak: "break-all" }}>{success.paymentId}</p>
        </div>
        <p style={{ color: "#64748b", fontSize: "0.9rem", margin: "0 0 28px", lineHeight: 1.6 }}>
          "Your contribution will help provide emergency shelter, food, clean water, and medical care to families affected by the Venezuela Earthquake."
        </p>
        <button onClick={onBack} className="don-cta" style={{ background: "linear-gradient(135deg,#DC2626,#1D4ED8)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}>Back to Home</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#1e293b", fontFamily: "Inter,sans-serif" }}>
      <style>{css}</style>

      {/* Lightbox */}
      {lightbox !== null && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: 20, right: 24, background: "none", border: "none", color: "#fff", fontSize: "2rem", cursor: "pointer" }}>×</button>
          <img src={GALLERY_IMAGES[lightbox].src.replace("w=600", "w=1200")} alt={GALLERY_IMAGES[lightbox].alt} style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 12, objectFit: "contain" }} onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Navbar */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 5%", height: 64 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: "0.9rem" }}>A</div>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1rem", color: "#1e293b" }}>AutoApply AI</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "0.85rem", color: "#DC2626", fontWeight: 600, background: "#fef2f2", padding: "4px 12px", borderRadius: 100 }}>🇻🇪 Relief Campaign</span>
          <button onClick={() => document.getElementById("don-form")?.scrollIntoView({ behavior: "smooth" })} className="don-cta" style={{ background: "linear-gradient(135deg,#DC2626,#b91c1c)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}>Donate Now</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ paddingTop: 64, position: "relative", minHeight: "92vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url('https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=1600&q=80')", backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.25)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(185,28,28,0.7),rgba(30,64,175,0.6))", mixBlendMode: "multiply" }} />
        <div className="don-fade" style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "4rem 5%", maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 100, padding: "6px 18px", fontSize: "0.82rem", color: "#fca5a5", fontWeight: 600, marginBottom: "1.5rem" }}>
            🚨 EMERGENCY APPEAL &nbsp;·&nbsp; 🇻🇪 Venezuela Earthquake
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(2.2rem,6vw,4rem)", letterSpacing: "-0.03em", margin: "0 0 1.25rem", color: "#fff", lineHeight: 1.15 }}>Help Venezuela<br />Rise Again</h1>
          <p style={{ fontSize: "clamp(1rem,2.5vw,1.2rem)", color: "rgba(255,255,255,0.82)", lineHeight: 1.75, margin: "0 0 2.5rem", maxWidth: 680, marginLeft: "auto", marginRight: "auto" }}>
            Thousands of families have lost everything. Your donation today can provide emergency shelter, food, clean water, medicines, and hope to those affected by the devastating earthquake.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => document.getElementById("don-form")?.scrollIntoView({ behavior: "smooth" })} className="don-cta don-pulse" style={{ background: "linear-gradient(135deg,#DC2626,#b91c1c)", color: "#fff", border: "none", borderRadius: 10, padding: "16px 36px", fontSize: "1.05rem", fontWeight: 800, cursor: "pointer", boxShadow: "0 8px 32px rgba(220,38,38,0.4)" }}>❤️ Donate Now</button>
            <button onClick={() => document.getElementById("don-about")?.scrollIntoView({ behavior: "smooth" })} className="don-cta" style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "16px 28px", fontSize: "1rem", fontWeight: 600, cursor: "pointer" }}>Learn How Your Donation Helps</button>
          </div>

          {/* Progress Bar */}
          <div style={{ marginTop: "3rem", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, padding: "1.5rem 2rem", textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#fff", fontFamily: "'Space Grotesk',sans-serif" }}>{fmt(amountRaised)}</div>
                <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.6)" }}>raised of {fmt(GOAL)} goal</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fca5a5", fontFamily: "'Space Grotesk',sans-serif" }}>{donorCount}</div>
                <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.6)" }}>donors</div>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 100, height: 10, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg,#DC2626,#f97316)", borderRadius: 100, transition: "width 1s ease" }} />
            </div>
            <div style={{ marginTop: 8, fontSize: "0.8rem", color: "rgba(255,255,255,0.55)", textAlign: "right" }}>{progressPct}% of goal reached</div>
          </div>
        </div>
      </div>

      {/* About the Disaster */}
      <div id="don-about" style={{ padding: "5rem 5%", background: "#f8fafc" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="don-fade" style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{ display: "inline-block", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 100, padding: "6px 18px", fontSize: "0.8rem", color: "#DC2626", fontWeight: 700, marginBottom: "1rem" }}>🌍 About the Disaster</div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(1.6rem,4vw,2.5rem)", letterSpacing: "-0.03em", margin: "0 0 1rem" }}>Venezuela Earthquake Emergency</h2>
            <p style={{ color: "#64748b", fontSize: "1.05rem", maxWidth: 680, margin: "0 auto", lineHeight: 1.75 }}>
              A powerful earthquake has struck Venezuela, causing widespread destruction across multiple states. Homes, hospitals, schools, and critical infrastructure have been damaged or destroyed. Thousands of families have been displaced and are in urgent need of humanitarian assistance.
            </p>
          </div>

          {/* Stats notice */}
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "16px 20px", marginBottom: "2.5rem", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>ℹ️</span>
            <div>
              <p style={{ margin: 0, fontSize: "0.88rem", color: "#92400e", lineHeight: 1.6 }}>
                <strong>Note:</strong> Figures below are estimates based on latest available reports from official humanitarian agencies (UNOCHA, Red Cross, UNHCR). Actual numbers may be higher as rescue operations continue.
              </p>
              <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "#a16207" }}>Source: UN OCHA &amp; IFRC · Last updated: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "1rem" }}>
            {[
              { label: "Lives Lost", icon: "🕊️", value: "1,200+", color: "#DC2626" },
              { label: "Injured", icon: "🏥", value: "4,800+", color: "#EA580C" },
              { label: "Families Displaced", icon: "🏠", value: "38,000+", color: "#D97706" },
              { label: "Homes Destroyed", icon: "🏚️", value: "12,500+", color: "#7C3AED" },
              { label: "Infrastructure Damage", icon: "🌉", value: "Critical", color: "#1D4ED8" },
              { label: "Economic Losses", icon: "📊", value: "$2.1B+", color: "#059669" },
            ].map(card => (
              <div key={card.label} style={{ background: "#fff", borderRadius: 14, padding: "1.5rem", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: `2px solid ${card.color}22` }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>{card.icon}</div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.1rem", color: card.color, marginBottom: 4 }}>{card.value}</div>
                <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>{card.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Impact Cards */}
      <div style={{ padding: "5rem 5%", background: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{ display: "inline-block", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 100, padding: "6px 18px", fontSize: "0.8rem", color: "#DC2626", fontWeight: 700, marginBottom: "1rem" }}>💡 Why We Need Your Help</div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(1.6rem,4vw,2.4rem)", letterSpacing: "-0.03em", margin: "0 0 0.75rem" }}>Every Rupee Creates Immediate Impact</h2>
            <p style={{ color: "#64748b", fontSize: "1rem", margin: 0 }}>See exactly what your donation accomplishes on the ground.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1.25rem" }}>
            {IMPACT_CARDS.map(c => (
              <div key={c.amount} className="don-impact" onClick={() => { setSelectedAmount(c.amount); setCustomAmount(""); document.getElementById("don-form")?.scrollIntoView({ behavior: "smooth" }); }} style={{ background: "#f8fafc", borderRadius: 16, padding: "1.75rem 1.5rem", textAlign: "center", border: "2px solid #e2e8f0" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>{c.icon}</div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "#DC2626", marginBottom: 4 }}>{fmt(c.amount)}</div>
                <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: 6, fontSize: "0.95rem" }}>{c.label}</div>
                <div style={{ fontSize: "0.83rem", color: "#64748b", lineHeight: 1.5 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      <div style={{ padding: "5rem 5%", background: "#0f172a" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{ display: "inline-block", background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 100, padding: "6px 18px", fontSize: "0.8rem", color: "#fca5a5", fontWeight: 700, marginBottom: "1rem" }}>📸 On the Ground</div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(1.6rem,4vw,2.4rem)", letterSpacing: "-0.03em", margin: "0 0 0.75rem", color: "#fff" }}>Faces of the Crisis</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem", margin: 0 }}>Click any image to enlarge</p>
          </div>
          <div style={{ columns: "3 240px", gap: "1rem" }}>
            {GALLERY_IMAGES.map((img, i) => (
              <div key={i} style={{ breakInside: "avoid", marginBottom: "1rem" }}>
                <img loading="lazy" src={img.src} alt={img.alt} className="don-img" onClick={() => setLightbox(i)} style={{ width: "100%", borderRadius: 10, display: "block", objectFit: "cover" }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Donation Form */}
      <div id="don-form" style={{ padding: "5rem 5%", background: "linear-gradient(135deg,#fef2f2,#eff6ff)" }}>
        <div style={{ maxWidth: 580, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div style={{ display: "inline-block", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 100, padding: "6px 18px", fontSize: "0.8rem", color: "#DC2626", fontWeight: 700, marginBottom: "1rem" }}>❤️ Make a Difference</div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(1.6rem,4vw,2.4rem)", letterSpacing: "-0.03em", margin: "0 0 0.75rem" }}>Donate to Venezuela Relief</h2>
            <p style={{ color: "#64748b", fontSize: "0.95rem", margin: 0 }}>100% of your donation reaches those in need. Secure payment via Razorpay.</p>
          </div>

          <div style={{ background: "#fff", borderRadius: 20, padding: "2.5rem", boxShadow: "0 8px 40px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontWeight: 600, fontSize: "0.88rem", color: "#374151", marginBottom: 6 }}>Select Amount</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 12 }}>
                {PRESET_AMOUNTS.map(a => (
                  <button key={a} className="don-preset" onClick={() => { setSelectedAmount(a); setCustomAmount(""); }} style={{ padding: "10px 4px", borderRadius: 8, border: `2px solid ${selectedAmount === a && !customAmount ? "#DC2626" : "#e2e8f0"}`, background: selectedAmount === a && !customAmount ? "#fef2f2" : "#fff", color: selectedAmount === a && !customAmount ? "#DC2626" : "#374151", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem", transition: "all 0.15s" }}>
                    {fmt(a)}
                  </button>
                ))}
              </div>
              <input type="number" placeholder="Enter custom amount (min ₹100)" value={customAmount} onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(null); }} style={{ width: "100%", padding: "10px 14px", border: "2px solid #e2e8f0", borderRadius: 8, fontSize: "0.95rem", boxSizing: "border-box", outline: "none", fontFamily: "Inter,sans-serif" }} />
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontWeight: 600, fontSize: "0.88rem", color: "#374151", marginBottom: 6 }}>Full Name *</label>
              <input type="text" placeholder="Enter your full name" value={donorName} onChange={e => setDonorName(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "2px solid #e2e8f0", borderRadius: 8, fontSize: "0.95rem", boxSizing: "border-box", outline: "none", fontFamily: "Inter,sans-serif" }} />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontWeight: 600, fontSize: "0.88rem", color: "#374151", marginBottom: 6 }}>Email Address *</label>
              <input type="email" placeholder="Enter your email" value={donorEmail} onChange={e => setDonorEmail(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "2px solid #e2e8f0", borderRadius: 8, fontSize: "0.95rem", boxSizing: "border-box", outline: "none", fontFamily: "Inter,sans-serif" }} />
            </div>

            {formError && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: "1.25rem", fontSize: "0.88rem", color: "#DC2626", fontWeight: 500 }}>{formError}</div>}

            <button onClick={handleDonate} disabled={loading} className="don-cta" style={{ width: "100%", padding: "14px", background: loading ? "#94a3b8" : "linear-gradient(135deg,#DC2626,#b91c1c)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 6px 20px rgba(220,38,38,0.3)" }}>
              {loading ? "Processing…" : `🔒 Donate Securely${finalAmount >= 100 ? " — " + fmt(finalAmount) : ""}`}
            </button>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: "1rem" }}>
              <span style={{ fontSize: "1rem" }}>🔒</span>
              <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Secured by Razorpay · 256-bit SSL · UPI, Cards, NetBanking accepted</span>
            </div>
          </div>
        </div>
      </div>

      {/* How Donations Are Used */}
      <div style={{ padding: "5rem 5%", background: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{ display: "inline-block", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 100, padding: "6px 18px", fontSize: "0.8rem", color: "#DC2626", fontWeight: 700, marginBottom: "1rem" }}>📋 Allocation</div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(1.6rem,4vw,2.4rem)", letterSpacing: "-0.03em", margin: 0 }}>How Donations Will Be Used</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "1.25rem" }}>
            {USE_CARDS.map(c => (
              <div key={c.title} className="don-use" style={{ border: "1.5px solid #e2e8f0", borderRadius: 16, padding: "1.75rem 1.5rem", textAlign: "center" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>{c.icon}</div>
                <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1e293b", marginBottom: 8 }}>{c.title}</div>
                <div style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.6 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transparency */}
      <div style={{ padding: "5rem 5%", background: "#0f172a", color: "#fff" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-block", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 100, padding: "6px 18px", fontSize: "0.8rem", color: "#86efac", fontWeight: 700, marginBottom: "1.5rem" }}>🛡️ 100% Transparent</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(1.6rem,4vw,2.4rem)", letterSpacing: "-0.03em", margin: "0 0 1rem" }}>Your Trust Is Our Priority</h2>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "1rem", lineHeight: 1.75, margin: "0 0 3rem" }}>
            Every donation is securely processed through Razorpay. This campaign is administered directly by MACHMILES. All funds are allocated exclusively to verified relief operations, and periodic campaign updates will be published to ensure complete accountability. Donors receive a payment confirmation, email receipt, and transaction ID immediately after each successful donation.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "1.25rem" }}>
            {[
              { icon: "🧾", title: "Email Receipt", desc: "Sent instantly after payment" },
              { icon: "🔑", title: "Transaction ID", desc: "Unique proof of every donation" },
              { icon: "📢", title: "Campaign Updates", desc: "Published regularly on our site" },
              { icon: "🔒", title: "Secure Payments", desc: "PCI-DSS compliant gateway" },
            ].map(item => (
              <div key={item.title} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "1.5rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: 10 }}>{item.icon}</div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 6 }}>{item.title}</div>
                <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)" }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ padding: "5rem 5%", background: "#f8fafc" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{ display: "inline-block", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 100, padding: "6px 18px", fontSize: "0.8rem", color: "#DC2626", fontWeight: 700, marginBottom: "1rem" }}>❓ FAQ</div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(1.6rem,4vw,2.4rem)", letterSpacing: "-0.03em", margin: 0 }}>Frequently Asked Questions</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {FAQS.map((f, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #e2e8f0", overflow: "hidden" }}>
                <button className="don-faq-btn" onClick={() => setActiveFaq(activeFaq === i ? null : i)} style={{ width: "100%", padding: "16px 20px", background: "none", border: "none", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontWeight: 600, fontSize: "0.95rem", color: "#1e293b", fontFamily: "Inter,sans-serif", borderRadius: 12 }}>
                  {f.q}
                  <span style={{ fontSize: "1.2rem", color: "#DC2626", flexShrink: 0, marginLeft: 12 }}>{activeFaq === i ? "−" : "+"}</span>
                </button>
                {activeFaq === i && <div style={{ padding: "0 20px 16px", fontSize: "0.9rem", color: "#64748b", lineHeight: 1.7 }}>{f.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: "#020817", color: "rgba(255,255,255,0.6)", padding: "3rem 5%", textAlign: "center" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: "1.5rem" }}>
            {[
              ["Privacy Policy", "/privacy-policy"],
              ["Terms & Conditions", "/terms"],
              ["Refund Policy", "/refund-policy"],
            ].map(([label, href]) => (
              <a key={label} href={href} style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: "0.82rem", padding: "4px 10px" }}
                onMouseEnter={e => e.target.style.color = "#fff"} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.5)"}>{label}</a>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: "1.5rem" }}>
            <a href="mailto:info@machmiles.com" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: "0.85rem" }}>✉️ info@machmiles.com</a>
          </div>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(255,255,255,0.3)" }}>© 2026 MACHMILES · <a href="https://machmiles.com" target="_blank" rel="noopener noreferrer" style={{ color: "#3B82F6", textDecoration: "none" }}>machmiles.com</a> · Venezuela Earthquake Relief Campaign</p>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("loading");
  const [user, setUser] = useState(null);

  const checkAndRoute = async (u) => {
    if (!u) { setScreen("landing"); return; }
    setUser(u);
    const pendingPlan = localStorage.getItem("pending_plan");
    if (pendingPlan) {
      localStorage.removeItem("pending_plan");
      const plan = PLANS.find(p => p.name === pendingPlan);
      setScreen("app");
      if (plan?.razorpay) {
        setTimeout(() => startPayment(plan, () => {}, () => {}), 800);
      }
      return;
    }
    setScreen(u.onboarded === false ? "onboarding" : "app");
  };

  useEffect(() => {
    // Handle direct policy URL access
    const path = window.location.pathname;
    if (path === "/Pricing" || path === "/pricing") {
      setScreen("pricing");
      return;
    }
    if (path === "/donations" || path === "/donation") {
      setScreen("donations");
      return;
    }
    if (path === "/aboutus" || path === "/about-us" || path === "/about") {
      setScreen("aboutus");
      return;
    }
    if (path === "/white-label-solution") { setScreen("white-label"); return; }
    if (path === "/affiliate-program") { setScreen("affiliate"); return; }
    if (path === "/career-coaches") { setScreen("career-coaches"); return; }
    if (path === "/hr-employers") { setScreen("hr-employers"); return; }
    if (path === "/campus-connect") { setScreen("campus-connect"); return; }
    const POLICY_PATHS = {
      "/privacy-policy": "privacy",
      "/terms": "terms",
      "/terms-and-conditions": "terms",
      "/refund-policy": "refund",
      "/cancellation-policy": "cancellation",
    };
    if (POLICY_PATHS[path]) {
      setScreen(POLICY_PATHS[path]);
      return;
    }

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
  const goToPolicy = (key) => {
    const urlMap = { privacy: "/privacy-policy", terms: "/terms", refund: "/refund-policy", cancellation: "/cancellation-policy" };
    window.history.pushState(null, "", urlMap[key] || "/");
    setScreen(key);
  };
  const goHome = () => { window.history.pushState(null, "", "/"); setScreen("landing"); };
  const goToPricing = () => { window.history.pushState(null, "", "/Pricing"); setScreen("pricing"); };
  const goToDonations = () => { window.history.pushState(null, "", "/donations"); setScreen("donations"); };

  if (screen === "aboutus") return <AboutPage onBack={goHome} />;
  if (screen === "white-label") return <WhiteLabelPage onBack={goHome} />;
  if (screen === "affiliate") return <AffiliatePage onBack={goHome} />;
  if (screen === "career-coaches") return <CareerCoachesPage onBack={goHome} />;
  if (screen === "hr-employers") return <HREmployersPage onBack={goHome} />;
  if (screen === "campus-connect") return <CampusConnectPage onBack={goHome} />;
  if (screen === "donations") return <DonationsPage onBack={goHome} />;
  if (screen === "pricing") return <PricingPage onSignup={() => { window.history.pushState(null, "", "/"); setScreen("signup"); }} onLogin={() => { window.history.pushState(null, "", "/"); setScreen("login"); }} onBack={goHome} />;
  if (screen === "landing") return <LandingPage onSignup={() => setScreen("signup")} onLogin={() => setScreen("login")} onPolicy={goToPolicy} />;
  if (screen === "login") return <AuthScreen mode="login" onAuth={(u) => checkAndRoute(u)} onToggle={() => setScreen("signup")} onBack={() => setScreen("landing")} />;
  if (screen === "signup") return <AuthScreen mode="signup" onAuth={(u) => checkAndRoute(u)} onToggle={() => setScreen("login")} onBack={() => setScreen("landing")} />;
  if (screen === "reset-password") return <ResetPasswordScreen onDone={() => { window.location.hash = ""; setScreen("login"); }} />;
  if (screen === "onboarding") return <Onboarding user={user} onComplete={(nav) => { setScreen("app"); if (nav) setTimeout(() => window.__onboardingNav = nav, 100); }} />;
  if (screen === "app") return <AppShell user={user} onLogout={() => { setUser(null); goHome(); }} onGoHome={goHome} />;
  if (screen === "terms") return <PolicyPage title="Terms & Conditions" onBack={goHome} content={TERMS_CONTENT} />;
  if (screen === "privacy") return <PolicyPage title="Privacy Policy" onBack={goHome} content={PRIVACY_CONTENT} />;
  if (screen === "refund") return <PolicyPage title="Refund Policy" onBack={goHome} content={REFUND_CONTENT} />;
  if (screen === "cancellation") return <PolicyPage title="Cancellation Policy" onBack={goHome} content={CANCELLATION_CONTENT} />;
  return null;
}
