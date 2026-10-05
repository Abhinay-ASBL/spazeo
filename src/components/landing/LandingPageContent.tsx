"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Globe, Cpu, Link2, BarChart2, Smartphone, Shield,
  ChevronDown, ChevronUp, Zap, Home, Hotel,
  PenTool, ShoppingBag, Check, Play,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const gold    = "#D4A017";
const teal    = "#2DD4BF";
const coral   = "#FB7A54";
const base    = "#0A0908";
const surface   = "#12100E";
const elevated  = "#1B1916";
const border    = "#2A2520";
const txtPri  = "#F5F3EF";
const txtSec  = "#A8A29E";
const txtMut  = "#6B6560";
const success = "#34D399";

// ─── Actual images from Pencil design ─────────────────────────────────────────
const IMG = {
  hero:         "/landing/generated-1771961543309.png",
  gaussian:     "/landing/generated-1771961551586.png",
  aiStaging:    "/landing/generated-1771961578795.png",
  publishing:   "/landing/generated-1771961601311.png",
  realEstate:   "/landing/generated-1771963363988.png",
  hospitality:  "/landing/generated-1771963377099.png",
  architecture: "/landing/generated-1771963388619.png",
  retail:       "/landing/generated-1771963400887.png",
  editor:       "/landing/generated-1771963400538.png",
};

// ─── Atoms ────────────────────────────────────────────────────────────────────
function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: `${gold}18`,
          color: gold,
          border: `1px solid ${gold}30`,
          borderRadius: 99,
          padding: "4px 12px",
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        {children}
      </span>
    </div>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section
      style={{
        position: "relative",
        background: base,
        paddingTop: 160,
        paddingBottom: 80,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      {/* Gold orb */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${gold}15 0%, transparent 60%)`,
          pointerEvents: "none",
        }}
      />
      {/* Teal orb (subtle) */}
      <div
        style={{
          position: "absolute",
          top: "45%",
          right: "8%",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${teal}0C 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 760, padding: "0 24px" }}>
        {/* Badge */}
        <SectionBadge>AI-Powered Virtual Tours</SectionBadge>

        <h1
          style={{
            fontFamily: "Plus Jakarta Sans, sans-serif",
            fontSize: 72,
            fontWeight: 800,
            color: txtPri,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            margin: "0 0 24px",
          }}
        >
          Step Inside Any Space
        </h1>

        <p
          style={{
            fontSize: 20,
            color: txtSec,
            lineHeight: 1.65,
            maxWidth: 560,
            margin: "0 auto 40px",
          }}
        >
          Transform a single panorama into an immersive, walkable 3D experience —
          powered by Gaussian Splatting, AI staging, and depth estimation.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/sign-up"
            style={{
              background: gold,
              color: base,
              fontSize: 15,
              fontWeight: 600,
              padding: "12px 24px",
              borderRadius: 99,
              textDecoration: "none",
            }}
          >
            Start Creating Free
          </Link>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: `${elevated}99`,
              color: txtPri,
              fontSize: 15,
              fontWeight: 500,
              padding: "12px 24px",
              borderRadius: 99,
              border: `1px solid ${border}`,
              cursor: "pointer",
            }}
          >
            <Play size={14} fill={gold} color={gold} />
            Watch Demo
          </button>
        </div>
      </div>

      {/* Hero image from Pencil */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          marginTop: 56,
          width: "calc(100% - 96px)",
          maxWidth: 1200,
          borderRadius: 16,
          overflow: "hidden",
          border: `1px solid ${border}`,
        }}
      >
        <img
          src={IMG.hero}
          alt="Luxury interior panorama — Spazeo tour preview"
          style={{ width: "100%", height: 520, objectFit: "cover", display: "block" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to top, ${base} 0%, transparent 40%)`,
            pointerEvents: "none",
          }}
        />
      </div>
    </section>
  );
}

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────
const STEPS = [
  { num: "1", title: "Upload",          desc: "Drop any 360° panorama or standard photo. Our AI handles the rest." },
  { num: "2", title: "AI Enhances",     desc: "Gaussian Splatting + depth estimation creates true 3D from a single image." },
  { num: "3", title: "Share & Explore", desc: "Get an instant shareable link. Viewers walk through your space on any device." },
];

