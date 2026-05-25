import './styles/main.css';
import { renderIcons } from './ui/icons.js';
import { signInWithGoogle, redirectIfSignedIn, AuthConfigError } from './auth/clerk.js';

const $ = (sel) => document.querySelector(sel);

function showError(message) {
  const el = $('#auth-error');
  if (!el) return;
  el.textContent = message;
  el.style.background = 'var(--color-danger-soft)';
  el.style.color = 'oklch(0.4 0.2 25)';
  el.style.border = '1px solid oklch(0.85 0.08 25)';
  el.classList.remove('hidden');
}

function setBusy(busy) {
  const btn = $('#google-signin');
  if (!btn) return;
  btn.disabled = busy;
  btn.dataset.busy = busy ? 'true' : 'false';
  if (busy) {
    btn.innerHTML =
      '<i data-lucide="loader-2" class="animate-spin" style="font-size:16px"></i><span>Redirecting…</span>';
    renderIcons(btn);
  }
}

async function init() {
  renderIcons();

  try {
    await redirectIfSignedIn({ redirectTo: '/' });
  } catch (err) {
    if (err instanceof AuthConfigError) {
      showError(err.message);
      $('#google-signin')?.setAttribute('disabled', 'true');
      return;
    }
    // Non-fatal — just stay on the page.
    console.warn('Auth init warning:', err);
  }

  $('#google-signin')?.addEventListener('click', async () => {
    setBusy(true);
    try {
      await signInWithGoogle({ redirectUrl: new URL('/', window.location.origin).toString() });
    } catch (err) {
      console.error(err);
      setBusy(false);
      showError(err?.message ?? 'Sign-in failed. Please try again.');
    }
  });
}

init();
