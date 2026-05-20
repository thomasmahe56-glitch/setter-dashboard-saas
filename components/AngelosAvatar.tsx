interface AngelosAvatarProps {
  size?: number;
  radius?: number;
  shadow?: string;
  showPhone?: boolean;
}

export function AngelosAvatar({ size = 40, radius = 10, shadow = "none", showPhone = true }: AngelosAvatarProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: "#f4f7fb",
        backgroundImage: "url('/angelos.png')",
        backgroundRepeat: "no-repeat",
        backgroundSize: showPhone ? "178%" : "290%",
        backgroundPosition: showPhone ? "50% 8%" : "50% 10%",
        boxShadow: shadow,
        flexShrink: 0,
        overflow: "hidden",
      }}
    />
  );
}
