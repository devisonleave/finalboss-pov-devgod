export default [
  {
    ignores: [".next/**", "node_modules/**"],
  },
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
    },
  },
];
