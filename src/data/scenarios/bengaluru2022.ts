import { BENGALURU_GROUND_TRUTH } from "../bengaluru";

export interface ScenarioKeyMoment {
  id: string;
  caseLetter?: "a" | "b" | "c" | "d" | "e" | "f";
  title: string;
  timestamp: string;
  description: string;
  expectedOutcome: string;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  subtitle: string;
  startTime: string;
  endTime: string;
  timezone: string;
  keyMoments: ScenarioKeyMoment[];
}

/* ------------------------------------------------------------------ *
 *  Simulated replay of the real Aug–Sep 2022 Bengaluru flood window.
 *  Dates follow the real monsoon; every incident message, bulletin and
 *  social post is synthetic and generated offline (seed 42).
 * ------------------------------------------------------------------ */

export const BENGALURU_2022_SCENARIO: ScenarioDefinition = {
  id: "bengaluru-2022-flood-replay",
  name: BENGALURU_GROUND_TRUTH.scenario_title,
  subtitle: "Synthetic incident stream replayed over real Bengaluru flood dates",
  startTime: "2022-08-21T18:30:00Z", // 2022-08-22 00:00 IST
  endTime: "2022-09-07T18:30:00Z", // 2022-09-08 00:00 IST
  timezone: "Asia/Kolkata (IST, UTC+5:30)",
  // Key moments are aligned to real timestamps in the generated replay data and
  // ordered chronologically so the jump control tells a coherent story.
  keyMoments: [
    {
      id: "km-case-a",
      caseLetter: "a",
      title: "Case (a): Loud ORR Commuter Corridor",
      timestamp: "2022-08-30T05:00:00Z",
      description:
        "Within 30 minutes of the downpour, ORR IT-corridor commuters flood the control room with ankle-to-knee waterlogging chatter while deeper trouble at Kadubeesanahalli surfaces one message at a time.",
      expectedOutcome:
        "Report volume must not equal urgency: severity, depth and exposure weighting keep the serious stretch visible above loud shallow chatter.",
    },
    {
      id: "km-case-f",
      caseLetter: "f",
      title: "Case (f): Viral Dam-Release Panic",
      timestamp: "2022-08-30T05:15:00Z",
      description:
        "Identical forwarded messages claim KRS dam gates opened without a siren and a 10ft wall of water will reach MG Road Metro Station in 20 minutes.",
      expectedOutcome:
        "Recycled text is detected, duplicated posts do not inflate the distinct reporter count, and reliability stays below official telemetry.",
    },
    {
      id: "km-case-d",
      caseLetter: "d",
      title: "Case (d): Ejipura Underpass Duplicate Cluster",
      timestamp: "2022-09-02T08:40:00Z",
      description:
        "Dozens of near-identical calls, SMS and social posts describe the Ejipura junction underpass filling to chest depth within minutes.",
      expectedOutcome:
        "Reports fold into a single consolidated underpass incident instead of inflating the queue.",
    },
    {
      id: "km-case-b",
      caseLetter: "b",
      title: "Case (b): Kogilu Layout Isolation",
      timestamp: "2022-09-03T05:25:00Z",
      description:
        "Kogilu Cross low-income layouts flood after a choked storm drain, but only a thin trickle of messages reaches the control room.",
      expectedOutcome:
        "The silence score climbs, the zone turns purple, and a welfare check is suggested even without loud reporting.",
    },
    {
      id: "km-case-c",
      caseLetter: "c",
      title: "Case (c): Jakkur Culvert Collapse",
      timestamp: "2022-09-04T05:15:00Z",
      description:
        "The Kogilu-Thanisandra culvert collapses, severing fibre and tower power to the Thanisandra-Jakkur belt after the Jakkur wetland overflow.",
      expectedOutcome:
        "Time-varying connectivity drops to 8%, the silence score jumps above threshold, and the flag precedes any confirming bulletin.",
    },
    {
      id: "km-case-e",
      caseLetter: "e",
      title: "Case (e): Live Wire in Floodwater",
      timestamp: "2022-09-04T12:20:00Z",
      description:
        "A transformer near the Kempapura substation sparks in knee-deep water while the seeping Hebbal lake bund floods surrounding streets.",
      expectedOutcome:
        "The electrical-hazard guardrail keeps the sparking transformer incident separate from routine waterlogging and pushes it up the queue.",
    },
  ],
};
