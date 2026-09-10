# Phase 2 — Bug-catching tests

This repository contains automated tests for the 7 confirmed bugs in the supplied bug report. The tests are intentionally expected to fail against the buggy application. Fixing the application is optional.

Run:

```bash
npm install
npm test
```

The API tests start the supplied Express server on a local test port. The two UI tests inspect the supplied frontend source to enforce the expected formatting and validation behavior.
