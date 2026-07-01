/** @type {import('tailwindcss').Config} */
module.exports = {
  important: ".osi-document-root",
  corePlugins: { preflight: false },
  content: ["./src/osi-document-view.tsx"],
  theme: {
    extend: {},
  },
  plugins: [],
};
