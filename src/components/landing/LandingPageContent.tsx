"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Globe,
  Cpu,
  Link2,
  BarChart2,
  Smartphone,
  Shield,
  ChevronDown,
  ChevronUp,
  Star,
  Zap,
  Home,
  Hotel,
  PenTool,
  ShoppingBag,
  ArrowRight,
  Play,
  Check,
  Twitter,
  Linkedin,
  Github,
  Youtube,
} from "lucide-react";

// ─── Brand tokens ────────────────────────────────────────────────────────────
const C = {
  gold: "#D4A017",
  teal: "#2DD4BF",
  coral: "#FB7A54",
  base: "#0A0908",
  surface: "#12100E",
  elevated: "#1B1916",
  border: "#2A2520",
  textPrimary: "#F5F3EF",
  textSecondary: "#A8A29E",
  textMuted: "#6B6560",
} as const;

// ─── Shared atoms ─────────────────────────────────────────────────────────────
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
      style={{ background: `${C.gold}18`, color: C.gold, border: `1px solid ${C.gold}30` }}
    >
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center mb-5">
      <Badge>{children}</Badge>
    </div>
  );
}

function BtnPrimary({
  children,
  href,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}) {
  const cls =
    "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all hover:opacity-90 active:scale-95";
  const s = { background: C.gold, color: "#0A0908" };
  if (href)
    return <Link href={href} className={cls} style={s}>{icon}{children}</Link>;
  return <button onClick={onClick} className={cls} style={s}>{icon}{children}</button>;
}

function BtnGhost({ children, href }: { children: React.ReactNode; href?: string }) {
  const cls =
    "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all hover:opacity-80";
  const s = { color: C.textPrimary, border: `1px solid ${C.border}`, background: `${C.elevated}99` };
  if (href) return <Link href={href} className={cls} style={s}>{children}</Link>;
  return <button className={cls} style={s}>{children}</button>;
}

