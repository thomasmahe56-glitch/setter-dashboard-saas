import { Status } from "@/lib/api";
import { STATUS_LABELS, STATUS_STYLE } from "@/lib/utils";

export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_STYLE[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontSize: 11, fontWeight: 600,
      padding: "2px 10px", borderRadius: 9999,
      color: s.color, background: s.bg,
      whiteSpace: "nowrap",
    }}>
      {STATUS_LABELS[status]}
    </span>
  );
}
