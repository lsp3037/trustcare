import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Única exceção permanente às regras de cor e tipografia.
 *
 * `temp-print` é a via impressa da OS: sai em papel branco, sempre. Cores
 * claras fixas ali são a decisão correta — forçar os tokens de tema faria a
 * página imprimir texto claro sobre fundo claro. Não é dívida técnica.
 */
const LEGACY_RAW_STYLES = [
  "app/(dashboard)/dashboard/orders/\\[id\\]/temp-print/page.tsx",
];

const DIALOG_MESSAGE =
  "Diálogo nativo bloqueia a aba e não tem estilo. Use useToast() para feedback e useConfirm() para confirmação (@/components/ui).";

/**
 * Classes de cor fora dos tokens semânticos. `slate-*` e `emerald-*` só
 * funcionam porque globals.css redefine as escalas do Tailwind no tema claro
 * — enquanto existirem, mudar a identidade exige tocar dois lugares.
 */
const COLOR_LITERAL =
  "(bg|text|border|divide|ring|from|via|to|shadow|outline|accent|fill|stroke)-(slate|emerald|zinc|gray|neutral)-[0-9]";

/** Abaixo do piso de 12px que o design system estabelece. */
const TINY_TEXT = "text-\\[([0-9]|1[01])px\\]";

const designSystemSyntaxRules = [
  {
    selector: `Literal[value=/${COLOR_LITERAL}/]`,
    message:
      "Cor fora dos tokens. Use as escalas semânticas: bg-surface-*, text-text-*, border-border, bg-brand, bg-glass. Ver DESIGN_SYSTEM.md.",
  },
  {
    selector: `TemplateElement[value.raw=/${COLOR_LITERAL}/]`,
    message:
      "Cor fora dos tokens. Use as escalas semânticas: bg-surface-*, text-text-*, border-border, bg-brand, bg-glass. Ver DESIGN_SYSTEM.md.",
  },
  {
    selector: `Literal[value=/${TINY_TEXT}/]`,
    message:
      "Texto abaixo de 12px. Use os degraus da escala: text-caption (12px), text-small (13px), text-body (15px).",
  },
  {
    selector: `TemplateElement[value.raw=/${TINY_TEXT}/]`,
    message:
      "Texto abaixo de 12px. Use os degraus da escala: text-caption (12px), text-small (13px), text-body (15px).",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "no-use-before-define": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "@next/next/no-img-element": "off",
      "react/no-unescaped-entities": "off"
    }
  },

  /* ─────────────────────────────────────────────────────────────
     Guarda-corpo do design system (Fase 3 do UX_IMPLEMENTATION_PLAN).
     As regras abaixo impedem que o trabalho das fases 0–2 regrida.
     ───────────────────────────────────────────────────────────── */
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    rules: {
      // `no-restricted-globals` olha só para a referência global: a variável
      // local `confirm` vinda de `useConfirm()` não é sinalizada.
      "no-restricted-globals": [
        "error",
        { name: "alert", message: DIALOG_MESSAGE },
        { name: "confirm", message: DIALOG_MESSAGE },
        { name: "prompt", message: DIALOG_MESSAGE },
      ],
      // `no-restricted-globals` não alcança a forma qualificada.
      "no-restricted-properties": [
        "error",
        { object: "window", property: "alert", message: DIALOG_MESSAGE },
        { object: "window", property: "confirm", message: DIALOG_MESSAGE },
        { object: "window", property: "prompt", message: DIALOG_MESSAGE },
      ],
    },
  },
  {
    // Vale para o app inteiro — dashboard, telas públicas (orçamento,
    // rastreio, portal) e autenticação. A landing é a única fora: tem
    // identidade visual própria e nunca entrou no escopo da revisão.
    files: ["app/**/*.tsx", "components/**/*.tsx"],
    ignores: ["app/page.tsx", "app/preview/**/*.tsx"],
    rules: {
      "no-restricted-syntax": ["error", ...designSystemSyntaxRules],
    },
  },
  {
    files: LEGACY_RAW_STYLES,
    rules: {
      "no-restricted-syntax": "off",
    },
  },
]);

export default eslintConfig;
