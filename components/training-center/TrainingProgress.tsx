import type { CSSProperties } from "react";
import { AngelosLevel, TrainingChecklist } from "@/lib/training-center/utils";

interface TrainingProgressProps {
  progress: number;
  businessScore: number;
  level: AngelosLevel;
  checklist: TrainingChecklist;
}

export function TrainingProgress({ progress, businessScore, level, checklist }: TrainingProgressProps) {
  return (
    <>
      <div style={styles.progressBlock}>
        <span style={styles.progressLabel}>Progression</span>
        <strong style={styles.progressValue}>{progress}%</strong>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
        <span style={styles.progressHint}>{businessScore}/7 champs business essentiels</span>
        <div style={styles.levelCard}>
          <span style={styles.levelLabel}>Niveau Angelos</span>
          <strong style={styles.levelTitle}>{level.label}</strong>
          <span style={styles.levelText}>{level.description}</span>
        </div>
      </div>

      <div style={styles.checklistBlock}>
        {[
          ["Business Setup", checklist.business],
          ["Avatar Client", checklist.avatar],
          ["Règles DM", checklist.rules],
          ["Activation", checklist.activation],
          ["Test", checklist.test],
        ].map(([label, status]) => (
          <div key={label} style={styles.checklistRow}>
            <span>{label}</span>
            <strong>{status}</strong>
          </div>
        ))}
      </div>
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  progressBlock: {
    borderBottom: "1px solid #edf1f5",
    paddingBottom: 14,
    marginBottom: 12,
  },
  progressLabel: {
    display: "block",
    color: "#64748b",
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: 0,
    marginBottom: 6,
  },
  progressValue: {
    display: "block",
    color: "#0f172a",
    fontSize: 34,
    lineHeight: 1,
    marginBottom: 12,
  },
  progressTrack: {
    height: 8,
    background: "#eef2f7",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    background: "#0095F6",
    borderRadius: 999,
  },
  progressHint: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: 650,
  },
  levelCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    background: "#f8fbff",
    border: "1px solid #e1eefc",
    display: "grid",
    gap: 4,
  },
  levelLabel: {
    color: "#0095F6",
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  levelTitle: {
    color: "#0f172a",
    fontSize: 14,
    lineHeight: 1.2,
  },
  levelText: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.35,
  },
  checklistBlock: {
    display: "grid",
    gap: 7,
    borderBottom: "1px solid #edf1f5",
    paddingBottom: 12,
    marginBottom: 12,
  },
  checklistRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    color: "#64748b",
    fontSize: 12,
  },
};
