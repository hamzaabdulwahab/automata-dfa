import './styles/main.css';
import { getFirebase, AuthConfigError } from './auth/firebase.js';
import { getRedirectResult } from 'firebase/auth';

async function run() {
  const status = document.getElementById('status');
  try {
    const auth = getFirebase();
    if (!auth) {
      // Dev mode shortcut: there's no real Firebase session to complete.
      window.location.replace('/');
      return;
    }
    await getRedirectResult(auth);
    window.location.replace('/');
  } catch (err) {
    if (status) {
      status.textContent =
        err instanceof AuthConfigError ? err.message : `error: ${err?.message ?? String(err)}`;
      status.style.color = 'var(--color-accent)';
    }
  }
}

run();
