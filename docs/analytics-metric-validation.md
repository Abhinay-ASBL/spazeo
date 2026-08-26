# Analytics metric validation

Every number on `/analytics` as of 2026-08-26. Source: `docs/SPEC-visitor-identity.md` §5, GA4 user/session/view split, `convex/analytics.ts`.

The same table is on the dashboard as **How numbers are counted**.

| Metric | Where | Counts | Honesty | Validated |
|---|---|---|---|---|
| Devices | People band | Distinct `deviceId` on `visitorIdentities` | Floor | Yes |
| Estimated visitors | People band | Distinct `visitorId`, `confidence ≥ 70` | Estimate, never a census. ⓘ on the label | Yes |
| Known contacts | People band | Visitors with `phoneHash` | Unverified phone | Yes |
| Views | This period | `tour_view` in the selected window (7D/30D/90D/**All**) | Opens, not people. All-time in caption | Yes |
| Sessions | This period + tour table | Distinct `sessionId` | Same tab refresh = one session. Not unique visitors | Yes |
| Leads | This period + tour table | Lead rows created in the window | Form submits | Yes |
| Avg. scene time | This period | Mean `duration` in the window | Only events that sent duration | Yes |
| Lead / view rate | Under avg. scene time | Period leads ÷ period views | Per view, not per person | Yes |
| Returning | Selected tour | `totalSessions > 1` | Lifetime, not this window | Partial |
| QR scans / leads | Selected tour | Views with `qr`/`mm`/`camp`; leads matched on micromarket | Placement, not identity. Follows the period chip | Yes |
| QR with phone | Selected tour | Matched leads that included a phone (`leadsWithPhone`) | Unverified — not OTP. Never labelled Verified. Not the People-band count | Yes |

**Not shown (on purpose):** a single Unique Visitors total. Raw IP. Verified phone.

**All chip:** overview, tour table, selected-tour people, QR, and variant engagement all use the same window. Trends are hidden (zero) when All is selected so a 30-day previous period is not implied.
