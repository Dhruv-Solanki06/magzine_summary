// Placeholder runtime public config.
//
// In a production container, docker-entrypoint.sh OVERWRITES this file with the
// browser-safe NEXT_PUBLIC_* values from the container environment. In local
// `next dev` it stays empty and the app falls back to build-time process.env.
// Do not put secrets here — this file is served to the browser.
window.__ENV = window.__ENV || {};
