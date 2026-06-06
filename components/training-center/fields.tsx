import { ChevronDown, FileJson } from "lucide-react";
import { listToText, parseJsonObject, textToList } from "@/lib/training-center/utils";

export function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={styles.label}>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} style={styles.input} />
    </label>
  );
}

export function TextField({
  label,
  value,
  rows,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={styles.label}>
      {label}
      <textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} style={styles.textarea} />
    </label>
  );
}

export function PromptField({
  label,
  hint,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label style={styles.promptField}>
      <span style={styles.promptLabel}>{label}</span>
      <span style={styles.promptHint}>{hint}</span>
      <textarea value={value} rows={3} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} style={styles.promptTextarea} />
    </label>
  );
}

export function EditableList({
  label,
  empty,
  items,
  onChange,
}: {
  label: string;
  empty: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const text = listToText(items);
  return (
    <label style={styles.editableList}>
      <span style={styles.listHeader}>
        <span>{label}</span>
        <span style={styles.countPill}>{items.length}</span>
      </span>
      <textarea
        value={text}
        rows={Math.max(3, Math.min(7, items.length + 1))}
        onChange={(event) => onChange(textToList(event.target.value))}
        placeholder={empty}
        style={styles.listTextarea}
      />
    </label>
  );
}

export function JsonEditor({
  title,
  value,
  onChange,
  rows,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  const parsed = parseJsonObject<Record<string, unknown>>(value);
  return (
    <label style={styles.jsonWrapper}>
      <span style={styles.jsonTitle}>
        <FileJson size={15} color="#0095F6" />
        {title}
      </span>
      <span style={styles.debugWarning}>
        Reserved for advanced users. A formatting error can prevent saving.
      </span>
      {!parsed.ok && <span style={styles.inlineError}>{parsed.message}</span>}
      <textarea value={value} rows={rows} spellCheck={false} onChange={(event) => onChange(event.target.value)} style={styles.jsonTextarea} />
    </label>
  );
}

export function AdvancedToggle({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={ghostButton(false)}>
      <ChevronDown size={15} style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms ease" }} />
      {open ? "Hide debug" : "Advanced / debug mode"}
    </button>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div style={styles.emptyState}>
      {text}
    </div>
  );
}

function ghostButton(disabled: boolean): React.CSSProperties {
  return {
    minHeight: 38,
    border: "1px solid #dbe4ee",
    borderRadius: 8,
    padding: "0 13px",
    background: "#fff",
    color: disabled ? "#94a3b8" : "#334155",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 750,
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
  };
}

const inputBase: React.CSSProperties = {
  width: "100%",
  border: "1px solid #dfe5ee",
  borderRadius: 8,
  background: "#fff",
  color: "#111827",
  fontSize: 13,
  padding: "10px 12px",
  outline: "none",
  fontFamily: "inherit",
};

const styles: Record<string, React.CSSProperties> = {
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    color: "#475569",
    fontSize: 12,
    fontWeight: 750,
  },
  input: inputBase,
  textarea: {
    ...inputBase,
    resize: "vertical",
    lineHeight: 1.45,
  },
  promptField: {
    border: "1px solid #e6ebf2",
    borderRadius: 8,
    padding: 12,
    display: "grid",
    gap: 7,
    background: "#fbfdff",
  },
  promptLabel: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 850,
  },
  promptHint: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.35,
  },
  promptTextarea: {
    ...inputBase,
    minHeight: 86,
    resize: "vertical",
    lineHeight: 1.45,
  },
  editableList: {
    border: "1px solid #e6ebf2",
    borderRadius: 8,
    padding: 12,
    background: "#fbfdff",
    display: "grid",
    gap: 9,
  },
  listHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 850,
    gap: 8,
  },
  countPill: {
    minWidth: 22,
    height: 22,
    borderRadius: 8,
    background: "#eef6ff",
    color: "#0095F6",
    display: "grid",
    placeItems: "center",
    fontSize: 11,
    fontWeight: 850,
  },
  listTextarea: {
    ...inputBase,
    resize: "vertical",
    lineHeight: 1.45,
  },
  jsonWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 18,
  },
  jsonTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 850,
    color: "#0f172a",
  },
  debugWarning: {
    color: "#92400e",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 12,
    lineHeight: 1.4,
    fontWeight: 700,
  },
  inlineError: {
    margin: "10px 0 0",
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: 700,
  },
  jsonTextarea: {
    ...inputBase,
    background: "#fbfdff",
    fontSize: 12,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    resize: "vertical",
    lineHeight: 1.5,
  },
  emptyState: {
    border: "1px dashed #cbd5e1",
    borderRadius: 8,
    background: "#f8fafc",
    color: "#64748b",
    padding: 16,
    fontSize: 13,
    lineHeight: 1.45,
    marginBottom: 14,
    fontWeight: 700,
  },
};
