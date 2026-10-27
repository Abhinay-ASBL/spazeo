# Spazeo — Notion Workflow (How to Get Your Next Task)

> Moved verbatim from `AGENTS.md`/`CLAUDE.md` to keep startup context small.

## Notion Workflow (How to Get Your Next Task)

Notion is the source of truth for all features. Claude Desktop writes the specs there.
Claude Code (you) reads them and builds.

### How to Start a Feature

When the user says "build Feature 01" or "work on scene transitions", do this:

1. Use the Notion MCP tool to fetch the feature page
2. Read Section 3 (Build Spec) and Section 4 (Done When)
3. Read the files listed under "Files to Read First"
4. Build the feature
5. When done, update the Notion page status to Done

### Feature Page IDs (Notion)

| # | Feature | Notion Page ID |
|---|---|---|
| 01 | Scene Transitions | 31b16b84-9ab6-811b-b07f-ee7309b15674 |
| 02 | Hotspot Editor | 31b16b84-9ab6-818c-b8ba-fc758f4e5419 |
| 03 | Mobile Touch Gestures | 31b16b84-9ab6-8187-87e2-d92e26ea6c4f |
| 04 | Tour Publish Flow | 31b16b84-9ab6-81bb-b557-e246f7cd2405 |
| 05 | Lead Capture Form | 31b16b84-9ab6-815b-89b4-d9e573d67e3e |
| 06 | AI Scene Analysis | 31b16b84-9ab6-81d6-a15b-e60e8dec813d |
| 07 | AI Virtual Staging | 31b16b84-9ab6-81ff-8c22-dc761fc32f8b |
| 08 | Analytics Dashboard | 31b16b84-9ab6-81d4-ac62-d78913fca860 |
| 09 | Lead Management CRM | 31b16b84-9ab6-811b-9dec-dc2616de2816 |
| 10 | Stripe Billing + Plan Limits | 31b16b84-9ab6-8131-abab-e2bd764f2cdb |
| 11 | Onboarding Flow | 31b16b84-9ab6-811c-859a-e800ed644921 |
| 12 | Tour Settings | 31b16b84-9ab6-81ec-b054-ef849bc3fff3 |
| 13 | 3D Building Viewer | 31b16b84-9ab6-81f8-ae73-db289a054c6b |
| 14 | Embed Code Generator | 31b16b84-9ab6-81d6-86ba-c54826917209 |
| 15 | Performance + Launch Polish | 31b16b84-9ab6-8149-89e4-c033217b8638 |

### Screen Requirements Page IDs (when fixing existing pages)

| Screen | Notion Page ID |
|---|---|
| Homepage (/) | 31b16b84-9ab6-8120-84fa-c7927fd0c155 |
| Pricing (/pricing) | 31b16b84-9ab6-81aa-87ce-e348e9d06d3f |
| Public Tour Viewer (/tour/[slug]) | 31b16b84-9ab6-81ef-a422-f58823745be8 |
| Sign In | 31b16b84-9ab6-8158-ae5a-c9ce7b65efd8 |
| Sign Up | 31b16b84-9ab6-8192-8243-f2db148744e4 |
| Dashboard (/dashboard) | 31b16b84-9ab6-81a2-93fa-d49715fd4a74 |
| Tour List (/tours) | 31b16b84-9ab6-81b2-8f10-ebb284a0271f |
| Tour Editor (/tours/[id]/edit) | 31b16b84-9ab6-815f-8984-e58482d585b5 |
| Analytics (/analytics) | 31b16b84-9ab6-819b-8973-e417119f86ce |
| Leads CRM (/leads) | 31b16b84-9ab6-81f2-b14b-e2ac049b2292 |
| Settings (/settings) | 31b16b84-9ab6-81bc-8c7c-dd35e087806f |
| Billing (/billing) | 31b16b84-9ab6-817a-b651-d372a5ddd1a2 |

### Command Examples

User says: "Build Feature 01"
-> Fetch page 31b16b84-9ab6-811b-b07f-ee7309b15674 from Notion
-> Read the Build Spec section
-> Read the files listed
-> Build it

User says: "Fix the dashboard page"
-> Fetch page 31b16b84-9ab6-81a2-93fa-d49715fd4a74 from Notion
-> Read the requirements (what is missing / needs improvement)
-> Fix those specific things

User says: "What should I build next?"
-> Fetch page 31b16b84-9ab6-81a0-ad30-e0f8f5355b86 (Build Queue)
-> Find the first feature that is not Done
-> Report back with the feature name and estimated time
