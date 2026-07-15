/** @type {import('tailwindcss').Config} */
module.exports = {
  important: ".osi-document-root",
  corePlugins: { preflight: false },
  content: [
    "./src/osi-document-view.tsx",
    "./src/osi-recursos-section.tsx",
    "./src/osi-recursos-segmentado.tsx",
    "./src/osi-recursos-variaciones-table.tsx",
    "./src/osi-resumen-recursos.tsx",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
