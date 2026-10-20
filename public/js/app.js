/* ================================================================
   Smart Learning Web App – Global Client-Side JavaScript
   ================================================================ */
'use strict';

// Synchronizer token for every HTML form, including forms added dynamically.
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
document.addEventListener('submit', event => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || ['get', 'dialog'].includes(form.method.toLowerCase())) return;
  if (csrfToken && !form.querySelector('input[name="_csrf"]')) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = '_csrf';
    input.value = csrfToken;
    form.appendChild(input);
  }
}, true);

// ── Sidebar toggle ──────────────────────────────────────────────
const sidebar  = document.getElementById('slwSidebar');
const overlay  = document.getElementById('sidebarOverlay');
const toggleBtn = document.getElementById('sidebarToggle');

function openSidebar() {
  sidebar?.classList.add('open');
  overlay?.classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  sidebar?.classList.remove('open');
  overlay?.classList.remove('show');
  document.body.style.overflow = '';
}

toggleBtn?.addEventListener('click', () => {
  sidebar?.classList.contains('open') ? closeSidebar() : openSidebar();
});
overlay?.addEventListener('click', closeSidebar);

// Close sidebar on resize to desktop
window.addEventListener('resize', () => {
  if (window.innerWidth >= 1024) closeSidebar();
});

// ── Password Visibility Toggles ─────────────────────────────────
function setupPasswordToggle(btnId, inputId, iconId) {
  const btn = document.getElementById(btnId);
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!btn || !input || !icon) return;

  btn.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    icon.textContent = isPassword ? 'visibility_off' : 'visibility';
  });
}
setupPasswordToggle('togglePasswordBtn', 'password', 'togglePasswordIcon');
setupPasswordToggle('toggleConfirmPasswordBtn', 'confirm_password', 'toggleConfirmPasswordIcon');

// ── Active nav detection ────────────────────────────────────────
document.querySelectorAll('.slw-nav-item').forEach(link => {
  const href = link.getAttribute('href');
  if (href && window.location.pathname.startsWith(href) && href !== '/') {
    link.classList.add('active');
  }
});

// ── Auto-dismiss flash alerts ───────────────────────────────────
document.querySelectorAll('.alert-slw[data-auto-dismiss]').forEach(el => {
  const delay = parseInt(el.dataset.autoDismiss, 10) || 4000;
  setTimeout(() => {
    el.style.transition = 'opacity 0.4s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 420);
  }, delay);
});

// ── Method override buttons (with optional data-confirm) ─────────
// Allow <button data-method="delete" data-action="/path" data-confirm="..."> to submit safely
document.querySelectorAll('[data-method]').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    const confirmMsg = btn.dataset.confirm;
    if (confirmMsg && !window.confirm(confirmMsg)) {
      return;
    }
    const method = (btn.dataset.method || 'POST').toUpperCase();
    const action = btn.dataset.action;
    if (!action) return;

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = action;

    const inp = document.createElement('input');
    inp.type = 'hidden';
    inp.name = '_method';
    inp.value = method;

    form.appendChild(inp);
    if (csrfToken) {
      const csrfInput = document.createElement('input');
      csrfInput.type = 'hidden';
      csrfInput.name = '_csrf';
      csrfInput.value = csrfToken;
      form.appendChild(csrfInput);
    }
    document.body.appendChild(form);
    form.submit();
  });
});

// ── Generic Confirm dialogs (for links or forms without data-method) ─
document.querySelectorAll('[data-confirm]:not([data-method])').forEach(el => {
  el.addEventListener('click', e => {
    const msg = el.dataset.confirm || 'Are you sure?';
    if (!confirm(msg)) {
      e.preventDefault();
    }
  });
});

// ── Notification count fetch ────────────────────────────────────
const notifBadge = document.getElementById('notifBadge');
async function refreshNotifCount() {
  if (!notifBadge) return;
  try {
    const r = await fetch('/api/notifications/count', { headers: { 'Accept': 'application/json' } });
    if (!r.ok) return;
    const { unread } = await r.json();
    if (unread > 0) {
      notifBadge.textContent = unread > 99 ? '99+' : unread;
      notifBadge.hidden = false;
    } else {
      notifBadge.hidden = true;
    }
  } catch (_) { /* ignore */ }
}
refreshNotifCount();
// Poll every 30 seconds for live updates
setInterval(refreshNotifCount, 30000);
