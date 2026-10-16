# Verification record

Checked on 2026-10-16. Windows, Node 24.19.0.

## Automated tests

`node --test`: **8 passed, 0 failed**.

- Parallel tool calls and multiple approvals retain independent pending state.
- Completed, error, blocked, aborted, max-tokens, interrupted, and forked endings are distinguished.
- Sensitive event data is not exposed; sequence deduplication and cache-token accounting are exercised.
- Session/history limits preserve active sessions and bound retained state.
- Invalid configuration fails before starting a server.
- HTTP assets/state, SSE initial/update frames, methods, Host/Origin checks, and CSP are tested.
- Port conflicts, restart, repeated cleanup, and passive observer registration are tested.

## Actual framework integration

Installed published packages in an isolated verification directory:

- `@deepseek-ai/cordis@4.0.5-alpha.2`
- `@deepseek-ai/dsh-session@0.2.1-alpha.4`

Mounted SessionStore and this plugin in a real Cordis Context. Created parent/child sessions and appended genuine `turn/start`, `step/start`, `tool/call`, `approval/asked`, `approval/decided`, `step/end`, and `turn/end` events. The HTTP projection correctly showed both sessions, the waiting state, the parent relationship, and completed status, without tool arguments. Disposing the plugin closed its listener port.

This checks framework integration, not a full model-backed DSH CLI run. Bundle profile installation has been implemented against the official bundle tutorial but has not yet been exercised through a complete DSH profile installation.

## Browser verification

Headless Microsoft Edge via Playwright, desktop 1440px and mobile 390px:

- Initial SSE snapshot and six demo coworkers.
- Roster selection and detail updates.
- English / Chinese switching.
- Daylight / midnight switching.
- Focus mode and Escape exit.
- PNG scene download.
- Mobile horizontal-overflow check.
- No browser JavaScript errors.

All screenshots and the GIF use labeled simulated events. No claim is made that they capture a real model-backed task.

## API references

- [Official bundle installation tutorial](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)
- [Session event contracts](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/core/session/src/types.ts)
- [Approval event contracts](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/interaction/user-approval/src/types.ts)
- [Cordis resource lifecycle](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cordis-tutorial/02-lifecycle-and-effects.md)

Compatibility is intentionally restricted to DSH 0.2.1-alpha.4. Source and runtime package contracts were checked against that release; upstream master may subsequently change.
