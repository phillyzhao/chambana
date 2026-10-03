# Launch acceptance and Gemini evaluation

Updated October 3, 2026. This is a plan and evidence checklist, not a completed acceptance report. The owner resumed work after the SSD move and authorized meaningful, tested progress to be pushed to GitHub. Use `/Volumes/Crucial X10/Chambana`; stop if the SSD is unavailable.

## Results recorded October 3

| Check | Status and evidence | Remaining scope |
| --- | --- | --- |
| Exact Hostinger deployment | Pass: owner-provided screenshot shows Current/Completed `5d1aba00`, branch `main`, Next.js, Node 24.x and Running. Displayed deployment time is October 3 at 09:43, timezone unspecified. | Later documentation pushes do not supersede this last verified deployment. Host configuration and real request behavior need separate evidence. |
| Category add/save/clear controls | Pass for owner UI: owner confirms checklist step 2 works, covering one category, adding a second, saving/reloading, and clearing to All categories. | G1/G2 cross-account views and future mission-draw behavior still need acceptance. |
| Organization-only join-request visibility | Pass for display: owner confirms no Join requests section for Test 1/open and Test 2/invite-only, and a section for Test 3/organization. | G3 actual request submission and approval remain unverified. |
| Transfer and reporting | Deferred: Marcos is unavailable now and will participate later. | G4–G6 still require both accounts; membership and organizer eligibility must be confirmed. |
| www canonical redirect | Code deployment confirmed; seven local HTTP checks previously passed. | Real-domain final URL/status remains unverified. |

The confirmations above are user-run production checks; no agent-operated browser acceptance is claimed. The screenshot is retained in the conversation, not copied into the repository. Category and join-control confirmations were supplied in text. No overall production-readiness conclusion follows from these partial results.

## Evidence rules

For each run, record Chicago timestamp, Git commit, completed Hostinger deployment commit, account aliases/roles, browser/device versions, case ID, expected outcome, actual outcome, and pass/fail/blocked. Keep only sanitized paths/statuses, aggregate counts, and necessary test record IDs in Git. Keep private diagnostics outside Git. Never save passwords, keys, session cookies, sign-in links, raw HARs, personal photos, or private recipient addresses in the report.

Local mocks, in-memory database tests, hosted SQL checks, live provider evaluation, and real browser acceptance are separate evidence classes. A health 200, a configured provider, or a passing mock cannot establish production readiness. Do not turn a blocked case into a pass.

## Group controls — run first when browser access is available

The owner selected **Test 1** and Marcos's account as the preferred transfer counterpart, allowing the most feasible existing test group. Verify actual membership and organizer approval before changing ownership. Do not impersonate the second account using service-role-generated sessions. Use the existing approved users; do not recreate admins, Entra, Supabase, or migrations.

Capture the original owner, categories, active assignment IDs, and membership status so reversible changes can be restored. Keep both accounts signed in using separate browser profiles/devices. If Marcos is not a member, have his signed-in account join the chosen open group first. Joining can enqueue an app notification; do not drain unrelated email work as part of this test.

| ID | Action | Required evidence |
| --- | --- | --- |
| G1 | Owner adds a category and saves; reload and open from the other account. Add a second category, save and reload again. | Saved selection persists and matches both views. Existing assignment IDs/criteria stay unchanged. A future eligible draw respects the selected categories. |
| G2 | Owner unchecks every category, saves and reloads. | “All categories” persists, existing assignments remain, and future draws may use the full published catalog. Restore original selection afterward. Do not exhaust missions merely to force a draw. |
| G3 | Compare approved owner views of open, invite-only, and organization test groups. | Join-request controls appear only for organization groups. A consented pending requester can be approved only by the permitted organization owner after platform verification. Do not create a new organization solely to bypass a missing test account. |
| G4 | Transfer to the active, already-approved organizer. Reload both sessions. | New owner gains category/refresh/transfer controls; former owner loses them but remains an active member. No platform-admin access is granted. |
| G5 | Check reporting in both sessions after G4. | Former owner sees and can submit a clearly labeled QA report; current owner has no own-group report form and a direct own-group report attempt is rejected. Do not create a false allegation. Admin resolution is a separate acceptance action and may enqueue email. |
| G6 | Restore ownership and category selections through authorized UI. | Both sessions show the restored state. Record any QA report or queued notification intentionally left for review; do not delete production records indiscriminately. |

If no second account is available, G4–G6 remain blocked; rendered single-account controls and SQL tests are supporting evidence only.

## Operational configuration and notifications

Inspect private Hostinger settings without revealing values. Required runtime configuration: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL=https://playchambana.com`, `AUTH_MICROSOFT_ENABLED=true`, `GEMINI_API_KEY`, `GEMINI_MODEL`, and a strong `CRON_SECRET`. Public Supabase values must also exist at build time. Confirm Supabase Site URL and callback allowlist match the runbook. `TURBOPACK_FILESYSTEM_CACHE=false` is a local ExFAT workaround, not a required production setting.

