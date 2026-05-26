import './styles/main.css';
import { getClerk, AuthConfigError } from './auth/clerk.js';

async function run() {
  const status = document.getElementById('status');
  try {
    const clerk = await getClerk();
    if (!clerk) {
      // Dev mode shortcut: there's no real Clerk session to complete.
      window.location.replace('/');
      return;
    }
    await clerk.handleRedirectCallback({
      afterSignInUrl: '/',
      afterSignUpUrl: '/',
    });
    // handleRedirectCallback normally navigates on its own. If it returns
    // without moving the page, fall through to /.
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
