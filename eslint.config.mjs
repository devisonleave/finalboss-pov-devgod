import nextConfig from "eslint-config-next";

export default [
  {
    ignores: [".next/*", "node_modules/*"],
  },
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
    },
  },
];
