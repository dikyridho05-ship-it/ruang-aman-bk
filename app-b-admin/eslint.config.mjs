import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Dua aturan baru dari React Compiler (eslint-config-next 16) dijadikan
      // peringatan, bukan galat:
      // - set-state-in-effect: proyek ini sengaja membaca localStorage /
      //   status Service Worker setelah mount supaya isi server & browser sama.
      // - purity: menandai Date.now() di Server Component async, yang memang
      //   dirender sekali per permintaan (bukan dirender ulang di browser).
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "public/sw.js", "src/app/pratinjau-uji/**"] },
];

export default config;
