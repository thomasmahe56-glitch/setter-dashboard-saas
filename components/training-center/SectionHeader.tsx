import type { ReactNode } from "react";

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div style={styles.sectionHeader}>
      <div>
        <p style={styles.sectionEyebrow}>{eyebrow}</p>
        <h2 style={styles.sectionTitle}>{title}</h2>
        <p style={styles.sectionDescription}>{description}</p>
      </div>
      {action}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sectionHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 18,
    marginBottom: 20,
  },
  sectionEyebrow: {
    margin: "0 0 5px",
    color: "#0095F6",
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  sectionTitle: {
    margin: "0 0 6px",
    color: "#0f172a",
    fontSize: 23,
    lineHeight: 1.15,
    fontWeight: 850,
  },
  sectionDescription: {
    margin: 0,
    maxWidth: 620,
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.5,
  },
};
