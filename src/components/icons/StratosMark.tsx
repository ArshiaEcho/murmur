import React from "react";

interface StratosMarkProps {
  size?: number | string;
  width?: number | string; // accepted for IconProps compatibility (Sidebar passes width/height)
  height?: number | string;
  className?: string;
  variant?: "mono" | "brand"; // mono = currentColor; brand = layered teal gem
  outline?: boolean; // light contrast ring on the filled center (for dark backgrounds)
  animated?: boolean; // CSS staggered build + breathing loop; respects prefers-reduced-motion
  [key: string]: any;
}

// A rounded diamond = a square rotated 45° with rounded corners. Using a real
// <rect rx> guarantees clean corners (a hand-rolled path notched at the apex).
function Diamond({
  cx,
  cy,
  r,
  rx,
  className,
  ...props
}: {
  cx: number;
  cy: number;
  r: number;
  rx: number;
  className?: string;
  [key: string]: any;
}) {
  const s = r * Math.SQRT2; // side length for half-diagonal r
  return (
    <rect
      x={cx - s / 2}
      y={cy - s / 2}
      width={s}
      height={s}
      rx={rx}
      transform={`rotate(45 ${cx} ${cy})`}
      className={className}
      {...props}
    />
  );
}

/**
 * The Stratos House mark: three nested rounded-diamonds (back + middle outlines,
 * filled center) — the layered gem. `brand` = teal gradient; `mono` = a clean
 * outlined diamond with a filled inner gem in currentColor (sidebar + tray).
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
  const isBrand = variant === "brand";
  const grp = animated ? "sx-group" : undefined;
  const layer = (n: number) => (animated ? `sx-layer sx-layer-${n}` : undefined);

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
            <stop offset="0" stopColor="#3FE0CC" />
            <stop offset="1" stopColor="#16B8A3" />
          </linearGradient>
        </defs>
      )}
      <g className={grp} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        {isBrand ? (
          <>
            <Diamond cx={32} cy={30} r={25} rx={8} className={layer(3)} fill="none" stroke="#5FD8C7" strokeWidth={2.3} opacity={0.9} />
            <Diamond cx={32} cy={33} r={18.5} rx={6} className={layer(2)} fill="none" stroke="#2FD3BD" strokeWidth={2.6} />
            <Diamond cx={32} cy={36} r={12} rx={4} className={layer(1)} fill="url(#sx-fill)" stroke={outline ? "#E6F7F2" : "#2FD3BD"} strokeWidth={outline ? 1.4 : 0} />
          </>
        ) : (
          <>
            <Diamond cx={32} cy={32} r={23} rx={7} fill="none" stroke="currentColor" strokeWidth={3} />
            <Diamond cx={32} cy={32} r={12} rx={4} fill="currentColor" />
          </>
        )}
      </g>
    </svg>
  );
};

export default StratosMark;
