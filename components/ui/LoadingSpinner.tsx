"use client";

interface Props {
  size?: number;
  color?: string;
}

export default function LoadingSpinner({
  size = 20,
  color = "#3b82f6",
}: Props) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2px solid rgba(255,255,255,0.1)`,
        borderTop: `2px solid ${color}`,
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}
