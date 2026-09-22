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
