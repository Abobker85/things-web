// Things: Telegram Web tells Telegram's link sites (t.me and its mirrors) whether a session exists here,
// so their links can open this app. Things has no such sites, so nothing is sent.
// The functions stay so that callers shared with upstream keep working.

const WEBSYNC_KEY = 'tgme_sync';

export function forceWebsync(_authed: boolean): Promise<void> | undefined {
  return undefined;
}

export function stopWebsync() {}

export function startWebsync() {}

export function clearWebsync() {
  localStorage.removeItem(WEBSYNC_KEY);
}
