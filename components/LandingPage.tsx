"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, Check, Gauge, MessageSquare, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { AngelosAvatar } from "@/components/AngelosAvatar";
import { config } from "@/lib/config";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const features = [
  {
    icon: MessageSquare,
    title: "Real-time DM replies",
    body: "Angellos analyzes the prospect context and drafts a reply aligned with your offer.",
  },
  {
    icon: ShieldCheck,
    title: "Human supervision",
    body: "Auto, supervised, or off per conversation, with pending messages ready to copy.",
  },
  {
    icon: Gauge,
    title: "Assisted follow-ups",
    body: "H23, D+3, and D+10 stay structured to maximize replies without damaging the relationship.",
  },
];

const proofPoints = ["24h window respected", "Refine with Angellos", "Traceable history", "CRM dashboard"];

export function LandingPage() {
  const rootRef = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          reduce: "(prefers-reduced-motion: reduce)",
          animate: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const reduce = context.conditions?.reduce;

          if (reduce) {
            gsap.set("[data-hero], [data-reveal], [data-card], [data-message]", {
              autoAlpha: 1,
              y: 0,
              scale: 1,
            });
            return;
          }

          const hero = gsap.timeline({ defaults: { ease: "power3.out" } });
          hero
            .from("[data-hero='eyebrow']", { autoAlpha: 0, y: 12, duration: 0.45 })
            .from("[data-hero='title']", { autoAlpha: 0, y: 22, duration: 0.72 }, "-=0.2")
            .from("[data-hero='subtitle']", { autoAlpha: 0, y: 16, duration: 0.58 }, "-=0.34")
            .from("[data-hero='cta']", { autoAlpha: 0, y: 10, scale: 0.98, duration: 0.5 }, "-=0.22")
            .from("[data-hero='mockup']", { autoAlpha: 0, y: 30, scale: 0.985, duration: 0.78 }, "-=0.28")
            .from("[data-message]", { autoAlpha: 0, y: 12, duration: 0.42, stagger: 0.09 }, "-=0.48");

          gsap.to("[data-ai-pulse]", {
            autoAlpha: 0.42,
            scale: 1.08,
            duration: 1.45,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
          });

          gsap.to("[data-working-dot]", {
            y: -4,
            duration: 0.42,
            ease: "sine.inOut",
            stagger: 0.12,
            repeat: -1,
            yoyo: true,
          });

          gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((section) => {
            gsap.from(section, {
              autoAlpha: 0,
              y: 28,
              duration: 0.62,
              ease: "power3.out",
              scrollTrigger: {
                trigger: section,
                start: "top 84%",
                once: true,
              },
            });
          });

          ScrollTrigger.batch("[data-card]", {
            start: "top 88%",
            once: true,
            interval: 0.08,
            batchMax: 4,
            onEnter: (batch) => {
              gsap.from(batch, {
                autoAlpha: 0,
                y: 22,
                duration: 0.52,
                ease: "power3.out",
                stagger: 0.08,
                overwrite: "auto",
              });
            },
          });
        }
      );

      return () => mm.revert();
    },
    { scope: rootRef }
  );

  return (
    <main ref={rootRef} className="landing-page">
      <nav className="landing-nav" aria-label="Main navigation">
        <Link href="/" className="landing-brand" aria-label={`${config.agentName} home`}>
          <AngelosAvatar size={34} radius={9} shadow="0 8px 24px rgba(0, 149, 246, 0.18)" />
          <span>{config.agentName}</span>
        </Link>
        <div className="landing-nav-actions">
          <Link className="landing-nav-link" href="/login">
            Login
          </Link>
          <Link className="landing-button landing-button-dark" href="/login">
            Open dashboard
            <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p data-hero="eyebrow" className="landing-eyebrow">
            AI setter agent for Instagram conversations
          </p>
          <h1 data-hero="title" id="landing-title">
            Turn your DMs into qualified appointments.
          </h1>
          <p data-hero="subtitle" className="landing-subtitle">
            {config.agentName} replies, follows up, and learns from your corrections to keep a human voice
            that is fast and consistent with the way you sell.
          </p>
          <div data-hero="cta" className="landing-hero-actions">
            <Link className="landing-button landing-button-dark landing-button-lg" href="/login">
              Access dashboard
              <ArrowRight size={18} />
            </Link>
            <Link className="landing-button landing-button-soft landing-button-lg" href="/crm">
              View CRM
            </Link>
          </div>
        </div>

        <div data-hero="mockup" className="landing-dashboard-shell" aria-label="Angellos dashboard preview">
          <div className="landing-dashboard-topbar">
            <div className="landing-window-controls" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <span>Active conversation</span>
            <div className="landing-mode-pill">Auto</div>
          </div>

          <div className="landing-dashboard-grid">
            <aside className="landing-prospect-rail" aria-label="Prospects">
              {["New lead", "Page sent", "Call booked"].map((status, index) => (
                <div key={status} className="landing-prospect-row" data-card>
                  <span className="landing-prospect-avatar" />
                  <div>
                    <strong>{status}</strong>
                    <span>{index === 0 ? "reply in progress" : "follow-up ready"}</span>
                  </div>
                </div>
              ))}
            </aside>

            <div className="landing-message-panel">
              <div data-message className="landing-message landing-message-user">
                I'm interested, but I'm afraid the AI will sound too robotic.
              </div>
              <div data-message className="landing-message landing-message-ai">
                <div className="landing-ai-header">
                  <span className="landing-ai-indicator">
                    <span data-ai-pulse />
                  </span>
                  {config.agentName} is drafting
                  <span className="landing-working-dots" aria-hidden="true">
                    <span data-working-dot />
                    <span data-working-dot />
                    <span data-working-dot />
                  </span>
                </div>
                <p>
                  I totally get it. The goal is exactly to keep your tone, then let you approve sensitive
                  messages before they are sent.
                </p>
              </div>
              <div data-message className="landing-pending-banner">
                <Sparkles size={16} />
                Message ready to refine or send
              </div>
            </div>
          </div>
        </div>
      </section>

      <section data-reveal className="landing-proof-band" aria-label="Highlights">
        {proofPoints.map((point) => (
          <div key={point} className="landing-proof-item" data-card>
            <Check size={16} />
            <span>{point}</span>
          </div>
        ))}
      </section>

      <section data-reveal className="landing-section" aria-labelledby="features-title">
        <div className="landing-section-heading">
          <p className="landing-eyebrow">Built to convert without pressure</p>
          <h2 id="features-title">AI that is framed, visible, and controllable.</h2>
        </div>
        <div className="landing-feature-grid">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="landing-feature-card" data-card>
                <div className="landing-feature-icon">
                  <Icon size={20} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section data-reveal className="landing-section landing-flow-section" aria-labelledby="flow-title">
        <div className="landing-section-heading">
          <p className="landing-eyebrow">Feedback loop</p>
          <h2 id="flow-title">Every correction makes Angellos sound more like you.</h2>
        </div>
        <div className="landing-flow">
          {["Generate", "Supervise", "Refine", "Learn"].map((step, index) => (
            <div key={step} className="landing-flow-step" data-card>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>

      <section data-reveal className="landing-final-cta" aria-labelledby="cta-title">
        <Zap size={22} />
        <h2 id="cta-title">Your AI CRM, ready to work with you.</h2>
        <Link className="landing-button landing-button-dark landing-button-lg" href="/login">
          Enter {config.agentName}
          <ArrowRight size={18} />
        </Link>
      </section>
    </main>
  );
}
