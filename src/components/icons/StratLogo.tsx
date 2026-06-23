import React from "react";
import stratLogo from "../../assets/strat-logo.png";

interface StratLogoProps {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  className?: string;
  [key: string]: any;
}

// The real Stratos House logo (strat-logo.png), wrapped so it can be used where a
// component is expected (e.g. the sidebar icon slot).
const StratLogo: React.FC<StratLogoProps> = ({
  size,
  width,
  height,
  className,
  ...rest
}) => {
  const w = size ?? width ?? 24;
  const h = size ?? height ?? w;
  return (
    <img
      src={stratLogo}
      alt="Stratos"
      draggable={false}
      width={w}
      height={h}
      className={className}
      {...rest}
    />
  );
};

export default StratLogo;
