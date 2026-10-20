import { Incident } from "../types";

export interface RankedQueueSnapshot {
  method: "crisissignal" | "fcfs" | "loudest_first";
  name: string;
  incidents: {
    id: string;
    title: string;
    rank: number;
    score: number;
    reportCount: number;
    createdAt: string;
    isVerifyUrgently: boolean;
    fairnessBoostApplied: boolean;
  }[];
}

/**
 * Baseline 1: First-Come-First-Served (FCFS)
 * Simply sorts incidents by arrival timestamp.
 */
export function computeFcfsRanking(incidents: Incident[]): RankedQueueSnapshot {
  const sorted = [...incidents].sort((a, b) => {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return {
    method: "fcfs",
    name: "First-Come-First-Served (Naive Queue)",
    incidents: sorted.map((inc, idx) => ({
      id: inc.id,
      title: inc.title,
      rank: idx + 1,
      score: 1.0 - idx / Math.max(1, sorted.length),
      reportCount: inc.source_report_ids.length,
      createdAt: inc.created_at,
      isVerifyUrgently: false,
      fairnessBoostApplied: false,
    })),
  };
}

/**
 * Baseline 2: Loudest-Area-First (Volume / Social Buzz)
 * Prioritizes whichever incident or location generated the highest count of reports.
 * This directly models why remote wards get neglected in real floods!
 */
export function computeLoudestFirstRanking(incidents: Incident[]): RankedQueueSnapshot {
  const sorted = [...incidents].sort((a, b) => {
    return b.source_report_ids.length - a.source_report_ids.length;
  });

  return {
    method: "loudest_first",
    name: "Loudest-Area-First (Raw Volume)",
    incidents: sorted.map((inc, idx) => ({
      id: inc.id,
      title: inc.title,
      rank: idx + 1,
      score: inc.source_report_ids.length,
      reportCount: inc.source_report_ids.length,
      createdAt: inc.created_at,
      isVerifyUrgently: false,
      fairnessBoostApplied: false,
    })),
  };
}
