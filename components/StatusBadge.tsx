import { Status } from "@/lib/api";
import { getStatusLabel, getStatusStyle } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export function StatusBadge({ status }: { status: Status }) {
  const { t } = useI18n();
  const s = getStatusStyle(status);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontSize: 11, fontWeight: 600,
      padding: "2px 10px", borderRadius: 9999,
      color: s.color, background: s.bg,
      whiteSpace: "nowrap",
    }}>
      {getStatusLabel(status, t)}
    </span>
  );
}
