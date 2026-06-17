import { useState } from "react";

const RAZORPAY_KEY = "rzp_live_SqZrMTUnxQH5E4";

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "",
    desc: "Try it out",
    features: ["10 generations/month", "Instagram & LinkedIn", "Basic tones", "Copy to clipboard"],
    cta: "Get Started",
    highlight: false,
    razorpay: null,
  },
  {
    name: "Creator",
    price: "₹599",
    period: "/mo",
    desc: "For serious creators",
    features: ["Unlimited generations", "All 3 platforms", "All tones + custom", "Content history", "Hashtag generator"],
    cta: "Subscribe Now",
    highlight: true,
    razorpay: { amount: 59900, currency: "INR", description: "ContentAI Creator Plan" },
  },
  {
    name: "Agency",
    price: "₹2,999",
    period: "/mo",
    desc: "For teams & brands",
    features: ["Everything in Creator", "5 brand profiles", "Team access (3 seats)", "Priority support", "API access"],
    cta: "Subscribe Now",
    highlight: false,
    razorpay: { amount: 299900, currency: "INR", description: "ContentAI Agency Plan" },
  },
];

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: "📸", color: "#E1306C" },
  { id: "linkedin", label: "LinkedIn", icon: "💼", color: "#0077B5" },
  { id: "youtube", label: "YouTube", icon: "🎬", color: "#FF0000" },
];

const TONES = ["Professional", "Casual", "Funny", "Inspiring", "Promotional"];

const CONTENT_TYPES = {
  instagram: ["Caption + Hashtags", "Carousel Slide Copy", "Bio Optimizer", "Story Script"],
  linkedin: ["Engagement Post", "Hook Lines", "Article Intro", "Connection Message"],
  youtube: ["Video Script Outline", "SEO Description", "Title Ideas", "Tags & Keywords"],
};

const FEATURES = [
  { icon: "⚡", title: "Generate in seconds", desc: "Type your topic, pick your platform, get polished content instantly — no writer's block ever again." },
  { icon: "🎯", title: "Platform-native style", desc: "Each output is tuned to how Instagram, LinkedIn, and YouTube audiences actually engage." },
  { icon: "🔁", title: "Regenerate & refine", desc: "Not quite right? One click gives you a fresh take. Tweak tone, length, and style freely." },
  { icon: "📂", title: "Content history", desc: "Every generation is saved. Come back, reuse, and build your own content library over time." },
  { icon: "🏷️", title: "Smart hashtags", desc: "Get a curated mix of trending and niche hashtags sized for your audience — not just the obvious ones." },
  { icon: "🌐", title: "3 platforms, one tool", desc: "Stop switching between tools. Instagram, LinkedIn, YouTube — all handled in one clean workspace." },
];

function Navbar({ onTryClick }) {
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(8,8,20,0.85)", backdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 2rem", height: "64px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "1.5rem" }}>✦</span>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#fff", letterSpacing: "-0.02em" }}>ContentAI</span>
      </div>
      <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
        {["Features", "Pricing", "Examples"].map(l => (
          <a key={l} href={`#${l.toLowerCase()}`} style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "0.9rem", fontFamily: "Inter, sans-serif" }}>{l}</a>
        ))}
        <button onClick={onTryClick} style={{
          background: "linear-gradient(135deg, #7C3AED, #4F46E5)",
          color: "#fff", border: "none", borderRadius: "8px",
          padding: "8px 20px", cursor: "pointer", fontWeight: 600,
          fontSize: "0.9rem", fontFamily: "Inter, sans-serif",
        }}>Try Free</button>
      </div>
    </nav>
  );
}

