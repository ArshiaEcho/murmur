import React from "react";

interface StratosMarkProps {
  size?: number | string;
  width?: number | string; // accepted for IconProps compatibility (Sidebar passes width/height)
  height?: number | string;
  className?: string;
  variant?: "mono" | "brand"; // mono = currentColor; brand = teal gradient + accent glow
  outline?: boolean; // draw a light contrast ring (for dark backgrounds / app icon)
  animated?: boolean; // CSS staggered build + breathing loop (hero); respects prefers-reduced-motion
  [key: string]: any;
}

// One rounded-diamond (lozenge) path on a 64x64 grid. cx,cy = centre; r = half-diagonal; k = corner rounding.
function lozenge(cx: number, cy: number, r: number, k = 6): string {
  return [
    `M ${cx} ${cy - r + k}`,
    `Q ${cx} ${cy - r} ${cx + k} ${cy - r + k}`,
    `L ${cx + r - k} ${cy - k}`,
    `Q ${cx + r} ${cy} ${cx + r - k} ${cy + k}`,
    `L ${cx + k} ${cy + r - k}`,
    `Q ${cx} ${cy + r} ${cx - k} ${cy + r - k}`,
    `L ${cx - r + k} ${cy + k}`,
    `Q ${cx - r} ${cy} ${cx - r + k} ${cy - k}`,
    `L ${cx - k} ${cy - r + k}`,
    `Q ${cx} ${cy - r} ${cx} ${cy - r + k}`,
    "Z",
  ].join(" ");
}

/**
 * The Stratos House mark: three stacked rounded-diamonds with a filled centre.
 * Single source of truth for every surface — sidebar tab (mono/currentColor),
 * onboarding hero (brand gradient + outline + animated), and the rasterised
 * tray/app icons (exported from the matching SVG).
 */
const StratosMark: React.FC<StratosMarkProps> = ({
  size,
  width,
  height,
  className,
  variant = "mono",
  outline = false,
  animated = false,
  ...rest
}) => {
  const w = size ?? width ?? 24;
  const h = size ?? height ?? w;
  const cx = 32;
  const r = 16; // half-diagonal of each lozenge
  const gap = 12; // vertical offset between the three stacked layers
  const topY = cx - gap; // 20
  const midY = cx; // 32 (filled center)
  const botY = cx + gap; // 44
  const stroke = 3.2;
  const isBrand = variant === "brand";

  const grp = animated ? "sx-group" : undefined;
  const layerCls = (n: number) => (animated ? `sx-layer sx-layer-${n}` : undefined);

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...rest}
    >
      {isBrand && (
        <defs>
          <linearGradient id="sx-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2FD3BD" />
            <stop offset="1" stopColor="#16B8A3" />
          </linearGradient>
          <linearGradient id="sx-glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#16B8A3" stopOpacity="0" />
            <stop offset="1" stopColor="#C9DA4B" stopOpacity="0.85" />
          </linearGradient>
        </defs>
      )}
      <g className={grp} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        {/* bottom layer (accent glow in brand) */}
        <path
          className={`${layerCls(3) ?? ""} ${animated ? "sx-base" : ""}`.trim() || undefined}
          d={lozenge(cx, botY, r)}
          fill="none"
          stroke={isBrand ? "url(#sx-glow)" : "currentColor"}
          strokeWidth={stroke}
          strokeLinejoin="round"
          opacity={isBrand ? 1 : 0.55}
        />
        {/* top layer */}
        <path
          className={layerCls(2)}
          d={lozenge(cx, topY, r)}
          fill="none"
          stroke={isBrand ? "#2FD3BD" : "currentColor"}
          strokeWidth={stroke}
          strokeLinejoin="round"
          opacity={isBrand ? 1 : 0.8}
        />
        {/* center layer — FILLED */}
        <path
          className={layerCls(1)}
          d={lozenge(cx, midY, r)}
          fill={isBrand ? "url(#sx-fill)" : "currentColor"}
          stroke={outline ? "#CFEFE8" : isBrand ? "#2FD3BD" : "currentColor"}
          strokeWidth={outline ? 2.4 : stroke}
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

export default StratosMark;
