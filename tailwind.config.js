/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  // Colors/tokens live in src/App.css via Tailwind v4 `@theme inline` (single
  // source of truth). The old v3 color shim was removed; legacy utilities
  // (logo-primary, background, mid-gray, foreground) were ported to the palette.
  plugins: [],
};
