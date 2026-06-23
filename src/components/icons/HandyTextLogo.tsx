import React from "react";

// Strat wordmark. Replaces the original fork's text logo; fill follows the
// --color-logo-primary theme token (Stratos teal) via the .logo-primary class.
const HandyTextLogo = ({
  width,
  height,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) => {
  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox="0 0 210 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="105"
        y="32"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
        fontSize="48"
        fontWeight="800"
        letterSpacing="2"
        className="logo-primary"
      >
        STRAT
      </text>
    </svg>
  );
};

export default HandyTextLogo;
