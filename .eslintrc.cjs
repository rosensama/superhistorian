module.exports = {
  root: true,
  extends: [
    "next/core-web-vitals",
    "next/typescript",
    "plugin:@typescript-eslint/strict-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
  ],
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  rules: {
    // Allow `() => voidFn()` shorthand (e.g. `onChange={(e) => setX(e.target.value)}`). This is
    // idiomatic React handler style and fires ~50x otherwise; `return voidFn()` and
    // `const x = voidFn()` are still flagged.
    "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
    // Numbers stringify predictably, so `${res.status}` needn't be wrapped in String(). Undefined,
    // objects and `any` in templates are still flagged — those are the real bugs.
    "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    // `||` is kept for strings because an empty string should fall back too (e.g. an env var set
    // to "" or a blank model id → default). `??` is still enforced for objects, numbers and
    // booleans, where `||` would wrongly discard 0/false.
    "@typescript-eslint/prefer-nullish-coalescing": ["error", { ignorePrimitives: { string: true } }],
  },
  overrides: [
    {
      // Plain JS (node:test suites, config files) isn't in tsconfig, so type-aware rules can't run.
      files: ["*.js", "*.cjs", "*.mjs"],
      extends: ["plugin:@typescript-eslint/disable-type-checked"],
    },
  ],
  ignorePatterns: [".next/", "node_modules/", "data/", "next-env.d.ts"],
};
