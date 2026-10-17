// An anonymous id for this browser, used only so one phone counts once per point and day in community confirmations.
// It is random, kept in localStorage, and the server stores just its hash. If storage is blocked (private mode,
// embedded frame) a fresh id is used for this page view, which still allows one vote per point per day per view.
const KEY = 'xanh360-device-id';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let fallback = '';

export function deviceId() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && UUID.test(saved)) return saved;
    const id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    fallback ||= crypto.randomUUID();
    return fallback;
  }
}
