const defaultTheme = {
  accentColor: "#2563eb",
  accentStrongColor: "#1d4ed8",
  accentSoftColor: "#dbeafe",
  pageBackground:
    "radial-gradient(circle at top left, #ffffff 0, #eef4ff 40%, #e5eefc 100%)",
};

const theme = {
  ...defaultTheme,
  ...(window.APP_CONFIG?.theme ?? {}),
};

const root = document.documentElement;

root.style.setProperty("--app-accent", theme.accentColor);
root.style.setProperty("--app-accent-strong", theme.accentStrongColor);
root.style.setProperty("--app-accent-soft", theme.accentSoftColor);
root.style.setProperty("--app-page-background", theme.pageBackground);
