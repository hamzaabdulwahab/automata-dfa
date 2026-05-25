import './styles/main.css';
import { signInWithGoogle, redirectIfSignedIn, AuthConfigError } from './auth/clerk.js';

const $ = (sel) => document.querySelector(sel);

function showError(message) {
  const el = $('#auth-error');
  if (!el) return;
  el.textContent = `error: ${message}`;
  el.style.display = 'block';
}

function setBusy(busy) {
  const btn = $('#google-signin');
  if (!btn) return;
  btn.disabled = busy;
  if (busy) btn.textContent = 'Redirecting…';
}

async function init() {
  try {
    await redirectIfSignedIn({ redirectTo: '/' });
  } catch (err) {
    if (err instanceof AuthConfigError) {
      showError(err.message);
      $('#google-signin')?.setAttribute('disabled', 'true');
      return;
    }
    console.warn('Auth init warning:', err);
  }

  $('#google-signin')?.addEventListener('click', async () => {
    setBusy(true);
    try {
      await signInWithGoogle({ redirectUrl: new URL('/', window.location.origin).toString() });
    } catch (err) {
      console.error(err);
      setBusy(false);
      showError(err?.message ?? 'sign-in failed');
    }
  });
}

init();
