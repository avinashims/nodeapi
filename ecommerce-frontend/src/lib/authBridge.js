/** Sync axios interceptors with React auth state (no React imports). */

const sessionUpdateListeners = new Set();
const sessionExpiredListeners = new Set();

export function subscribeAuthBridge(handlers) {
  if (handlers.onSessionUpdate) sessionUpdateListeners.add(handlers.onSessionUpdate);
  if (handlers.onSessionExpired) sessionExpiredListeners.add(handlers.onSessionExpired);

  return () => {
    if (handlers.onSessionUpdate) sessionUpdateListeners.delete(handlers.onSessionUpdate);
    if (handlers.onSessionExpired) sessionExpiredListeners.delete(handlers.onSessionExpired);
  };
}

/** @deprecated use subscribeAuthBridge */
export function registerAuthBridge(handlers) {
  return subscribeAuthBridge(handlers);
}

export function notifySessionUpdate(data) {
  sessionUpdateListeners.forEach((fn) => fn(data));
}

export function notifySessionExpired() {
  sessionExpiredListeners.forEach((fn) => fn());
}
