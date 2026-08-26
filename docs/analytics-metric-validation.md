# Analytics metric validation

Every number on `/analytics` as of 2026-08-26. Source: `docs/SPEC-visitor-identity.md` §5, GA4 user/session/view split, `convex/analytics.ts`.

The same table is on the dashboard as **How these numbers are counted**.

| Metric | What it counts | Honest meaning | Confidence |
|---|---|---|---|
| Devices | Distinct `deviceId` (cookie + localStorage + IndexedDB) | Floor. One person, three browsers = 3. | High |
| Estimated visitors | Distinct `visitorId` where `confidence ≥ 70` | Best estimate of unique humans. Not a census. | Medium |
| Known contacts | Distinct `visitorId` with a `phoneHash` | People you can actually call. Phone is unverified. | High |
| Views | `tour_view` events in the period | Opens, not people. Refresh = another view. | High |
| Sessions | Distinct `sessionId` on `tour_view` | One tab until it closes. Not unique visitors. | High |
| Leads | Lead rows created in the period | Form submits. Same person can submit twice. | High |
| Avg. scene time | Mean duration on events that sent one | Only events that reported duration. | Medium |
| Lead / view rate | Period leads ÷ period views | Conversion per view, not per person. | High |
| Returning | Visitors with `totalSessions > 1` | Lifetime, not this window. | Medium |

**Not shown (on purpose):** a single Unique Visitors total. Raw IP. Verified phone.

**Selected-tour extras** (not in the glossary table): QR scans / leads follow the period chip. QR **With phone** is `leadsWithPhone` on the form — unverified, and not the People-band Known contacts count.
