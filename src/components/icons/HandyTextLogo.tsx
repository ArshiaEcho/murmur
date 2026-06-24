import React from "react";

// Murmur wordmark. Fill follows the --color-logo-primary theme token (Stratos
// teal) via the .logo-primary class. textLength + lengthAdjust pin the word inside
// the viewBox so it never clips, regardless of the word's natural glyph width.
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
        textLength="190"
        lengthAdjust="spacingAndGlyphs"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
        fontSize="40"
        fontWeight="800"
        letterSpacing="1"
        className="logo-primary"
      >
        MURMUR
      </text>
    </svg>
  );
};

export default HandyTextLogo;