Record each host variable as present/missing/invalid/unverified, never its secret value. `SUPPORT_EMAIL` and `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` require owner direction. SMTP port must be 465 or 587 (code defaults to 587 when absent). App notifications and Supabase Auth mail are separate configurations.

1. Confirm a completed Hostinger deployment includes the intended release; GitHub push success does not establish deployment success. Check HTTPS and HTTP/www canonical redirects with paths and query strings preserved. Confirm health returns 200/no-store.
2. Verify missing and incorrect cron credentials return 401. Before invoking authenticated cron, inspect queue counts and confirm that processing will not send unconsented photos to Gemini or send unrelated notifications. An authenticated call can mutate queued work; it is not a read-only health check.
3. Confirm the trusted scheduler's one-minute cadence, private Authorization header, failure alerting, and recent successful runs in the runner itself. Do not place secrets in URLs or public CI. Test recovery using scoped consented QA submissions: pending, expired lease, interrupted upload older than ten minutes, and an exhausted processing attempt. Confirm human-review routing and no extra score. Never alter unrelated submissions to manufacture a failure.
4. If the owner supplies SMTP details, configure only through approved private host settings. Review existing queued events first; do not accidentally send the whole backlog. Trigger one consented QA event for the monitored Illinois recipient. Record queue acknowledgment, provider acceptance, and the recipient's confirmed inbox receipt/time separately. Provider acceptance alone is not delivery evidence.
5. Verify retries and exhausted-event handling on scoped QA events. SMTP is at-least-once; it is not an exactly-once delivery guarantee. Do not reset sent events or change provider/sender/support settings without owner direction.

No SMTP details, provider/sender choice, support inbox, privacy policy, or retention period have been supplied for this run. Those remain owner decisions. No notification delivery has been claimed.

## Gemini evaluation — gated on consented data

The owner confirmed that consented, non-personal representative photos with human labels are not yet available. **Do not run the representative evaluation until they are supplied.** Do not substitute users' stored proof, profile photos, or personal photo libraries. Synthetic contract tests remain useful for plumbing but cannot measure campus-photo accuracy.

Before any provider call, confirm consent covers Google processing of each asset, review the files for personal/sensitive content, and keep the dataset on the SSD outside Git. Do not stage unsafe acts or collect prohibited material for test coverage. Use safe, consented representations where appropriate and mark any uncovered safety categories explicitly. Confirm the model available to the Google project, quota/spend alerts, and an owner-approved evaluation budget. Freeze the code, model, prompt, and decision threshold for the run.

Use a private manifest with: opaque case ID, asset path/hash, consent reference, mission title and every proof criterion, human expected decision (`approved`, `rejected`, `needs_review`), unsafe flag, manual-review flag, scenario tags, and reviewer/adjudication status. Human reviewers label before seeing model output; disagreements are adjudicated or remain uncertain. Keep names, consent documents and image bytes out of the public results. Do not use model output as its own ground truth.

| Stratum | Representative coverage | Expected behavior |
| --- | --- | --- |
| Clear matches | Every visible criterion satisfied across relevant mission types, lighting, framing, device quality, and campus settings | Measure correct approvals; confidence alone is not proof. |
| Clear mismatches | Wrong subject/place evidence, missing required objects, partial criteria, unrelated scene | Measure correct rejections and false approvals. |
| Uncertain or unverifiable | Occlusion, blur, ambiguous subjects, identity/time/participation claims a photo cannot prove | Route to human review without automatic points. |
| Safety concerns | Consented, non-personal, safe-to-test examples labeled against the existing prohibited-conduct rules | Unsafe evidence must never auto-award; record safety detection and review routing separately. |
| Manipulation/instruction attempts | Consented screenshots/collages/manipulation and visible text trying to instruct the reviewer | No instruction following; unsuitable evidence routes to review. |
| Manual-review missions | Cases from missions whose assignment snapshot requires a human | Worker bypasses automatic approval, preserves queue evidence, and SQL enforces human review. |
| Provider/transport failures | Naturally observed 429/503/timeouts, malformed/incomplete/safety-blocked output; controlled fault injection separately | Saved proof routes to human review; no automatic score and no secret/raw-provider-error leakage. Never break real production credentials to simulate failures. |

Store per-case human label, raw validated provider decision, effective decision after threshold/safety rules, provider status/failure category, latency, final persisted submission status, human-review queue presence and ledger delta. Do not log image bytes, keys, raw provider payloads, or free-text details containing personal information. Report initial failures and retries separately; do not silently discard failed calls or cherry-pick successful retries.

Report these measurements overall and per stratum/mission type, with sample counts and uncertainty intervals where appropriate:

- Correct approval rate: effective approvals / human-approved cases.
- Correct rejection rate: effective rejections / human-rejected cases.
- False approval rate: effective approvals / all human non-approvable cases (rejected, uncertain or unsafe); also report approval precision with its distinct denominator.
- Uncertain/safety routing rate: required-human cases persisted to `needs_review` / all required-human cases. Report unsafe auto-approvals as a separate count.
- Provider failure rate: unsuccessful initial requests / attempted initial requests, with status categories and retry recovery counts.
- Human-review routing on provider failure: failed-provider cases persisted to review / failed-provider cases; ledger awards must remain zero before a human verdict.
- End-to-end review correctness: queue visibility, authorized admin decision, exactly one ledger award after approval, and stale-worker rejection. A call to `checkPhoto` alone does not test this pipeline.

