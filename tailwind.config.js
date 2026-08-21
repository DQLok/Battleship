module.exports = {
  darkMode: ["selector", '[zaui-theme="dark"]'],
  purge: {
    enabled: true,
    content: ["./src/**/*.{js,jsx,ts,tsx,vue,scss}"],
  },
  theme: {
    extend: {
      fontFamily: {
        mono: ["Roboto Mono", "ui-monospace", "monospace"],
        headline: ["Roboto Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
};