// ─── Navbar ──────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-12 h-16"
      style={{
        background: `${C.base}E6`,
        borderBottom: `1px solid ${C.border}`,
        backdropFilter: "blur(16px)",
      }}
    >
      <Link href="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.gold }}>
          <Globe size={13} color="#0A0908" />
        </div>
        <span
          className="text-sm font-bold tracking-tight"
          style={{ color: C.textPrimary, fontFamily: "Plus Jakarta Sans, sans-serif" }}
        >
          SPAZEO<span style={{ color: C.gold }}>✦</span>
        </span>
      </Link>

      <nav className="hidden md:flex items-center gap-8">
        {["Product", "Features", "Pricing", "About"].map((item) => (
          <Link
            key={item}
            href={`/${item.toLowerCase()}`}
            className="text-sm transition-opacity hover:opacity-100"
            style={{ color: C.textSecondary }}
          >
            {item}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        <Link href="/sign-in" className="text-sm" style={{ color: C.textSecondary }}>
          Log In
        </Link>
        <BtnPrimary href="/sign-up">Start Free Trial</BtnPrimary>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section
      className="relative flex flex-col items-center justify-center text-center pt-40 pb-24 px-6 overflow-hidden"
      style={{ background: C.base, minHeight: "100vh" }}
    >
      {/* Radial glow */}
      <div
        className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${C.gold}14 0%, transparent 70%)` }}
      />

      <div className="relative z-10 max-w-3xl mx-auto">
        <SectionLabel>✦ Announcing 4D Space</SectionLabel>
        <h1
          className="text-5xl md:text-7xl font-bold leading-tight mb-6"
          style={{ color: C.textPrimary, fontFamily: "Plus Jakarta Sans, sans-serif" }}
        >
          Step Inside Any Space
        </h1>
        <p className="text-lg mb-10 mx-auto max-w-xl leading-relaxed" style={{ color: C.textSecondary }}>
          Transform a single panorama into an immersive, walkable 3D experience —
          powered by Gaussian Splatting, AI staging, and depth estimation.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <BtnPrimary href="/sign-up">Start Creating Free</BtnPrimary>
          <BtnGhost>
            <Play size={13} />
            Watch Demo
          </BtnGhost>
        </div>
      </div>

      {/* Hero image */}
      <div
        className="relative z-10 mt-16 max-w-4xl mx-auto w-full rounded-2xl overflow-hidden"
        style={{ border: `1px solid ${C.border}` }}
      >
        <img
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80"
          alt="Luxury living room panorama"
          className="w-full object-cover"
          style={{ maxHeight: 520 }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, #0A0908 0%, transparent 50%)" }}
        />
      </div>
    </section>
  );
}

// ─── Trusted By ───────────────────────────────────────────────────────────────
const COMPANIES = ["Compass", "Sotheby's", "RE/MAX", "Zillow", "Coldwell Banker", "Century 21", "Keller Williams"];

function TrustedBy() {
  return (
    <section
      className="py-8 px-12"
      style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}
    >
      <p className="text-center text-xs uppercase tracking-widest mb-5" style={{ color: C.textMuted }}>
        Trusted by Leading Real Estate Companies
      </p>
      <div className="flex items-center justify-center gap-10 flex-wrap">
        {COMPANIES.map((c) => (
          <span key={c} className="text-sm font-semibold" style={{ color: C.textMuted }}>
            {c}
          </span>
        ))}
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
const STEPS = [
  { num: "1", title: "Upload", desc: "Drop any 360° panorama or standard photo. Our AI handles the rest." },
  { num: "2", title: "AI Enhances", desc: "Gaussian Splatting + depth estimation creates true 3D from a single image." },
  { num: "3", title: "Share & Explore", desc: "Get an instant shareable link — viewers walk through your space on any device." },
];

function HowItWorks() {
  return (
    <section className="py-24 px-12" style={{ background: C.base }}>
      <SectionLabel>How It Works</SectionLabel>
      <h2
        className="text-4xl md:text-5xl font-bold text-center mb-4"
        style={{ color: C.textPrimary, fontFamily: "Plus Jakarta Sans, sans-serif" }}
      >
        From Panorama to Walkthrough in Seconds
      </h2>
      <p className="text-center mb-16" style={{ color: C.textSecondary }}>
        Three simple steps to create immersive virtual experiences.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {STEPS.map((s) => (
          <div
            key={s.num}
            className="rounded-2xl p-8"
            style={{ background: C.elevated, border: `1px solid ${C.border}` }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-6"
              style={{ background: `${C.gold}20`, color: C.gold, border: `1px solid ${C.gold}40` }}
            >
              {s.num}
            </div>
            <h3 className="text-base font-semibold mb-2" style={{ color: C.textPrimary }}>
              {s.title}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: C.textSecondary }}>
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Core Features (alternating) ─────────────────────────────────────────────
const CORE_FEATURES = [
  {
    title: "Gaussian Splatting Engine",
    desc: "Convert flat panoramas into photorealistic 3D environments. Our neural rendering creates depth and parallax that feels like being there.",
    bullets: ["Real-time neural rendering", "Photorealistic depth from single images", "Works with any panorama format"],
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80",
    imageAlt: "Colorful 3D point cloud visualization",
    reverse: false,
  },
  {
    title: "AI Virtual Staging",
    desc: "Furnish empty spaces instantly. Our AI adds photorealistic furniture, decor, and styling matched to any design aesthetic.",
    bullets: ["Multiple design styles available", "Photorealistic furniture placement", "One-click staging transformations"],
    image: "https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=800&q=80",
    imageAlt: "Virtually staged living room",
    reverse: true,
  },
  {
    title: "One-Click Publishing",
    desc: "Share immersive tours with a single link. Embed on your website, share on social, or add to your MLS listing.",
    bullets: ["Shareable links in one click", "Website embed & social sharing", "MLS & real estate platform integration"],
    image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&q=80",
    imageAlt: "Person publishing tour on laptop",
    reverse: false,
  },
];

function CoreFeatures() {
  return (
    <section className="py-24 px-12" style={{ background: C.base }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-24">
        {CORE_FEATURES.map((f) => (
          <div
            key={f.title}
            className={`flex flex-col md:flex-row items-center gap-16 ${f.reverse ? "md:flex-row-reverse" : ""}`}
          >
            <div className="flex-1">
              <h3
                className="text-3xl font-bold mb-4"
                style={{ color: C.textPrimary, fontFamily: "Plus Jakarta Sans, sans-serif" }}
              >
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed mb-6" style={{ color: C.textSecondary }}>
                {f.desc}
              </p>
              <ul className="flex flex-col gap-2">
                {f.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm" style={{ color: C.textSecondary }}>
                    <span style={{ color: C.gold }}>●</span> {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
              <img src={f.image} alt={f.imageAlt} className="w-full h-72 object-cover" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Features Grid ────────────────────────────────────────────────────────────
const FEATURE_CARDS = [
  { icon: <Globe size={18} />, title: "360° Panorama Viewer", desc: "Fluid drag-to-explore viewer with smooth transitions and hotspot navigation." },
  { icon: <Cpu size={18} />, title: "Depth Estimation AI", desc: "Automatic depth maps from 2D photos create parallax and real 3D perception." },
  { icon: <Link2 size={18} />, title: "One-Link Sharing", desc: "Share tours instantly via link, embed on websites, or add to MLS listings." },
  { icon: <BarChart2 size={18} />, title: "Analytics Dashboard", desc: "Track viewer engagement, time spent, clicks, and lead capture in real time." },
  { icon: <Smartphone size={18} />, title: "Works on Any Device", desc: "Responsive tours that look stunning on desktop, tablet, mobile, and VR headsets." },
  { icon: <Shield size={18} />, title: "Enterprise Security", desc: "SOC 2 compliant with SSO, role-based access, password-protected tours, and audit logs." },
];

function FeaturesGrid() {
  return (
    <section className="py-24 px-12" style={{ background: C.base }}>
      <SectionLabel>All Features</SectionLabel>
      <h2
        className="text-4xl md:text-5xl font-bold text-center mb-4 max-w-lg mx-auto leading-tight"
        style={{ color: C.textPrimary, fontFamily: "Plus Jakarta Sans, sans-serif" }}
      >
        Everything You Need to Create Stunning Tours
      </h2>
      <p className="text-center mb-16 max-w-xl mx-auto" style={{ color: C.textSecondary }}>
        Powerful tools that work behind the scenes so you can focus on showcasing spaces.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {FEATURE_CARDS.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl p-6 transition-colors"
            style={{ background: C.elevated, border: `1px solid ${C.border}` }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
              style={{ background: `${C.gold}18`, color: C.gold }}
            >
              {f.icon}
            </div>
            <h4 className="font-semibold text-sm mb-2" style={{ color: C.textPrimary }}>
              {f.title}
            </h4>
            <p className="text-sm leading-relaxed" style={{ color: C.textSecondary }}>
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Product Showcase ─────────────────────────────────────────────────────────
const SHOWCASE_POINTS = [
  { title: "Upload Panoramas", desc: "Drag and drop your 360° panorama images. We support all major formats and resolutions.", color: C.gold },
  { title: "Add Hotspots & Scenes", desc: "Place interactive hotspots, link scenes together, and build a seamless spatial navigation flow.", color: C.teal },
  { title: "Publish & Share", desc: "One click to publish your tour. Share via link, embed on your website, or send directly to clients.", color: C.coral },
];

function ProductShowcase() {
  return (
    <section className="py-24 px-12" style={{ background: C.surface }}>
      <SectionLabel>See It In Action</SectionLabel>
      <h2
        className="text-4xl md:text-5xl font-bold text-center mb-4"
        style={{ color: C.textPrimary, fontFamily: "Plus Jakarta Sans, sans-serif" }}
      >
        Experience the Spazeo Editor
      </h2>
      <p className="text-center mb-12 max-w-2xl mx-auto" style={{ color: C.textSecondary }}>
        Upload your 360° panoramas, place interactive hotspots, link scenes together, and publish immersive virtual tours — all from one powerful dark-mode editor.
      </p>

      {/* App mockup */}
      <div
        className="max-w-4xl mx-auto rounded-2xl overflow-hidden mb-14"
        style={{ border: `1px solid ${C.border}` }}
      >
        {/* Traffic lights */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: C.elevated }}>
          <div className="w-3 h-3 rounded-full" style={{ background: "#FF5F57" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#FEBC2E" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#28C840" }} />
          <span className="ml-3 text-xs" style={{ color: C.textMuted }}>
            Spazeo Tour Editor — Virtual Explorer PRO
          </span>
          <div className="ml-auto flex items-center gap-2">
            <div className="rounded px-2 py-0.5 text-xs font-medium" style={{ background: C.gold, color: "#0A0908" }}>
              Publish
            </div>
          </div>
        </div>
        <img
          src="https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200&q=80"
          alt="Spazeo Editor showing coastal panorama"
          className="w-full object-cover"
          style={{ maxHeight: 400 }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {SHOWCASE_POINTS.map((p) => (
          <div key={p.title} className="text-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: `${p.color}18`, color: p.color }}
            >
              <ArrowRight size={16} />
            </div>
            <h4 className="font-semibold text-sm mb-2" style={{ color: C.textPrimary }}>
              {p.title}
            </h4>
            <p className="text-sm leading-relaxed" style={{ color: C.textSecondary }}>
              {p.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Use Cases ────────────────────────────────────────────────────────────────
const USE_CASES = [
  {
    icon: <Home size={16} />,
    title: "Real Estate",
    desc: "Sell properties faster with tours that let buyers explore every room before visiting.",
    image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=600&q=80",
    color: C.gold,
  },
  {
    icon: <Hotel size={16} />,
    title: "Hospitality",
    desc: "Boost hotel bookings by letting guests virtually walk through suites, amenities, and event spaces.",
    image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80",
    color: C.teal,
  },
  {
    icon: <PenTool size={16} />,
    title: "Architecture",
    desc: "Present designs as walkable spaces and show clients pre-construction staging.",
    image: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80",
    color: C.coral,
  },
  {
    icon: <ShoppingBag size={16} />,
    title: "Retail & Showrooms",
    desc: "Transform stores into 24/7 virtual spaces. Customers browse products anywhere.",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80",
    color: "#A78BFA",
  },
];

function UseCases() {
  return (
    <section className="py-24 px-12" style={{ background: C.base }}>
      <SectionLabel>Use Cases</SectionLabel>
      <h2
        className="text-4xl md:text-5xl font-bold text-center mb-4"
        style={{ color: C.textPrimary, fontFamily: "Plus Jakarta Sans, sans-serif" }}
      >
        Built for Every Space
      </h2>
      <p className="text-center mb-16 max-w-xl mx-auto" style={{ color: C.textSecondary }}>
        From luxury homes to global hotel chains — Spazeo powers immersive experiences across industries.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {USE_CASES.map((u) => (
          <div
            key={u.title}
            className="relative rounded-2xl overflow-hidden group cursor-pointer"
            style={{ border: `1px solid ${C.border}` }}
          >
            <img
              src={u.image}
              alt={u.title}
              className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to top, #0A0908 35%, transparent 70%)" }}
            />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                style={{ background: `${u.color}25`, color: u.color }}
              >
                {u.icon}
              </div>
              <h4 className="font-semibold text-sm mb-1" style={{ color: C.textPrimary }}>
                {u.title}
              </h4>
              <p className="text-xs leading-relaxed" style={{ color: C.textSecondary }}>
                {u.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Social Proof ─────────────────────────────────────────────────────────────
const STATS = [
  { value: "50K+", label: "Tours Created", color: C.gold },
  { value: "12M+", label: "Virtual Walkthroughs", color: C.teal },
  { value: "98%", label: "Customer Satisfaction", color: C.coral },
  { value: "3.2x", label: "Faster Than Competitors", color: "#A78BFA" },
];

const TESTIMONIALS = [
  {
    quote:
      "Spazeo cut our listing time in half. Buyers can self-navigate through properties before scheduling a visit — it's a game changer.",
    name: "Sarah Mitchell",
    role: "Senior Realtor, Sotheby's Real Estate",
  },
  {
    quote:
      "The AI staging feature alone is worth it. We furnished 40 empty units virtually and leased them up 3 weeks faster.",
    name: "James Rodriguez",
    role: "VP of Marketing, Greystar",
  },
  {
    quote:
      "We replaced our old Matterport workflow with Spazeo. Faster, cheaper, and the quality blew our clients away.",
    name: "Emily Chen",
    role: "Founder, Luminous Properties",
  },
];

function SocialProof() {
  return (
    <section className="py-24 px-12" style={{ background: C.surface }}>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto mb-20 text-center">
        {STATS.map((s) => (
          <div key={s.label}>
            <div
              className="text-4xl font-bold mb-1"
              style={{ color: s.color, fontFamily: "Plus Jakarta Sans, sans-serif" }}
            >
              {s.value}
            </div>
            <div className="text-sm" style={{ color: C.textMuted }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <h2
        className="text-4xl font-bold text-center mb-3"
        style={{ color: C.textPrimary, fontFamily: "Plus Jakarta Sans, sans-serif" }}
      >
        Loved by Real Estate Professionals
      </h2>
      <p className="text-center mb-14" style={{ color: C.textSecondary }}>
        See what our customers say about transforming their business with Spazeo.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {TESTIMONIALS.map((t) => (
          <div
            key={t.name}
            className="rounded-2xl p-6"
            style={{ background: C.elevated, border: `1px solid ${C.border}` }}
          >
            <div className="flex gap-0.5 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={13} fill={C.gold} color={C.gold} />
              ))}
            </div>
            <p className="text-sm leading-relaxed mb-6" style={{ color: C.textSecondary }}>
              "{t.quote}"
            </p>
            <div>
              <p className="text-sm font-semibold" style={{ color: C.textPrimary }}>{t.name}</p>
              <p className="text-xs" style={{ color: C.textMuted }}>{t.role}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: "Starter",
    tagline: "Perfect for trying out virtual tours.",
    price: "$0",
    period: "/month",
    cta: "Get Started Free",
    primary: false,
    popular: false,
    features: ["3 active tours", "Basic panorama viewer", "Shareable links", "Community support"],
  },
  {
    name: "Pro",
    tagline: "For agents and teams who need more.",
    price: "$49",
    period: "/month",
    cta: "Start Pro Trial",
    primary: true,
    popular: true,
    features: [
      "Unlimited tours",
      "Gaussian Splatting 3D engine",
      "AI virtual staging",
      "Analytics dashboard",
      "Custom branding & embed",
      "Priority email support",
    ],
  },
  {
    name: "Enterprise",
    tagline: "For teams and brokerages at scale.",
    price: "Custom",
    period: "",
    cta: "Contact Sales",
    primary: false,
    popular: false,
    features: [
      "Everything in Pro",
      "SSO & role-based access",
      "SOC 2 compliance",
      "Dedicated account manager",
      "White-label options",
      "SLA & 24/7 support",
    ],
  },
];

function Pricing() {
  return (
    <section className="py-24 px-12" style={{ background: C.base }}>
      <SectionLabel>Pricing</SectionLabel>
      <h2
        className="text-4xl md:text-5xl font-bold text-center mb-4"
        style={{ color: C.textPrimary, fontFamily: "Plus Jakarta Sans, sans-serif" }}
      >
        Simple, Transparent Pricing
      </h2>
      <p className="text-center mb-16" style={{ color: C.textSecondary }}>
        Start free. Upgrade when you're ready. No hidden fees, ever.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className="rounded-2xl p-8 relative"
            style={{
              background: p.popular ? C.elevated : "transparent",
              border: `1px solid ${p.popular ? C.gold : C.border}`,
            }}
          >
            {p.popular && (
              <div
                className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap"
                style={{ background: C.gold, color: "#0A0908" }}
              >
                MOST POPULAR
              </div>
            )}
            <p className="text-sm font-medium mb-1" style={{ color: C.textMuted }}>{p.name}</p>
            <p className="text-xs mb-6" style={{ color: C.textSecondary }}>{p.tagline}</p>
            <div className="flex items-baseline gap-1 mb-8">
              <span
                className="font-bold"
                style={{
                  color: p.popular ? C.gold : C.textPrimary,
                  fontSize: p.price === "Custom" ? "2.25rem" : "3rem",
                  fontFamily: "Plus Jakarta Sans, sans-serif",
                  lineHeight: 1,
                }}
              >
                {p.price}
              </span>
              {p.period && (
                <span className="text-sm" style={{ color: C.textMuted }}>{p.period}</span>
              )}
            </div>
            <ul className="flex flex-col gap-3 mb-8">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm" style={{ color: C.textSecondary }}>
                  <Check size={13} color={C.gold} />
                  {f}
                </li>
              ))}
            </ul>
            {p.primary ? (
              <BtnPrimary href="/sign-up">{p.cta}</BtnPrimary>
            ) : (
              <BtnGhost href={p.name === "Enterprise" ? "/contact" : "/sign-up"}>{p.cta}</BtnGhost>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "What is Gaussian Splatting?",
    a: "Gaussian Splatting is a cutting-edge 3D rendering technique that reconstructs photorealistic scenes from images. It creates millions of tiny 3D splats that together form a walkable, depth-aware environment from a single panorama.",
  },
  {
    q: "Do I need a 360° camera?",
    a: "No! While 360° panoramas provide the best results, Spazeo works with standard photos too. Our AI fills in the missing angles using depth estimation and neural rendering.",
  },
  {
    q: "How long does it take to create a tour?",
    a: "Tours are typically ready in about 60 seconds. Upload your image, and our AI handles the 3D reconstruction, enhancement, and publishing automatically.",
  },
  {
    q: "Can viewers experience tours in VR?",
    a: "Yes! Spazeo tours are compatible with WebVR and work with Meta Quest, Apple Vision Pro, and other VR headsets. Simply open the tour link in a VR browser.",
  },
  {
    q: "Is there a free trial?",
    a: "Absolutely. The Starter plan is free forever with up to 3 active tours. Upgrade to Pro anytime with a 14-day free trial — no credit card required.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="py-24 px-12" style={{ background: C.base }}>
      <SectionLabel>FAQ</SectionLabel>
      <h2
        className="text-4xl font-bold text-center mb-16"
        style={{ color: C.textPrimary, fontFamily: "Plus Jakarta Sans, sans-serif" }}
      >
        Frequently Asked Questions
      </h2>
      <div className="max-w-3xl mx-auto flex flex-col gap-2">
        {FAQS.map((f, i) => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden cursor-pointer"
            style={{ border: `1px solid ${C.border}`, background: C.elevated }}
            onClick={() => setOpen(open === i ? null : i)}
          >
            <div className="flex items-center justify-between px-6 py-5">
              <p className="font-medium text-sm" style={{ color: C.textPrimary }}>
                {f.q}
              </p>
              {open === i ? (
                <ChevronUp size={16} color={C.textMuted} className="shrink-0" />
              ) : (
                <ChevronDown size={16} color={C.textMuted} className="shrink-0" />
              )}
            </div>
            {open === i && (
              <div className="px-6 pb-5">
                <p className="text-sm leading-relaxed" style={{ color: C.textSecondary }}>
                  {f.a}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section
      className="relative py-32 px-12 flex flex-col items-center text-center overflow-hidden"
      style={{ background: C.base }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 70% at 50% 50%, ${C.gold}1A 0%, ${C.base} 65%)`,
        }}
      />
      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="w-8 h-1 rounded-full mx-auto mb-8" style={{ background: C.gold }} />
        <h2
          className="text-5xl font-bold mb-6"
          style={{ color: C.textPrimary, fontFamily: "Plus Jakarta Sans, sans-serif" }}
        >
          Ready to Step Inside?
        </h2>
        <p className="mb-10 leading-relaxed" style={{ color: C.textSecondary }}>
          Join thousands of real estate professionals creating immersive experiences with Spazeo.
          Start free — no credit card required.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <BtnPrimary href="/sign-up" icon={<Zap size={13} />}>
            Start Creating Free
          </BtnPrimary>
          <BtnGhost href="/demo">View Live Demo</BtnGhost>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
