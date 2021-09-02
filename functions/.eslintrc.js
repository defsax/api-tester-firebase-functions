module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: "eslint:recommended",
  rules: {
    "space-before-function-paren": ["error", "always"],
    "object-curly-spacing": "off",
    "quote-props": ["error", "as-needed"],
    quotes: ["error", "double"],
    indent: ["error", 2],
    "max-len": ["error", { code: 125 }],
  },
};
