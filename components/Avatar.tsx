import { getInitials, avatarBg } from "@/lib/utils";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = { sm: 40, md: 48, lg: 56 };
const FONT  = { sm: 13, md: 15, lg: 18 };

export function Avatar({ name, size = "md" }: AvatarProps) {
  const px = SIZES[size];
  return (
    <div
      style={{
        width: px, height: px, borderRadius: "50%",
        background: avatarBg(name),
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, color: "#fff", fontSize: FONT[size],
        flexShrink: 0,
      }}
    >
      {getInitials(name)}
    </div>
  );
}
