# Export convention

Use named exports for everything.

The only exception is a module that must be lazy-loaded (e.g. via `React.lazy(() => import(...))`), which requires a default export.