const FOOTER_LINKS: Record<string, string[]> = {
  Product: ["Features", "Pricing", "Integrations", "Changelog"],
  Company: ["About", "Blog", "Careers", "Contact"],
  Resources: ["Documentation", "Tutorials", "API Reference", "Help Center"],
  Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Security"],
};

const SOCIAL_ICONS = [
  { Icon: Twitter, label: "Twitter" },
  { Icon: Linkedin, label: "LinkedIn" },
  { Icon: Github, label: "GitHub" },
  { Icon: Youtube, label: "YouTube" },
];

function Footer() {
  return (
    <footer
      className="py-16 px-12"
      style={{ background: C.base, borderTop: `1px solid ${C.border}` }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.gold }}>
                <Globe size={13} color="#0A0908" />
              </div>
              <span
                className="font-bold text-sm"
                style={{ color: C.textPrimary, fontFamily: "Plus Jakarta Sans, sans-serif" }}
              >
                SPAZEO<span style={{ color: C.gold }}>✦</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed mb-6" style={{ color: C.textMuted }}>
              Step Inside Any Space. AI-powered 360° virtual tours for real estate professionals. The future of property visualization.
            </p>
            <div className="flex gap-2">
              {SOCIAL_ICONS.map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-80"
                  style={{ background: C.elevated, color: C.textMuted, border: `1px solid ${C.border}` }}
                >
                  <Icon size={13} />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-4"
                style={{ color: C.textPrimary }}
              >
                {section}
              </p>
              <ul className="flex flex-col gap-2.5">
                {links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-xs transition-opacity hover:opacity-80"
                      style={{ color: C.textMuted }}
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderTop: `1px solid ${C.border}` }}
        >
          <p className="text-xs" style={{ color: C.textMuted }}>
            &copy; 2026 Spazeo Inc. All rights reserved.
          </p>
          <p className="text-xs" style={{ color: C.textMuted }}>
            Built with ✦ for the future of real estate
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export function LandingPageContent() {
  return (
    <div style={{ background: C.base, fontFamily: "DM Sans, sans-serif" }}>
      <Navbar />
      <Hero />
      <TrustedBy />
      <HowItWorks />
      <CoreFeatures />
      <FeaturesGrid />
      <ProductShowcase />
      <UseCases />
      <SocialProof />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}
