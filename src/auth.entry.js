import './styles/main.css';
import { renderIcons } from './ui/icons.js';
import { mountThemeToggle } from './ui/theme.js';
import {
  signInWithGoogle,
  signInWithGithub,
  redirectIfSignedIn,
  AuthConfigError,
} from './auth/firebase.js';

const $ = (sel) => document.querySelector(sel);

function showError(message) {
  const el = $('#auth-error');
  if (!el) return;
  el.textContent = `error: ${message}`;
  el.style.display = 'block';
}

function setBusy(clickedBtn, busy) {
  const buttons = document.querySelectorAll('.btn-oauth');
  buttons.forEach((btn) => {
    btn.disabled = busy;
  });
  if (busy && clickedBtn) {
    clickedBtn.dataset.originalText = clickedBtn.innerHTML;
    clickedBtn.textContent = 'Redirecting…';
  } else if (!busy && clickedBtn) {
    if (clickedBtn.dataset.originalText) {
      clickedBtn.innerHTML = clickedBtn.dataset.originalText;
    }
  }
}

async function init() {
  renderIcons();
  mountThemeToggle(document.getElementById('theme-toggle'));
  try {
    await redirectIfSignedIn({ redirectTo: '/' });
  } catch (err) {
    if (err instanceof AuthConfigError) {
      showError(err.message);
      document
        .querySelectorAll('.btn-oauth')
        .forEach((btn) => btn.setAttribute('disabled', 'true'));
      return;
    }
    showError(err?.message ?? 'Authentication could not start.');
  }

  const googleBtn = $('#google-signin');
  googleBtn?.addEventListener('click', async () => {
    setBusy(googleBtn, true);
    try {
      await signInWithGoogle({ redirectUrl: new URL('/', window.location.origin).toString() });
    } catch (err) {
      setBusy(googleBtn, false);
      showError(err?.message ?? 'sign-in failed');
    }
  });

  const githubBtn = $('#github-signin');
  githubBtn?.addEventListener('click', async () => {
    setBusy(githubBtn, true);
    try {
      await signInWithGithub({ redirectUrl: new URL('/', window.location.origin).toString() });
    } catch (err) {
      setBusy(githubBtn, false);
      showError(err?.message ?? 'sign-in failed');
    }
  });
}

init();
