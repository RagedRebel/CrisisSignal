"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, CheckCircle, Scale, Users, Cpu, FileText } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#090d16] text-foreground p-6 space-y-6 max-w-4xl mx-auto text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded bg-slate-800 hover:bg-slate-700 p-2 text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-primary" />
              CrisisSignal Priority Engine — About & Project Scope
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Problem Statement 1: Emergency Response Coordination After Disasters
            </p>
          </div>
        </div>
      </div>

      {/* Core Mission */}
      <div className="rounded-xl border border-primary/30 bg-primary/10 p-5 space-y-2">
        <h2 className="text-base font-bold text-white">The Core Insight</h2>
        <p className="text-slate-300 leading-relaxed">
          When urban floods hit, control rooms are inundated with duplicated, unverified calls and social media complaints. Well-connected, affluent corridors produce high volume for minor water puddles, while remote or flooded informal settlements suffer telecommunications outages and produce zero reports.
        </p>
        <p className="text-slate-300 leading-relaxed font-semibold">
          CrisisSignal solves this with two foundational innovations: (1) An explainable multi-factor ranking queue with character-level evidence spans, and (2) A Silence Layer with a Fairness Boost that treats the absence of reports from high-exposure zones as an urgent signal, not low priority.
        </p>
      </div>

      {/* Explicit Scope Limits as Required */}
      <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-5 space-y-3">
        <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
          <Scale className="h-4 w-4 text-amber-400" /> Explicit Scope Boundaries & Safety Disclaimers
        </h3>
        <ul className="space-y-2 text-slate-300 list-disc pl-5 leading-relaxed">
          <li>
            <b>Hazard Scope:</b> Configured specifically for flood emergencies (riverine crests, canal breaches, and urban waterlogging) for the hackathon evaluation.
          </li>
          <li>
            <b>Decision Support Only:</b> The system only recommends priorities and flags quiet zones; human coordinators retain final dispatch authority. It is NOT a certified 911/112 CAD telephony system.
          </li>
          <li>
            <b>No Physical Dispatching:</b> &quot;Dispatch&quot; is a simulated confirmation step recorded exclusively in the local audit log. Nothing is dispatched in the real world.
          </li>
          <li>
            <b>Historical Replay, Not Live Data:</b> The scenario replays the real Bengaluru flood window of 22 August – 7 September 2022. Every event in the replay — KSNDMC-style gauge telemetry, official bulletins, citizen calls, SMS, volunteer reports and social posts — is synthetic data generated offline. Zone populations, vulnerability indices and connectivity levels are modelled estimates, and nothing represents live incident data.
          </li>
          <li>
            <b>Default Weights:</b> Factor weights are sensible defaults that require tuning and calibration in collaboration with local disaster management authorities (NDMA/SDRF).
          </li>
        </ul>
      </div>

      {/* Four Judging Criteria Alignment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-slate-900/40 p-4 space-y-2">
          <h4 className="font-bold text-white text-xs flex items-center gap-1.5 text-emerald-400">
            <CheckCircle className="h-4 w-4" /> 1. Feasibility on Realistic Inputs
          </h4>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Handles messy Kannada-influenced English (Kanglish), Hindi, and Hinglish with typos. Includes rule-based fallback extractors and prebuilt JSON so it runs 100% offline at any demo venue without API keys.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-slate-900/40 p-4 space-y-2">
          <h4 className="font-bold text-white text-xs flex items-center gap-1.5 text-primary">
            <CheckCircle className="h-4 w-4" /> 2. Transparent Logic (&quot;Why #1&quot;)
          </h4>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Coordinators can view the stacked bar breakdown for every factor, confirmed facts vs unknowns, and inspect the raw incoming text with highlighted character-level evidence spans.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-slate-900/40 p-4 space-y-2">
          <h4 className="font-bold text-white text-xs flex items-center gap-1.5 text-purple-400">
            <CheckCircle className="h-4 w-4" /> 3. Equitable Focus (Silence Layer)
          </h4>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            The Silence Layer combines flood exposure, digital divide gaps, and neighbor flood signals to detect wards that went quiet. Case (b) Kogilu layout isolation gets the Fairness Boost and stays visible despite thin reporting.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-slate-900/40 p-4 space-y-2">
          <h4 className="font-bold text-white text-xs flex items-center gap-1.5 text-amber-400">
            <CheckCircle className="h-4 w-4" /> 4. Human-In-The-Loop Control
          </h4>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Every coordinator override, merge confirmation, and simulated dispatch requires a mandatory reason and is written to an immutable Audit Log.
          </p>
        </div>
      </div>
    </div>
  );
}
