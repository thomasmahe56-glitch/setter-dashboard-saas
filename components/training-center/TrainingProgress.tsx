import type { CSSProperties } from "react";
import { TrainingChecklist } from "@/lib/training-center/utils";
import { useI18n } from "@/lib/i18n";

interface TrainingProgressProps {
  progress: number;
  businessScore: number;
  level: { label: string; description: string };
  checklist: TrainingChecklist;
}

export function TrainingProgress({ progress, businessScore, level, checklist }: TrainingProgressProps) {
  const { t } = useI18n();
  const statusLabel = (status: string) => status === "Complete" ? t("training.status.complete", "Complete") : status === "Prompt rebuilt" ? t("training.status.promptRebuilt", "Prompt rebuilt") : status;
  return (
    <>
      <div style={styles.progressBlock}>
        <span style={styles.progressLabel}>{t("training.progress.progress", "Progress")}</span>
        <strong style={styles.progressValue}>{progress}%</strong>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
        <details style={styles.progressDetails}>
          <summary style={styles.progressHint}>{t("training.progress.detailsSaved", "Details saved")}</summary>
          <span style={styles.progressDetailText}>{businessScore}/7 {t("training.progress.offerDetailsSaved", "offer details saved")}</span>
        </details>
        <div style={styles.levelCard}>
          <span style={styles.levelLabel}>{t("training.progress.status", "Status")}</span>
          <strong style={styles.levelTitle}>{t("training.progress.readyToTest", "Ready to test")}</strong>
          <span style={styles.levelText}>{t("training.progress.readyText", "Angellos has enough context to handle test conversations.")}</span>
        </div>
      </div>

      <div style={styles.checklistBlock}>
        {[
          [t("training.progress.yourOffer", "Your offer"), checklist.business],
          [t("training.progress.knowledgeVoice", "Knowledge & voice"), checklist.knowledge],
          [t("training.progress.idealCustomer", "Ideal customer"), checklist.avatar],
          [t("training.progress.testAngellos", "Test Angellos"), checklist.test],
        ].map(([label, status]) => (
          <div key={label} style={styles.checklistRow}>
            <span>{label}</span>
            <strong>{typeof status === "string" ? statusLabel(status) : status}</strong>
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
    cursor: "pointer",
  },
  progressDetails: {
    color: "#94a3b8",
    fontSize: 12,
  },
  progressDetailText: {
    display: "block",
    marginTop: 4,
    color: "#64748b",
    fontSize: 12,
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
