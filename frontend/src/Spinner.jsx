import React from "react";

/**
 * Modern Circular Progress Indicator (Spinner)
 *
 * @param {number|string} size - Pixel size (number) or preset ("sm" | "md" | "lg" | "xl")
 * @param {string} color - Stroke color (default "currentColor")
 * @param {number} strokeWidth - Width of the circular stroke (default 2.75)
 * @param {string} className - Optional additional CSS class names
 * @param {object} style - Optional inline styles
 * @param {number} trackOpacity - Opacity of the background circle track (default 0.22)
 * @param {string} ariaLabel - Accessibility label (default "Loading")
 */
export default function Spinner({
  size = 16,
  color = "currentColor",
  strokeWidth = 2.75,
  className = "",
  style = {},
  trackOpacity = 0.22,
  ariaLabel = "Loading"
}) {
  const pixelSize =
    typeof size === "number"
      ? size
      : size === "xs"
      ? 12
      : size === "sm"
      ? 14
      : size === "lg"
      ? 24
      : size === "xl"
      ? 36
      : 18;

  return (
    <svg
      className={`circular-spinner ${className}`}
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,
        ...style,
      }}
      role="status"
      aria-label={ariaLabel}
    >
      {/* Background circle track */}
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={trackOpacity}
      />
      {/* Animated spinning arc */}
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray="28 32"
      />
    </svg>
  );
}

export { Spinner as CircularProgress };

