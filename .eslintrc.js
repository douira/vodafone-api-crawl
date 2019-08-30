module.exports = {
  root: true,
  env: {
    browser: true,
    node: true
  },
  parserOptions: {
    parser: "babel-eslint"
  },
  globals: {
    $nuxt: true
  },
  plugins: ["sonarjs"],
  extends: [
    "plugin:sonarjs/recommended",
    "plugin:import/recommended",
    "plugin:jest/recommended",
    "plugin:promise/recommended",
    "plugin:vue/recommended",
    "eslint:recommended",
    "prettier/vue",
    "plugin:prettier/recommended"
  ],
  rules: {
    "no-console":
      process.env.NODE_ENV === "production" ? "error" : "off",
    "no-debugger":
      process.env.NODE_ENV === "production" ? "error" : "off",
    "vue/no-v-html": "off",
    "no-constant-condition": ["error", { checkLoops: false }],
    "import/no-unresolved": "off",
    "promise/catch-or-return": "off",
    "promise/always-return": "off",
    "sonarjs/cognitive-complexity": ["warn", 15]
  }
}
