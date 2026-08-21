// Shared between the FOUC-avoidance init script (src/app/admin/layout.tsx,
// which runs before React hydrates) and ThemeToggle.tsx (which reads/writes
// it after) -- one constant, so the two can never drift apart on the
// localStorage key they use.
export const THEME_STORAGE_KEY = "agileology-admin-theme";
