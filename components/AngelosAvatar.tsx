interface AngelosAvatarProps {
  size?: number;
  radius?: number;
  shadow?: string;
}

export function AngelosAvatar({ size = 40, radius = 10, shadow = "none" }: AngelosAvatarProps) {
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
        backgroundSize: "290%",
        backgroundPosition: "50% 10%",
        boxShadow: shadow,
        flexShrink: 0,
        overflow: "hidden",
      }}
    />
  );
}