function Hero({ onTryClick }) {
  return (
    <section style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      padding: "6rem 2rem 4rem", position: "relative", overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: "600px", height: "400px", borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(124,58,237,0.25) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        display: "inline-flex", alignItems: "center", gap: "8px",
        background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.4)",
        borderRadius: "100px", padding: "6px 16px", marginBottom: "2rem",
        fontSize: "0.8rem", color: "#A78BFA", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em",
      }}>
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#7C3AED", display: "inline-block" }} />
        AI-POWERED CONTENT GENERATION
      </div>
      <h1 style={{
        fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800,
        fontSize: "clamp(2.8rem, 7vw, 5.5rem)", lineHeight: 1.05,
        letterSpacing: "-0.04em", color: "#fff", maxWidth: "900px",
        marginBottom: "1.5rem",
      }}>
        Your social media,<br />
        <span style={{ background: "linear-gradient(135deg, #7C3AED, #60A5FA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          written by AI.
        </span>
      </h1>
      <p style={{
        fontFamily: "Inter, sans-serif", fontSize: "1.15rem", color: "rgba(255,255,255,0.55)",
        maxWidth: "560px", lineHeight: 1.7, marginBottom: "2.5rem",
      }}>
        Generate scroll-stopping captions, scripts, and posts for Instagram, LinkedIn, and YouTube — in seconds, not hours.
      </p>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={onTryClick} style={{
          background: "linear-gradient(135deg, #7C3AED, #4F46E5)",
          color: "#fff", border: "none", borderRadius: "10px",
          padding: "14px 32px", cursor: "pointer", fontWeight: 700,
          fontSize: "1rem", fontFamily: "Inter, sans-serif",
          boxShadow: "0 0 40px rgba(124,58,237,0.4)",
        }}>Generate Your First Post →</button>
        <button style={{
          background: "transparent", color: "rgba(255,255,255,0.7)",
          border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px",
          padding: "14px 32px", cursor: "pointer", fontWeight: 500,
          fontSize: "1rem", fontFamily: "Inter, sans-serif",
        }}>See Examples</button>
      </div>
      <div style={{ display: "flex", gap: "2.5rem", marginTop: "3.5rem", flexWrap: "wrap", justifyContent: "center" }}>
        {[["10K+", "Creators"], ["2M+", "Posts Generated"], ["3", "Platforms"]].map(([num, label]) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "1.8rem", color: "#fff" }}>{num}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em" }}>{label.toUpperCase()}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Generator() {
  const [platform, setPlatform] = useState("instagram");
  const [contentType, setContentType] = useState(CONTENT_TYPES.instagram[0]);
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("Professional");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const handlePlatformChange = (p) => {
    setPlatform(p);
    setContentType(CONTENT_TYPES[p][0]);
    setResult(null);
  };

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const prompt = `You are a social media content expert. Generate ${contentType} content for ${platform} about: "${topic}". Tone: ${tone}.

Platform-specific instructions:
- Instagram: Write an engaging caption (150-200 words) + 15-20 relevant hashtags in groups (big, medium, niche)
- LinkedIn: Write a professional post with a strong hook first line, storytelling body, and a clear call-to-action. 200-300 words.
- YouTube: Provide a structured script outline with Intro hook, 3-4 main points, and CTA, plus 5 title options and an SEO description.

Format clearly with sections and line breaks. Make it feel human, not robotic. Be specific to the topic.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await response.json();
      const text = data.content?.map(b => b.text || "").join("\n") || "No content generated.";
      setResult(text);
    } catch (e) {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const copy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const selectedPlatform = PLATFORMS.find(p => p.id === platform);

  return (
    <section id="examples" style={{ padding: "5rem 2rem", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <p style={{ fontFamily: "Inter, sans-serif", color: "#A78BFA", fontSize: "0.85rem", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>LIVE DEMO</p>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "2.5rem", color: "#fff", letterSpacing: "-0.03em", margin: 0 }}>
          Try it right now
        </h2>
        <p style={{ fontFamily: "Inter, sans-serif", color: "rgba(255,255,255,0.5)", marginTop: "0.75rem" }}>No signup needed. Just type and generate.</p>
      </div>

      <div style={{
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "20px", padding: "2rem", backdropFilter: "blur(10px)",
      }}>
        {/* Platform selector */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", display: "block", marginBottom: "0.75rem" }}>PLATFORM</label>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {PLATFORMS.map(p => (
              <button key={p.id} onClick={() => handlePlatformChange(p.id)} style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "10px 18px", borderRadius: "10px", cursor: "pointer",
                fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: "0.9rem",
                border: platform === p.id ? `1.5px solid ${p.color}` : "1.5px solid rgba(255,255,255,0.1)",
                background: platform === p.id ? `${p.color}20` : "transparent",
                color: platform === p.id ? "#fff" : "rgba(255,255,255,0.5)",
                transition: "all 0.2s",
              }}>
                <span>{p.icon}</span>{p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content type */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", display: "block", marginBottom: "0.75rem" }}>CONTENT TYPE</label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {CONTENT_TYPES[platform].map(ct => (
              <button key={ct} onClick={() => setContentType(ct)} style={{
                padding: "7px 14px", borderRadius: "8px", cursor: "pointer",
                fontFamily: "Inter, sans-serif", fontSize: "0.85rem",
                border: contentType === ct ? "1.5px solid #7C3AED" : "1.5px solid rgba(255,255,255,0.08)",
                background: contentType === ct ? "rgba(124,58,237,0.2)" : "transparent",
                color: contentType === ct ? "#A78BFA" : "rgba(255,255,255,0.45)",
              }}>{ct}</button>
            ))}
          </div>
        </div>

        {/* Topic input */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", display: "block", marginBottom: "0.75rem" }}>YOUR TOPIC</label>
          <textarea
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder={`e.g. "5 morning habits that changed my productivity as a freelance designer"`}
            rows={3}
            style={{
              width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)",
              border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: "10px",
              padding: "12px 16px", color: "#fff", fontFamily: "Inter, sans-serif",
              fontSize: "0.95rem", resize: "vertical", outline: "none",
              lineHeight: 1.6,
            }}
          />
        </div>

        {/* Tone selector */}
        <div style={{ marginBottom: "2rem" }}>
          <label style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", display: "block", marginBottom: "0.75rem" }}>TONE</label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {TONES.map(t => (
              <button key={t} onClick={() => setTone(t)} style={{
                padding: "7px 14px", borderRadius: "8px", cursor: "pointer",
                fontFamily: "Inter, sans-serif", fontSize: "0.85rem",
                border: tone === t ? "1.5px solid #60A5FA" : "1.5px solid rgba(255,255,255,0.08)",
                background: tone === t ? "rgba(96,165,250,0.15)" : "transparent",
                color: tone === t ? "#93C5FD" : "rgba(255,255,255,0.45)",
              }}>{t}</button>
            ))}
          </div>
        </div>

        <button onClick={generate} disabled={loading || !topic.trim()} style={{
          width: "100%", padding: "14px", borderRadius: "10px", border: "none",
          background: loading || !topic.trim() ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg, #7C3AED, #4F46E5)",
          color: loading || !topic.trim() ? "rgba(255,255,255,0.4)" : "#fff",
          fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: "1rem",
          cursor: loading || !topic.trim() ? "not-allowed" : "pointer",
          transition: "all 0.2s",
        }}>
          {loading ? "✦ Generating..." : `Generate ${selectedPlatform?.label} Content →`}
        </button>

        {/* Result */}
        {error && (
          <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", color: "#FCA5A5", fontFamily: "Inter, sans-serif", fontSize: "0.9rem" }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ marginTop: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>
                {selectedPlatform?.icon} GENERATED {contentType.toUpperCase()}
              </span>
              <button onClick={copy} style={{
                background: copied ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)",
                border: copied ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(255,255,255,0.1)",
                color: copied ? "#86EFAC" : "rgba(255,255,255,0.6)",
                borderRadius: "7px", padding: "5px 14px",
                cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", fontWeight: 600,
              }}>
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
            <div style={{
              background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "12px", padding: "1.25rem",
              fontFamily: "Inter, sans-serif", fontSize: "0.9rem",
              color: "rgba(255,255,255,0.85)", lineHeight: 1.8,
              whiteSpace: "pre-wrap", maxHeight: "400px", overflowY: "auto",
            }}>
              {result}
            </div>
            <button onClick={generate} style={{
              marginTop: "0.75rem", background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)",
              borderRadius: "8px", padding: "8px 16px",
              cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: "0.85rem",
            }}>↺ Regenerate</button>
          </div>
        )}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" style={{ padding: "5rem 2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
        <p style={{ fontFamily: "Inter, sans-serif", color: "#A78BFA", fontSize: "0.85rem", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>WHY CONTENTAI</p>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "2.5rem", color: "#fff", letterSpacing: "-0.03em", margin: 0 }}>
          Everything you need to<br />post without the panic
        </h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
        {FEATURES.map(f => (
          <div key={f.title} style={{
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "16px", padding: "1.75rem",
            transition: "border-color 0.2s",
          }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>{f.icon}</div>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "#fff", margin: "0 0 0.5rem" }}>{f.title}</h3>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.9rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function UserDetailsModal({ plan, onConfirm, onClose }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Valid email required";
    if (!phone.trim() || !/^[6-9]\d{9}$/.test(phone)) e.phone = "Valid 10-digit Indian mobile number required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) onConfirm({ name, email, phone });
  };

  const inputStyle = (hasError) => ({
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.05)",
    border: `1.5px solid ${hasError ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.12)"}`,
    borderRadius: "10px", padding: "11px 14px",
    color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "0.95rem",
    outline: "none",
  });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem",
    }}>
      <div style={{
        background: "#0F0F1E", border: "1px solid rgba(124,58,237,0.35)",
        borderRadius: "20px", padding: "2rem", width: "100%", maxWidth: "420px",
        boxShadow: "0 0 60px rgba(124,58,237,0.2)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "1.3rem", color: "#fff", margin: "0 0 4px" }}>
              Almost there!
            </h3>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", margin: 0 }}>
              Subscribing to <span style={{ color: "#A78BFA", fontWeight: 600 }}>{plan.name} — {plan.price}/mo</span>
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "1.4rem", lineHeight: 1 }}>×</button>
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <label style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.07em", display: "block", marginBottom: "6px" }}>FULL NAME</label>
            <input
              type="text" placeholder="Ravi Kumar"
              value={name} onChange={e => setName(e.target.value)}
              style={inputStyle(errors.name)}
            />
            {errors.name && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#FCA5A5", margin: "4px 0 0" }}>{errors.name}</p>}
          </div>
          <div>
            <label style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.07em", display: "block", marginBottom: "6px" }}>EMAIL ADDRESS</label>
            <input
              type="email" placeholder="ravi@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              style={inputStyle(errors.email)}
            />
            {errors.email && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#FCA5A5", margin: "4px 0 0" }}>{errors.email}</p>}
          </div>
          <div>
            <label style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.07em", display: "block", marginBottom: "6px" }}>MOBILE NUMBER</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{
                background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.12)",
                borderRadius: "10px", padding: "11px 14px",
                fontFamily: "Inter, sans-serif", fontSize: "0.95rem", color: "rgba(255,255,255,0.5)",
                whiteSpace: "nowrap",
              }}>🇮🇳 +91</div>
              <input
                type="tel" placeholder="98765 43210" maxLength={10}
                value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                style={{ ...inputStyle(errors.phone), flex: 1 }}
              />
            </div>
            {errors.phone && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#FCA5A5", margin: "4px 0 0" }}>{errors.phone}</p>}
          </div>
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} style={{
          width: "100%", padding: "13px",
          background: "linear-gradient(135deg, #7C3AED, #4F46E5)",
          border: "none", borderRadius: "10px", color: "#fff",
          fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: "1rem",
          cursor: "pointer", boxShadow: "0 0 30px rgba(124,58,237,0.35)",
        }}>
          Continue to Payment →
        </button>
        <p style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "rgba(255,255,255,0.3)", marginTop: "0.75rem", marginBottom: 0 }}>
          🔒 Your details are only used to prefill Razorpay checkout
        </p>
      </div>
    </div>
  );
}

