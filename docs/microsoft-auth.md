# Illinois Microsoft sign-in

The **Chambana Missions** Entra app was created on 2026-09-21 with explicit owner approval. It is single-tenant (University of Illinois - Urbana), not a personal Outlook application. Creation does not establish university endorsement or guarantee tenant consent for all users.

- Application/client ID: `2cc48db6-ad0e-4008-a71d-d2f018f82dc4`
- Tenant URL: `https://login.microsoftonline.com/44467e6f-462c-4ea2-823f-7800de5434e3`
- Web callback: `https://donwucdijtmkvpjovtcw.supabase.co/auth/v1/callback`

These identifiers are not secrets. Never add a client secret to this document, the frontend, or chat.

## Finish configuration

1. The owner creates a client secret in Entra → Chambana Missions → Certificates & secrets. Choose a suitable expiry and record its renewal date in the team's private operational calendar.
2. Paste its **Value**, not its Secret ID, directly into Supabase Authentication → Providers → Azure (Microsoft), along with the client ID and tenant URL above. Enable/save that provider. The application itself does not need the Microsoft secret.
3. Follow Supabase's current Azure guide for the `email` and `xms_edov` optional claims. Do not grant broad Microsoft Graph or directory permissions for simple sign-in. If campus policy requires admin consent, ask university IT; do not bypass the restriction or switch to a broader tenant to avoid it.
4. Set `AUTH_MICROSOFT_ENABLED=true` in the app environment and restart/redeploy. Code uses `provider: "azure"`, requests `email`, and keeps email-link fallback.
5. Test a real Illinois account, callback, sign-out/sign-in, and rejection of a personal Outlook account. Existing campus checks continue to require a confirmed `@illinois.edu` email.

Verified on 2026-09-21: the owner created the secret and enabled Azure in Supabase; the public provider endpoint confirms it is enabled. The recommended email/xms_edov claims were saved. Local AUTH_MICROSOFT_ENABLED=true, and the owner confirmed Microsoft sign-in returned to Chambana Missions. Another-user consent, personal-account rejection, and production-domain callbacks still need acceptance testing.

Reference: [Supabase Azure sign-in](https://supabase.com/docs/guides/auth/social-login/auth-azure).

## Production callback retest

The initial September 23 repair is deployed: a real callback at 11:16:50 Chicago logged application success with 8,771 bytes of cookie headers, yet the browser received HTTP 500. A host/proxy response-header limit is suspected but not confirmed. The follow-up uses Supabase `setSession` to retain the app's access/refresh tokens and server-validated user while dropping unused Microsoft API tokens before the response leaves the callback. Local tests verify cookie-size reduction, stale-chunk cleanup, and authentication on a subsequent request. Real production acceptance is still required.

1. Publish the tested revision to the connected GitHub branch and deploy it in Hostinger using the existing workflow. Confirm the completed deployment's commit matches the repair before testing. Do not change Entra, tenant, or Supabase provider settings for this test.
2. Open Runtime Logs, then attempt Microsoft sign-in once at `https://playchambana.com/login`. Note the exact time and timezone and the final page/error. Do not reload the callback URL; authorization codes are single-use.
3. If it fails, copy the `auth_callback` JSON lines around that time. These contain only a random ID, controlled stages/outcomes, byte counts, and optional HTTP status/allowlisted transport code. If they are missing, download logs using the Runtime Logs three-dot menu. Redact secrets and personal data from any other log lines before sharing.
4. If needed, use Chrome DevTools → Network with **Preserve log** enabled for a fresh attempt. Select the request to `playchambana.com/auth/callback` and report its status and `X-Auth-Callback-Id`, plus `Cache-Control`, `Pragma`, and `Expires`. For `Set-Cookie`, share only cookie names, number of separate headers, and lengths. Never share cookie values, authorization codes, the full callback URL, or an unredacted HAR.
5. After a successful desktop login, test Safari on iPhone and confirm email-link login still works. Then complete second-account and rejected-personal-account acceptance.

Interpreting the new diagnostics:

- `exchange/failed` with `upstreamStatus` means Supabase rejected the exchange; check its Auth logs at the same time.
- `exchange/success_before_compaction` records outgoing cookie size before unused provider tokens are removed; compare with final `response/success`. `session_compaction/failed` identifies a failure re-establishing the compact Supabase session. Both branches still enforce confirmed Illinois email.
- `cookie_write/write_failed` identifies an application cookie-write failure. Raw exceptions are replaced with a fixed message before reaching Supabase's subscriber logger.
- `user_validation/failed` or `user_validation/ineligible` distinguishes user lookup failure from an account that does not meet the confirmed Illinois-email rule.
- `response/success` means the application constructed a successful redirect. It does **not** prove the host transmitted it or the browser retained every cookie. A browser 500 at this point calls for Hostinger's proxy/runtime logs and header limits; a later login bounce calls for checking stored cookie names/chunks and the next request.
- No `auth_callback` events can mean the wrong revision is deployed or the request failed before reaching the handler. Verify the deployment before changing authentication configuration.

If compact cookie headers still yield HTTP 500 after `response/success`, collect the failed response's `x-hcdn-request-id` along with timestamp/timezone and callback ID for Hostinger support. Ask them to check the CDN/reverse-proxy upstream response/header limits and serialization. Do not send them session tokens. See [Hostinger's CDN error tracing guidance](https://www.hostinger.com/support/hostinger-cdn-troubleshooting-website-errors/) and [Supabase setSession](https://supabase.com/docs/reference/javascript/auth-setsession).