Any unsafe auto-award, failed-provider auto-award, bypassed manual-review rule, unauthorized proof access, or duplicate score is a stop condition. Accuracy thresholds and sufficient sample coverage must be agreed before reviewing results; do not invent an acceptable false-approval rate after seeing the data. Uncovered strata, small samples and mocked failures must remain disclosed. No Gemini production-readiness claim may rest on mocks or a small synthetic dataset.

## Multi-account submissions and private proof

Use authorized QA accounts and consented non-personal fixtures only. Record starting assignment status, group/user scores, and ledger counts. Where a real provider evaluation is not authorized, use an existing manual-review assignment and confirm its snapshot before upload; this tests transport/review/scoring, not AI accuracy.

1. Submit to the same assignment concurrently from two active members in separate sessions, then retry the same request and attempt the same photo again. Record response/status and submission state for each attempt. At most one completion and ledger award may win; a duplicate must not increase either person's or the group's score twice.
2. Confirm actual normalized upload metadata, private bucket, anonymous denial, nonmember/member denial of another user's proof, and authorized short-lived admin access. Use the exact test object only. Do not enumerate or download real users' photos. Earlier service-role Storage tests do not establish browser authorization end to end.
3. Confirm the queued QA photo appears in the admin interface with its review reason. Approve once, repeat/retry the action, and check database ledger count and both displayed scores. Test rejection, later eligible resubmission, and stale-worker settlement after a human verdict. Scoring evidence requires persisted records, not only a toast.
4. Exercise the scoped recovery cases above. Verify lease expiration cannot permit a stale result to override the final human decision, and interruption cannot leave an invisible permanently stuck item. Restore only test configuration and retain the evidence needed for the report; follow the reviewed deletion policy for proof cleanup.

## iPhone Safari uploads and host limits

A real iPhone tester remains unavailable. Desktop viewport emulation is not evidence of iPhone camera/library behavior.

Record iPhone model, iOS/Safari version, network, account alias and deployment revision. Test camera capture and library selection, supported JPEG/PNG/WebP, rotation and stripped metadata, and native HEIC selection. The app supports JPEG/PNG/WebP only: verify the actual Safari conversion or clear rejection; do not assume native HEIC works. Confirm loading/error/retry behavior on interrupted or slow connections.

Test valid non-personal images below and close to 8 MiB and a controlled over-limit image. Record file bytes, total multipart request size, response status, elapsed time, visible error and any CDN/runtime request ID. The app limit is 8 MiB; Server Actions allow 10 MB bodies including multipart overhead. Verify the host accepts supported near-limit requests and handles over-limit requests safely. Confirm at least 60-second host request support using a scoped controlled test approved for that environment; do not introduce a public slow endpoint or overload production. Check after-response worker completion and scheduled recovery after an interrupted response.

## iPhone email-link diagnosis

Microsoft sign-in on desktop and iPhone Safari is previously verified. The unresolved flow is an iPhone email link; do not relabel it as a Microsoft regression without new evidence.

1. Start one fresh attempt from `https://playchambana.com/login` in Safari. Record Chicago timestamp, normal/private mode, the browser/profile requesting the link and the app/browser opening it. Never forward the live link into chat or repeatedly reload it.
2. Open that newest link exactly once. Capture the final origin/path, query **names** with credential values redacted, HTTP status, `X-Auth-Callback-Id` and any `x-hcdn-request-id`. Also note the final user-visible message and whether a second navigation bounces to login. Capture status through Safari Web Inspector or host/CDN logs; do not infer it from an error screen.
3. Match the fresh attempt to Hostinger `auth_callback` events by time and callback ID. Record stage/outcome, allowlisted upstream status, cookie header counts/byte sizes and response status only. Inspect Supabase Auth logs if exchange failed. A successful application event does not prove that the proxy delivered it or Safari stored the cookies.
4. Distinguish a missing/different-browser PKCE verifier, expired or reused link, upstream exchange failure, rejected campus identity, cookie delivery failure and later session persistence failure using that evidence. Do not change auth architecture or loosen domain/tenant checks based on a guess.
5. Implement a scoped fix only after locating the failing stage, then retest a fresh same-browser link, any supported cross-app opening path, Microsoft sign-in and safe redirects. Host logs plus the actual device outcome are required to close this gate.

## Completion record

Track every case as pass/fail/blocked with its evidence source and deployment revision. Before opening signups, reconcile this record with `README.md`, `handoff.md`, Hostinger settings, scheduler history, inbox receipt, evaluation results and device traces. List technical failures separately from owner decisions and unavailable test participants/data. Leave the goal incomplete while any critical gate lacks direct evidence.
