'use strict';

/* Light and dark theme.
   The page is dark by default. A saved choice is applied here, in <head>,
   before the page is drawn, so it never flashes the wrong theme. */

(function () {
  const STORAGE_KEY = 'theme';
  const root = document.documentElement;

  function readSaved() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (error) { return null; }
  }

  function save(theme) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (error) { /* storage unavailable */ }
  }

  function isLight() {
    return root.dataset.theme === 'light';
  }

  function updateButton() {
    const button = document.getElementById('themeToggle');
    button.textContent = isLight() ? 'Dark mode' : 'Light mode';
    button.setAttribute('aria-pressed', String(isLight()));
  }

  if (readSaved() === 'light') { root.dataset.theme = 'light'; }

  document.addEventListener('DOMContentLoaded', () => {
    updateButton();
    document.getElementById('themeToggle').addEventListener('click', () => {
      const next = isLight() ? 'dark' : 'light';
      if (next === 'light') {
        root.dataset.theme = 'light';
      } else {
        delete root.dataset.theme;
      }
      save(next);
      updateButton();
    });
  });
})();