function Pricing() {
  const [paying, setPaying] = useState(null);
  const [success, setSuccess] = useState(null);
  const [modalPlan, setModalPlan] = useState(null);

  const handlePayment = async (plan, userDetails) => {
    setModalPlan(null);
    setPaying(plan.name);

    const loaded = await loadRazorpay();
    if (!loaded) {
      alert("Failed to load Razorpay. Please check your connection.");
      setPaying(null);
      return;
    }

    const options = {
      key: RAZORPAY_KEY,
      amount: plan.razorpay.amount,
      currency: plan.razorpay.currency,
      name: "ContentAI",
      description: plan.razorpay.description,
      handler: function (response) {
        setSuccess({ plan: plan.name, paymentId: response.razorpay_payment_id, userName: userDetails.name });
        setPaying(null);
      },
      prefill: { name: userDetails.name, email: userDetails.email, contact: `+91${userDetails.phone}` },
      notes: { plan: plan.name },
      theme: { color: "#7C3AED" },
      modal: { ondismiss: () => setPaying(null) },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function () {
      alert("Payment failed. Please try again.");
      setPaying(null);
    });
    rzp.open();
  };

  return (
    <section id="pricing" style={{ padding: "5rem 2rem", maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
        <p style={{ fontFamily: "Inter, sans-serif", color: "#A78BFA", fontSize: "0.85rem", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>PRICING</p>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "2.5rem", color: "#fff", letterSpacing: "-0.03em", margin: 0 }}>
          Start free. Scale when ready.
        </h2>
        <p style={{ fontFamily: "Inter, sans-serif", color: "rgba(255,255,255,0.4)", marginTop: "0.75rem", fontSize: "0.9rem" }}>
          Secure payments powered by Razorpay · UPI, Cards, NetBanking accepted
        </p>
      </div>

      {modalPlan && (
        <UserDetailsModal
          plan={modalPlan}
          onConfirm={(userDetails) => handlePayment(modalPlan, userDetails)}
          onClose={() => setModalPlan(null)}
        />
      )}

      {success && (
        <div style={{
          background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
          borderRadius: "14px", padding: "1.25rem 1.5rem", marginBottom: "2rem",
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          <span style={{ fontSize: "1.5rem" }}>🎉</span>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "#86EFAC", fontSize: "1rem" }}>
              Payment Successful — Welcome to {success.plan}{success.userName ? `, ${success.userName}` : ""}!
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "rgba(134,239,172,0.7)", marginTop: "2px" }}>
              Payment ID: {success.paymentId}
            </div>
          </div>
          <button onClick={() => setSuccess(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem", alignItems: "start" }}>
        {PLANS.map(plan => (
          <div key={plan.name} style={{
            background: plan.highlight ? "linear-gradient(145deg, rgba(124,58,237,0.2), rgba(79,70,229,0.1))" : "rgba(255,255,255,0.02)",
            border: plan.highlight ? "1.5px solid rgba(124,58,237,0.5)" : "1px solid rgba(255,255,255,0.07)",
            borderRadius: "20px", padding: "2rem", position: "relative",
          }}>
            {plan.highlight && (
              <div style={{
                position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)",
                background: "linear-gradient(135deg, #7C3AED, #4F46E5)",
                color: "#fff", fontSize: "0.7rem", fontWeight: 700,
                fontFamily: "Inter, sans-serif", letterSpacing: "0.1em",
                padding: "4px 14px", borderRadius: "100px",
              }}>MOST POPULAR</div>
            )}
            <div style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "#fff", margin: "0 0 0.25rem" }}>{plan.name}</h3>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", margin: "0 0 1rem" }}>{plan.desc}</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "2.5rem", color: "#fff" }}>{plan.price}</span>
                <span style={{ fontFamily: "Inter, sans-serif", color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>{plan.period}</span>
              </div>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem" }}>
              {plan.features.map(f => (
                <li key={f} style={{
                  fontFamily: "Inter, sans-serif", fontSize: "0.9rem",
                  color: "rgba(255,255,255,0.7)", padding: "6px 0",
                  display: "flex", alignItems: "center", gap: "10px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}>
                  <span style={{ color: "#A78BFA" }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => plan.razorpay ? setModalPlan(plan) : null}
              disabled={paying === plan.name}
              style={{
                width: "100%", padding: "12px",
                background: plan.highlight ? "linear-gradient(135deg, #7C3AED, #4F46E5)" : "rgba(255,255,255,0.06)",
                border: plan.highlight ? "none" : "1px solid rgba(255,255,255,0.1)",
                color: "#fff", borderRadius: "10px", fontFamily: "Inter, sans-serif",
                fontWeight: 600, fontSize: "0.95rem",
                cursor: plan.razorpay ? (paying === plan.name ? "not-allowed" : "pointer") : "default",
                opacity: paying === plan.name ? 0.6 : 1,
                transition: "all 0.2s",
              }}>
              {paying === plan.name ? "Opening Razorpay..." : plan.cta}
            </button>
            {plan.razorpay && (
              <div style={{ textAlign: "center", marginTop: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <span style={{ fontSize: "0.75rem" }}>🔒</span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>
                  UPI · Cards · NetBanking · Wallets
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid rgba(255,255,255,0.07)",
      padding: "2.5rem 2rem", textAlign: "center",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "1rem" }}>
        <span style={{ fontSize: "1.2rem" }}>✦</span>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "#fff" }}>ContentAI</span>
      </div>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.85rem", color: "rgba(255,255,255,0.3)", margin: 0 }}>
        © 2026 ContentAI · Built for creators who'd rather create than caption.
      </p>
    </footer>
  );
}

export default function App() {
  const scrollToGenerator = () => {
    document.getElementById("examples")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{
      background: "#08080F", minHeight: "100vh", color: "#fff",
      fontFamily: "Inter, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.4); border-radius: 3px; }
        textarea::placeholder { color: rgba(255,255,255,0.2); }
        textarea { color-scheme: dark; }
      `}</style>
      <Navbar onTryClick={scrollToGenerator} />
      <Hero onTryClick={scrollToGenerator} />
      <Generator />
      <Features />
      <Pricing />
      <Footer />
    </div>
  );
}
