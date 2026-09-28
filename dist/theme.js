// Run before styles load so a saved dark theme does not flash light on reload.
(() => {
  const key = 'penny.theme.v1';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = null;
  const valid = value => value === 'dark' || value === 'light';
  try {
    const saved = localStorage.getItem(key);
    if (valid(saved)) preference = saved;
  } catch { /* Theme switching still works when browser storage is unavailable. */ }

  function apply() {
    const dark = preference ? preference === 'dark' : system.matches;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#101c1b' : '#f6f8f8');
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(dark));
      toggle.title = document.documentElement.lang === 'vi' ? `Chuyển sang chế độ ${dark ? 'sáng' : 'tối'}` : `Switch to ${dark ? 'light' : 'dark'} mode`;
    }
  }
  window.addEventListener('penny:language', apply);
  apply();
  system.addEventListener('change', () => { if (!preference) apply(); });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    preference = valid(event.newValue) ? event.newValue : null;
    apply();
  });
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.getElementById('theme-toggle').addEventListener('click', () => {
      preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, preference); } catch { /* Session-only fallback. */ }
      apply();
    });
  });
})();
