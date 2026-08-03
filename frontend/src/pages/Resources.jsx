/**
 * Resources.jsx — Trusted health resources organized by disease.
 * Public page — accessible without login.
 * Uses Sidebar layout when authenticated, standalone header when public.
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

const DISEASES = [
  {
    key: "diabetes",
    label: "Diabetes",
    dot: "var(--chart-clay)",
    color: "#A0522D",
    description: "Resources for understanding, preventing, and managing diabetes mellitus.",
    resources: [
      {
        title: "WHO — Diabetes Overview",
        url: "https://www.who.int/news-room/fact-sheets/detail/diabetes",
        org: "World Health Organization",
        type: "Fact Sheet",
        desc: "Global statistics, risk factors, and WHO recommendations for diabetes prevention.",
      },
      {
        title: "CDC — Diabetes Prevention Program",
        url: "https://www.cdc.gov/diabetes/prevention/index.html",
        org: "US Centers for Disease Control",
        type: "Prevention",
        desc: "Evidence-based lifestyle program to reduce risk of type 2 diabetes by up to 58%.",
      },
      {
        title: "American Diabetes Association — Standards of Care",
        url: "https://diabetesjournals.org/care/issue/47/Supplement_1",
        org: "ADA",
        type: "Clinical Guidelines",
        desc: "Annual clinical practice guidelines covering screening, diagnosis, and management.",
      },
      {
        title: "NIDDK — Diabetes Diet & Eating",
        url: "https://www.niddk.nih.gov/health-information/diabetes/overview/diet-eating-physical-activity",
        org: "National Institute of Diabetes",
        type: "Patient Education",
        desc: "Plain-language guidance on meal planning, physical activity, and blood sugar control.",
      },
    ],
  },
  {
    key: "heart",
    label: "Heart Disease",
    dot: "var(--chart-plum)",
    color: "#7B3F7F",
    description: "Resources on cardiovascular health, risk reduction, and cardiac care.",
    resources: [
      {
        title: "WHO — Cardiovascular Diseases",
        url: "https://www.who.int/news-room/fact-sheets/detail/cardiovascular-diseases-(cvds)",
        org: "World Health Organization",
        type: "Fact Sheet",
        desc: "Leading cause of death globally — WHO data, risk factors, and prevention strategies.",
      },
      {
        title: "American Heart Association — Know Your Risk",
        url: "https://www.heart.org/en/health-topics/heart-attack/understand-your-risks-to-prevent-a-heart-attack",
        org: "AHA",
        type: "Risk Assessment",
        desc: "Interactive tools and guidance to understand personal cardiovascular risk factors.",
      },
      {
        title: "ESC — Guidelines on Cardiovascular Prevention",
        url: "https://www.escardio.org/Guidelines/Clinical-Practice-Guidelines/CVD-Prevention",
        org: "European Society of Cardiology",
        type: "Clinical Guidelines",
        desc: "2021 ESC guidelines for cardiovascular disease prevention in clinical practice.",
      },
      {
        title: "NHLBI — Heart-Healthy Living",
        url: "https://www.nhlbi.nih.gov/health/heart-healthy-living",
        org: "National Heart, Lung & Blood Institute",
        type: "Patient Education",
        desc: "Practical steps — diet, exercise, stress, and sleep — for a heart-healthy lifestyle.",
      },
    ],
  },
  {
    key: "tb",
    label: "Tuberculosis",
    dot: "var(--chart-slate)",
    color: "#4A6FA5",
    description: "Resources on TB prevention, diagnosis, treatment, and global elimination goals.",
    resources: [
      {
        title: "WHO — Tuberculosis Fact Sheet",
        url: "https://www.who.int/news-room/fact-sheets/detail/tuberculosis",
        org: "World Health Organization",
        type: "Fact Sheet",
        desc: "Global burden of TB, drug-resistant TB, and WHO End TB Strategy targets.",
      },
      {
        title: "CDC — TB Disease & Latent TB",
        url: "https://www.cdc.gov/tb/topic/basics/default.htm",
        org: "US Centers for Disease Control",
        type: "Disease Overview",
        desc: "Explains the difference between latent TB infection and TB disease, and how each is treated.",
      },
      {
        title: "Stop TB Partnership",
        url: "https://www.stoptb.org/",
        org: "Stop TB Partnership",
        type: "Global Initiative",
        desc: "International coalition working toward a TB-free world — news, data, and funding.",
      },
      {
        title: "NTEP — India National TB Programme",
        url: "https://tbcindia.gov.in/",
        org: "Government of India",
        type: "National Programme",
        desc: "India's national TB elimination programme with resources for patients and providers.",
      },
    ],
  },
  {
    key: "cancer",
    label: "Lung Cancer",
    dot: "var(--chart-gold)",
    color: "#C8941A",
    description: "Resources on lung cancer screening, risk factors, and treatment advances.",
    resources: [
      {
        title: "WHO — Cancer Overview",
        url: "https://www.who.int/news-room/fact-sheets/detail/cancer",
        org: "World Health Organization",
        type: "Fact Sheet",
        desc: "Global cancer burden, early detection importance, and WHO cancer control strategy.",
      },
      {
        title: "American Cancer Society — Lung Cancer",
        url: "https://www.cancer.org/cancer/types/lung-cancer.html",
        org: "American Cancer Society",
        type: "Disease Overview",
        desc: "Comprehensive overview of non-small cell and small cell lung cancer, staging, and treatment.",
      },
      {
        title: "USPSTF — Lung Cancer Screening Recommendation",
        url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/lung-cancer-screening",
        org: "USPSTF",
        type: "Screening Guidelines",
        desc: "Recommended annual low-dose CT screening for adults 50–80 with heavy smoking history.",
      },
      {
        title: "LUNGevity Foundation",
        url: "https://lungevity.org/",
        org: "LUNGevity",
        type: "Patient Support",
        desc: "Patient support, clinical trial finder, and research funding for lung cancer.",
      },
    ],
  },
];

const TYPE_COLORS = {
  "Fact Sheet":        "bg-blue-50 text-blue-700 border-blue-200",
  "Prevention":        "bg-green-50 text-green-700 border-green-200",
  "Clinical Guidelines":"bg-purple-50 text-purple-700 border-purple-200",
  "Patient Education": "bg-amber-50 text-amber-700 border-amber-200",
  "Risk Assessment":   "bg-rose-50 text-rose-700 border-rose-200",
  "Disease Overview":  "bg-sky-50 text-sky-700 border-sky-200",
  "Global Initiative": "bg-teal-50 text-teal-700 border-teal-200",
  "National Programme":"bg-orange-50 text-orange-700 border-orange-200",
  "Screening Guidelines":"bg-indigo-50 text-indigo-700 border-indigo-200",
  "Patient Support":   "bg-pink-50 text-pink-700 border-pink-200",
};

function ResourceCard({ resource }) {
  const badgeClass = TYPE_COLORS[resource.type] || "bg-parchment text-ink-ghost border-border";
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-2 p-4 bg-white border border-border rounded-xl
        hover:border-terra hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-ink group-hover:text-terra transition-colors leading-snug">
          {resource.title}
        </p>
        <svg className="w-3.5 h-3.5 text-ink-ghost shrink-0 mt-0.5 group-hover:text-terra transition-colors"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>
      <p className="text-xs text-ink-light leading-relaxed">{resource.desc}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badgeClass}`}>
          {resource.type}
        </span>
        <span className="text-[10px] text-ink-ghost">{resource.org}</span>
      </div>
    </a>
  );
}

export default function Resources() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("diabetes");
  const active = DISEASES.find((d) => d.key === activeTab);

  const content = (
    <>
      {/* Header */}
      <header className="mb-6 sm:mb-8 animate-fade-up">
        <p className="text-[10px] font-mono tracking-widest text-ink-ghost uppercase mb-2">
          Trusted Information
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink mb-2">Health Resources</h1>
        <p className="text-ink-light text-sm max-w-xl">
          Curated links to guidelines, fact sheets, and patient education from the world's
          leading health organisations — WHO, CDC, AHA, and more.
        </p>
      </header>

      {/* Disease tabs */}
      <div className="flex flex-wrap gap-2 mb-6 sm:mb-8 animate-fade-up overflow-x-auto scrollbar-hide" style={{ animationDelay: "50ms" }}>
        {DISEASES.map((d) => (
          <button
            key={d.key}
            onClick={() => setActiveTab(d.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shrink-0
              border transition-all active:scale-[0.95] ${
                activeTab === d.key
                  ? "border-terra bg-terra text-white shadow-sm shadow-terra/20"
                  : "border-border bg-white text-ink-mid hover:border-terra/50 hover:text-ink"
              }`}
            style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)", transitionDuration: "200ms" }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: activeTab === d.key ? "white" : d.dot }}
            />
            {d.label}
          </button>
        ))}
      </div>

      {/* Active disease section */}
      {active && (
        <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
          <div className="mb-5 sm:mb-6">
            <h2 className="font-display text-xl font-semibold text-ink mb-1">{active.label}</h2>
            <p className="text-sm text-ink-light">{active.description}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {active.resources.map((r) => (
              <ResourceCard key={r.url} resource={r} />
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="mt-8 sm:mt-10 text-xs text-ink-ghost leading-relaxed max-w-xl">
        These resources are from reputable public-health organisations and are provided for
        informational purposes only. TraceHealth does not endorse any specific treatment,
        product, or clinical pathway. Always consult a qualified healthcare professional.
      </p>
    </>
  );

  if (isAuthenticated) {
    return (
      <div className="page-shell">
        <Sidebar />
        <main className="page-main bg-parchment">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {content}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment">
      <Header />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">{content}</div>
    </div>
  );
}

