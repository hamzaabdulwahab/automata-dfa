import './styles/main.css';
import { renderIcons } from './ui/icons.js';
import { requireUser, signOut, AuthConfigError } from './auth/clerk.js';
import { localStorageAdapter } from './storage/local.js';
import { createWorkspace } from './ui/workspace.js';

async function init() {
  renderIcons();

  let user;
  try {
    user = await requireUser({ redirectTo: '/auth.html' });
  } catch (err) {
    if (err instanceof AuthConfigError) {
      document.documentElement.setAttribute('data-auth', 'error');
      const overlay = document.getElementById('config-overlay');
      const message = document.getElementById('config-overlay-message');
      if (overlay && message) {
        message.textContent = err.message;
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
      }
      return;
    }
    throw err;
  }
  if (!user) return; // redirecting — keep the gate up so nothing flashes

  // Auth confirmed — reveal the workspace and dismiss the gate.
  document.documentElement.setAttribute('data-auth', 'ready');

  createWorkspace({
    storage: localStorageAdapter,
    user,
    onSignOut: () =>
      signOut({ redirectUrl: new URL('/auth.html', window.location.origin).toString() }),
  });
}

init();