function HowItWorks() {
  return (
    <section style={{ background: base, padding: "96px 120px" }}>
      <SectionBadge>How It Works</SectionBadge>
      <h2 style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 44, fontWeight: 700, color: txtPri, textAlign: "center", margin: "0 0 16px" }}>
        From Panorama to Walkthrough in Seconds
      </h2>
      <p style={{ textAlign: "center", color: txtSec, fontSize: 16, marginBottom: 56 }}>
        Three simple steps to create immersive virtual experiences.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, maxWidth: 960, margin: "0 auto" }}>
        {STEPS.map((s) => (
          <div key={s.num} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 20, padding: 32 }}>
            <div
              style={{
                width: 44, height: 44, borderRadius: "50%",
                background: `${gold}20`, border: `1px solid ${gold}40`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <span style={{ color: gold, fontSize: 20, fontWeight: 700 }}>{s.num}</span>
            </div>
            <h3 style={{ color: txtPri, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
            <p style={{ color: txtSec, fontSize: 16, lineHeight: 1.6 }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── CORE FEATURES ────────────────────────────────────────────────────────────
const CORE_FEATURES = [
  {
    title: "Gaussian Splatting Engine",
    desc: "Convert flat panoramas into photorealistic 3D environments. Our neural rendering creates depth and parallax that feels like being there.",
    bullets: ["Real-time neural rendering", "Photorealistic depth from single images", "Works with any panorama format"],
    img: IMG.gaussian, imgAlt: "Colorful 3D Gaussian Splat visualization", reverse: false,
  },
  {
    title: "AI Virtual Staging",
    desc: "Furnish empty spaces instantly. Our AI adds photorealistic furniture, decor, and styling matched to any design aesthetic.",
    bullets: ["Multiple design styles available", "Photorealistic furniture placement", "One-click staging transformations"],
    img: IMG.aiStaging, imgAlt: "AI virtually staged luxury living room", reverse: true,
  },
  {
    title: "One-Click Publishing",
    desc: "Share immersive tours with a single link. Embed on your website, share on social, or add to your MLS listing.",
    bullets: ["Shareable links in one click", "Website embed & social sharing", "MLS & real estate platform integration"],
    img: IMG.publishing, imgAlt: "Person publishing a tour on laptop and tablet", reverse: false,
  },
];

function CoreFeatures() {
  return (
    <section style={{ background: base, padding: "80px 120px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column", gap: 96 }}>
        {CORE_FEATURES.map((f) => (
          <div
            key={f.title}
            style={{
              display: "flex",
              flexDirection: f.reverse ? "row-reverse" : "row",
              alignItems: "center",
              gap: 64,
            }}
          >
            <div style={{ flex: 1 }}>
              <h3 style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 36, fontWeight: 700, color: txtPri, marginBottom: 16 }}>
                {f.title}
              </h3>
              <p style={{ color: txtSec, fontSize: 18, lineHeight: 1.65, marginBottom: 24 }}>{f.desc}</p>
              <ul style={{ display: "flex", flexDirection: "column", gap: 10, listStyle: "none", padding: 0, margin: 0 }}>
                {f.bullets.map((b) => (
                  <li key={b} style={{ display: "flex", alignItems: "center", gap: 10, color: txtSec, fontSize: 15 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: teal, flexShrink: 0, display: "inline-block" }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ flex: 1, borderRadius: 16, overflow: "hidden", border: `1px solid ${border}` }}>
              <img src={f.img} alt={f.imgAlt} style={{ width: "100%", height: 380, objectFit: "cover", display: "block" }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── FEATURES GRID ────────────────────────────────────────────────────────────
const FEATURE_CARDS = [
  { icon: <Globe size={20} />,      bg: `${gold}18`,  color: gold,  title: "360° Panorama Viewer",  desc: "Interactive drag-to-explore viewer with smooth transitions and hotspot navigation." },
  { icon: <Cpu size={20} />,        bg: `${teal}18`,  color: teal,  title: "Depth Estimation AI",   desc: "Automatic depth maps from 2D photos create parallax and real 3D perception." },
  { icon: <Link2 size={20} />,      bg: `${coral}18`, color: coral, title: "One-Link Sharing",      desc: "Share tours instantly via link, embed on websites, or add to MLS listings." },
  { icon: <BarChart2 size={20} />,  bg: `${teal}18`,  color: teal,  title: "Analytics Dashboard",  desc: "Track views, engagement time, hotspot clicks, and visitor behavior in real time." },
  { icon: <Smartphone size={20} />, bg: `${gold}18`,  color: gold,  title: "Works on Any Device",  desc: "Responsive tours that look stunning on desktop, tablet, mobile, and VR headsets." },
  { icon: <Shield size={20} />,     bg: `${coral}18`, color: coral, title: "Enterprise Security",   desc: "SSO, role-based access, password-protected tours, and audit logs." },
];

function FeaturesGrid() {
  return (
    <section style={{ background: base, padding: "96px 120px" }}>
      <SectionBadge>All Features</SectionBadge>
      <h2 style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 44, fontWeight: 700, color: txtPri, textAlign: "center", maxWidth: 520, margin: "0 auto 16px", lineHeight: 1.2 }}>
        Everything You Need to Create Stunning Tours
      </h2>
      <p style={{ textAlign: "center", color: txtSec, fontSize: 16, maxWidth: 520, margin: "0 auto 56px" }}>
        Powerful tools that work behind the scenes so you can focus on showcasing spaces.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, maxWidth: 960, margin: "0 auto" }}>
        {FEATURE_CARDS.map((f) => (
          <div key={f.title} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 20, padding: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: f.bg, color: f.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              {f.icon}
            </div>
            <h4 style={{ color: txtPri, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{f.title}</h4>
            <p style={{ color: txtSec, fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── PRODUCT SHOWCASE ─────────────────────────────────────────────────────────
const SHOWCASE_CARDS = [
  { num: "01", color: gold,  bg: `${gold}15`,  title: "Upload Panoramas",      desc: "Drag and drop your 360° panoramic images. We support all major formats and resolutions." },
  { num: "02", color: teal,  bg: `${teal}15`,  title: "Add Hotspots & Scenes", desc: "Place interactive markers, link rooms together, and build a seamless spatial navigation flow." },
  { num: "03", color: coral, bg: `${coral}15`, title: "Publish & Share",        desc: "One click to publish your tour. Share via link, embed on your website, or send directly to clients." },
];

function ProductShowcase() {
  return (
    <section style={{ background: surface, padding: "96px 120px" }}>
      <SectionBadge>Product</SectionBadge>
      <h2 style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 44, fontWeight: 700, color: txtPri, textAlign: "center", marginBottom: 16 }}>
        Stunning Virtual Tours, Incredibly Easy
      </h2>
      <p style={{ textAlign: "center", color: txtSec, fontSize: 18, maxWidth: 640, margin: "0 auto 48px", lineHeight: 1.6 }}>
        Upload panoramas, add hotspots, link scenes, and publish immersive virtual tours —
        all from one powerful editor built for real estate professionals.
      </p>

      {/* App mockup — actual editor screenshot from Pencil */}
      <div style={{ maxWidth: 960, margin: "0 auto 48px", borderRadius: 16, overflow: "hidden", border: `1px solid ${border}` }}>
        <div style={{ background: elevated, padding: "10px 16px", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#F87171", display: "inline-block" }} />
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#FBBF24", display: "inline-block" }} />
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#34D399", display: "inline-block" }} />
          <span style={{ color: txtMut, fontSize: 13, fontWeight: 500, marginLeft: 8 }}>Spazeo Tour Editor</span>
          <div style={{ marginLeft: "auto" }}>
            <span style={{ background: gold, color: base, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6 }}>Publish</span>
          </div>
        </div>
        <img src={IMG.editor} alt="Spazeo editor — Virtual Explorer Pro with coastal panorama" style={{ width: "100%", height: 480, objectFit: "cover", display: "block" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, maxWidth: 960, margin: "0 auto" }}>
        {SHOWCASE_CARDS.map((c) => (
          <div key={c.title} style={{ background: elevated, border: `1px solid ${border}`, borderRadius: 20, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: c.bg, color: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
                {c.num}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: c.color, background: `${c.color}20`, padding: "2px 8px", borderRadius: 99 }}>
                Step {c.num}
              </span>
            </div>
            <h4 style={{ color: txtPri, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{c.title}</h4>
            <p style={{ color: txtSec, fontSize: 14, lineHeight: 1.6 }}>{c.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── USE CASES ────────────────────────────────────────────────────────────────
const USE_CASES = [
  { icon: <Home size={16} />,       iconBg: `${gold}18`,  iconColor: gold,  title: "Real Estate",        desc: "Sell properties faster with immersive virtual tours that let buyers explore every room before visiting.", img: IMG.realEstate },
  { icon: <Hotel size={16} />,      iconBg: `${teal}18`,  iconColor: teal,  title: "Hospitality",        desc: "Boost hotel bookings by letting guests virtually walk through suites, amenities, and event spaces.",      img: IMG.hospitality },
  { icon: <PenTool size={16} />,    iconBg: `${coral}18`, iconColor: coral, title: "Architecture",       desc: "Present design concepts as walkable 3D spaces. Clients feel the scale and flow before construction.",      img: IMG.architecture },
  { icon: <ShoppingBag size={16} />,iconBg: `${gold}18`,  iconColor: gold,  title: "Retail & Showrooms", desc: "Turn physical showrooms into 24/7 virtual stores. Customers browse products in context, anywhere.",         img: IMG.retail },
];

function UseCases() {
  return (
    <section style={{ background: base, padding: "96px 120px" }}>
      <SectionBadge>Use Cases</SectionBadge>
      <h2 style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 44, fontWeight: 700, color: txtPri, textAlign: "center", marginBottom: 16 }}>
        Built for Every Space
      </h2>
      <p style={{ textAlign: "center", color: txtSec, fontSize: 16, maxWidth: 540, margin: "0 auto 56px" }}>
        From luxury homes to global hotel chains — Spazeo powers immersive experiences across industries.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, maxWidth: 960, margin: "0 auto" }}>
        {USE_CASES.map((u) => (
          <div key={u.title} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 20, overflow: "hidden" }}>
            <img src={u.img} alt={u.title} style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
            <div style={{ padding: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: u.iconBg, color: u.iconColor, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                {u.icon}
              </div>
              <h4 style={{ color: txtPri, fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{u.title}</h4>
              <p style={{ color: txtSec, fontSize: 14, lineHeight: 1.6 }}>{u.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── PRICING ──────────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: "Starter", desc: "Perfect for trying out virtual tours.",
    price: "$0", period: "/month", popular: false,
    ctaLabel: "Get Started Free", ctaHref: "/sign-up",
    ctaColor: gold, ctaBg: "transparent", ctaBorder: `1px solid ${border}`,
    checkColor: success,
    features: ["3 active tours", "Basic panorama viewer", "Shareable links", "Community support"],
  },
  {
    name: "Pro", desc: "For agents and teams who need more.",
    price: "$49", period: "/month", popular: true,
    ctaLabel: "Start Pro Trial", ctaHref: "/sign-up",
    ctaColor: base, ctaBg: gold, ctaBorder: "none",
    checkColor: gold,
    features: ["Unlimited tours", "Gaussian Splatting 3D engine", "AI virtual staging", "Analytics dashboard", "Custom branding + embed", "Priority email support"],
  },
  {
    name: "Enterprise", desc: "For teams and brokerages at scale.",
    price: "Custom", period: "", popular: false,
    ctaLabel: "Contact Sales", ctaHref: "/contact",
    ctaColor: teal, ctaBg: "transparent", ctaBorder: `1px solid ${teal}40`,
    checkColor: teal,
    features: ["Everything in Pro", "SSO & role-based access", "Dedicated account manager", "White-label option", "SLA & 24/7 support"],
  },
];

function Pricing() {
  return (
    <section style={{ background: base, padding: "96px 120px" }}>
      <SectionBadge>Pricing</SectionBadge>
      <h2 style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 44, fontWeight: 700, color: txtPri, textAlign: "center", marginBottom: 16 }}>
        Simple, Transparent Pricing
      </h2>
      <p style={{ textAlign: "center", color: txtSec, fontSize: 16, marginBottom: 56 }}>
        Start free. Upgrade when you&apos;re ready. No hidden fees, ever.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, maxWidth: 960, margin: "0 auto", alignItems: "start" }}>
        {PLANS.map((p) => (
          <div
            key={p.name}
            style={{
              position: "relative",
              background: surface,
              border: `1px solid ${p.popular ? gold : border}`,
              borderRadius: 20,
              padding: 32,
            }}
          >
            {p.popular && (
              <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: gold, color: base, fontSize: 11, fontWeight: 600, padding: "4px 14px", borderRadius: 99, whiteSpace: "nowrap" }}>
                MOST POPULAR
              </div>
            )}
            <h3 style={{ color: txtPri, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{p.name}</h3>
            <p style={{ color: txtSec, fontSize: 14, marginBottom: 24 }}>{p.desc}</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 24 }}>
              <span style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: p.price === "Custom" ? 40 : 48, fontWeight: 900, color: p.popular ? gold : txtPri, lineHeight: 1 }}>
                {p.price}
              </span>
              {p.period && <span style={{ color: txtMut, fontSize: 16 }}>{p.period}</span>}
            </div>
            <div style={{ height: 1, background: border, marginBottom: 24 }} />
            <ul style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28, listStyle: "none", padding: 0, margin: "0 0 28px" }}>
              {p.features.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, color: txtSec, fontSize: 14 }}>
                  <Check size={14} color={p.checkColor} />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={p.ctaHref}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "11px 20px",
                borderRadius: 99,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                color: p.ctaColor,
                background: p.ctaBg,
                border: p.ctaBorder,
              }}
            >
              {p.ctaLabel}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQS = [
  { q: "What is Gaussian Splatting?",              a: "Gaussian Splatting is a cutting-edge 3D rendering technique that reconstructs photorealistic scenes from images. It creates millions of tiny 3D 'splats' that together form a walkable, depth-aware environment from a single panorama." },
  { q: "Do I need a 360° camera?",                 a: "No! While 360° panoramas provide the best results, Spazeo works with standard photos too. Our AI fills in the missing angles using depth estimation and neural rendering." },
  { q: "How long does it take to create a tour?",  a: "Most tours are ready in under 60 seconds. Upload your image, and our AI handles the 3D reconstruction, enhancement, and publishing automatically." },
  { q: "Can viewers experience tours in VR?",      a: "Yes! Spazeo tours are compatible with WebXR and work with Meta Quest, Apple Vision Pro, and other VR headsets. Simply open the tour link in a VR browser." },
  { q: "Is there a free trial?",                   a: "Absolutely. The Starter plan is free forever with up to 3 active tours. Upgrade to Pro anytime with a 14-day free trial — no credit card required." },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section style={{ background: base, padding: "96px 120px" }}>
      <SectionBadge>FAQ</SectionBadge>
      <h2 style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 44, fontWeight: 700, color: txtPri, textAlign: "center", marginBottom: 56 }}>
        Frequently Asked Questions
      </h2>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {FAQS.map((f, i) => (
          <div
            key={i}
            onClick={() => setOpen(open === i ? null : i)}
            style={{ background: elevated, border: `1px solid ${open === i ? gold + "40" : border}`, borderRadius: 16, overflow: "hidden", cursor: "pointer" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px" }}>
              <span style={{ color: txtPri, fontSize: 18, fontWeight: 600 }}>{f.q}</span>
              {open === i ? <ChevronUp size={18} color={txtMut} /> : <ChevronDown size={18} color={txtMut} />}
            </div>
            {open === i && (
              <div style={{ padding: "0 24px 20px" }}>
                <p style={{ color: txtSec, fontSize: 15, lineHeight: 1.7 }}>{f.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── FINAL CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section style={{ position: "relative", background: base, padding: "120px 48px", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 70% 80% at 50% 50%, ${gold}1C 0%, ${base} 65%)`, pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 640 }}>
        <div style={{ width: 40, height: 3, background: gold, borderRadius: 99, margin: "0 auto 32px" }} />
        <h2 style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 52, fontWeight: 800, color: txtPri, lineHeight: 1.1, marginBottom: 20 }}>
          Ready to Step Inside?
        </h2>
        <p style={{ color: txtSec, fontSize: 16, lineHeight: 1.7, marginBottom: 36 }}>
          Join thousands of real estate professionals creating immersive experiences with Spazeo.
          Start free — no credit card required.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/sign-up"
            style={{ display: "flex", alignItems: "center", gap: 8, background: coral, color: "#fff", fontSize: 16, fontWeight: 600, padding: "13px 24px", borderRadius: 99, textDecoration: "none" }}
          >
            <Zap size={16} />
            Start Creating Free
          </Link>
          <button
            style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", color: gold, fontSize: 16, fontWeight: 600, padding: "13px 24px", borderRadius: 99, border: `1px solid ${border}`, cursor: "pointer" }}
          >
            <Play size={14} fill={gold} color={gold} />
            Watch Demo
          </button>
        </div>
        <p style={{ color: txtMut, fontSize: 13, marginTop: 20 }}>
          Free forever for up to 3 tours &nbsp;·&nbsp; No credit card &nbsp;·&nbsp; Setup in 30 seconds
        </p>
      </div>
    </section>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export function LandingPageContent() {
  return (
    <div style={{ background: base, fontFamily: "DM Sans, sans-serif" }}>
      <Navbar />
      <Hero />
      <HowItWorks />
      <CoreFeatures />
      <FeaturesGrid />
      <ProductShowcase />
      <UseCases />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}
