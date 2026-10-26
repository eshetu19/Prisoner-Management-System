# Refactor notes

This first pass separates application startup/configuration from route definitions while preserving existing route-handler bodies. It is intentionally conservative. The route modules still contain inline handlers; extract them into controllers only after runtime smoke tests pass.

Check static paths, image/upload URLs, and all database scripts locally. This generated structure has not been runtime-tested against your MySQL instance because no local credentials/database are included.
