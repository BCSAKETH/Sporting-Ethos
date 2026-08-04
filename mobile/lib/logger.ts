// Thin console wrapper gated on __DEV__ so nothing lands in production
// logcat output, while still surfacing warnings/errors during development.
export const logger = {
  warn: (...args: unknown[]) => {
    if (__DEV__) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (__DEV__) console.error(...args);
  },
};
