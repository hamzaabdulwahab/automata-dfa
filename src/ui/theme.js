const STORAGE_KEY = 'automata-dfa:theme';
const VALID = new Set(['light', 'dark']);

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return VALID.has(v) ? v : null;
  } catch {
    return null;
  }
}

function preferred() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function currentTheme() {
  return document.documentElement.getAttribute('data-theme') ?? preferred();
}

export function setTheme(theme, { persist = true } = {}) {
  if (!VALID.has(theme)) return;
  document.documentElement.setAttribute('data-theme', theme);
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore quota / disabled storage */
    }
  }
  // Update the browser chrome color to match
  const themeColor = theme === 'dark' ? '#2a241e' : '#fbf7ed';
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute('content', themeColor));
}

export function toggleTheme() {
  setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
}

/**
 * Wire a toggle button. Renders the right glyph for the current theme
 * and keeps the icon in sync after each toggle.
 */
export function mountThemeToggle(button) {
  if (!button) return;
  const sync = () => {
    const theme = currentTheme();
    const next = theme === 'dark' ? 'light' : 'dark';
    button.setAttribute('aria-label', `Switch to ${next} theme`);
    button.dataset.theme = theme;
  };
  sync();
  button.addEventListener('click', () => {
    toggleTheme();
    sync();
  });

  // If the user hasn't picked a theme yet, follow OS changes live.
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', () => {
      if (readStored() === null) {
        setTheme(preferred(), { persist: false });
        sync();
      }
    });
  } catch {
    /* old browser, skip */
  }
}
