---
status: fixing
phase: 06-hotspot-customization-options-icons-info-panels-video-support-and-adaptive-screen-layout
source: 06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md, 06-05-SUMMARY.md, 06-06-SUMMARY.md
started: 2026-03-09T00:00:00Z
updated: 2026-03-09T00:00:00Z
---

## Current Test

number: 4
name: Info Panel as Bottom Sheet (Mobile)
expected: |
  On mobile viewport (narrow screen), clicking a non-navigation hotspot shows the info panel rising from the bottom of the screen as a bottom sheet — not from the right side. The panel shows hotspot content. Tapping X dismisses it.
awaiting: user response

## Tests

### 1. Hotspot Custom Icon Display
expected: In the public tour viewer, a hotspot configured with a custom iconName (e.g., "bed", "camera", "star") displays that Lucide icon on the marker button instead of the default icon. The icon is visible on the panorama before clicking.
result: issue
reported: "for navigaction also add the Icon customizetion"
severity: major

### 2. Hotspot Accent Color Override
expected: A hotspot configured with a custom accentColor (e.g., "#FF5500") shows that color on the marker button background and the animated ping ring — overriding the default gold color.
result: issue
reported: "for Navigation i am not getting to select the and it should get different different option like this — reference images show multiple navigation hotspot visual styles (ring, arrow/chevron, different sizes) that users can select from"
severity: major

### 3. Info Panel Opens on Click (Desktop)
expected: On desktop, clicking a non-navigation hotspot (info, link, or media type without a video URL) causes a right-side drawer panel to slide in from the right edge of the screen. The panel shows the hotspot title, description, and a CTA button if configured. Clicking X closes it.
result: issue
reported: "i want in navigaction also — navigation hotspots should also be able to show the info panel, not just do scene transitions"
severity: major

### 4. Info Panel as Bottom Sheet (Mobile)
expected: On mobile viewport (narrow screen), clicking a non-navigation hotspot shows the info panel rising from the bottom of the screen as a bottom sheet — not from the right side. The panel shows hotspot content. Tapping X dismisses it.
result: [pending]

### 5. Video Modal Opens for Media Hotspot
expected: Clicking a media hotspot that has a video URL (YouTube, Vimeo, or direct video file) opens a full-screen video overlay covering the entire viewer. A YouTube/Vimeo link shows an embedded iframe player; a direct video file shows an HTML5 video element.
result: [pending]

### 6. Video Modal Closes on Backdrop Click
expected: With the full-screen video modal open, clicking anywhere on the dark backdrop area (outside the video player) closes the modal with a fade-out animation and returns to the panorama view.
result: [pending]

### 7. Panel Auto-Closes on Scene Change
expected: With an info panel open, navigate to a different scene by clicking a navigation hotspot. The info panel automatically closes as the new scene loads — no manual close required.
result: [pending]

### 8. Tour Editor Icon Picker
expected: In the tour editor (/tours/[id]/edit), opening the hotspot creation form for a non-navigation hotspot type shows an icon picker grid with 17 icon options plus a "None" (—) option. Clicking an icon highlights it with a gold border. Selecting "None" clears the icon selection.
result: [pending]

### 9. Tour Editor Panel Layout Selector
expected: The hotspot creation form (for non-navigation types) shows a "Panel Layout" dropdown with 3 options: Compact, Rich (image + CTA), and Video modal. The dropdown is not shown for navigation hotspot type.
result: [pending]

### 10. Tour Editor CTA Progressive Disclosure
expected: In the hotspot form for info or link types, a "CTA Button Label" text input is visible. When it has text typed in, a "CTA Button URL" input appears below it. When the CTA Label is cleared/empty, the CTA URL field disappears.
result: [pending]

## Summary

total: 10
passed: 0
issues: 3
pending: 7
skipped: 0

## Gaps

- truth: "Navigation hotspots support icon customization via iconName field"
  status: failed
  reason: "User reported: for navigaction also add the Icon customizetion"
  severity: major
  test: 1
  artifacts: []
  missing: []

- truth: "Navigation hotspots have selectable visual styles (ring, arrow/chevron, etc.) matching industry-standard virtual tour UX"
  status: failed
  reason: "User reported: for Navigation i am not getting to select the and it should get different different option like this — reference images show multiple navigation hotspot visual styles (ring, arrow/chevron, different sizes) that users can select from"
  severity: major
  test: 2
  artifacts: []
  missing: []

- truth: "Navigation hotspots can also show info panel with title/description/CTA, not just scene transitions"
  status: failed
  reason: "User reported: i want in navigaction also — navigation hotspots should also be able to show the info panel"
  severity: major
  test: 3
  artifacts: []
  missing: []
