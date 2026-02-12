# Diagnostic Scripts

This directory contains utility scripts for debugging, verifying data, and inspecting the database state.

## Usage

Run these scripts using `npm run run-script` (which uses `ts-node`).

### Examples

**Check Database Connection & Row Level Security:**
```bash
npm run run-script scripts/diagnostics/check-rls-policies.ts
```

**Verify User Permissions:**
```bash
npm run run-script scripts/diagnostics/check-user-role.ts
```

**Debug Orders Fetching:**
```bash
npm run run-script scripts/diagnostics/debug-orders-fetch.ts
```

## Available Scripts

- `check-*.ts`: Verify specific data entities (users, columns, RLS).
- `debug-*.ts`: troubleshoot specific logic flows (auth, fetching).
- `verify-*.ts`: Confirm system state (KDS, DB).
- `inspect-*.ts`: Deep dive into DB internal state (triggers).
