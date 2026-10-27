---
paths:
  - "src/**/*.tsx"
  - "src/**/*.css"
---

## Design System Rules

### Colors — always use CSS variables, never hardcode

**Dark theme (default):**
```
Primary:   #D4A017  (Brand Gold — buttons, accents, active states)
Hover:     #E5B120  (Gold hover)
Teal:      #2DD4BF  (Spatial Teal — navigation, viewer, exploration)
Coral:     #FB7A54  (Warm Coral — urgent CTAs, promotions)
Dark bg:   #0A0908  (Carbon Base)
Surface:   #12100E  (Card backgrounds)
Elevated:  #1B1916  (Raised elements, inputs)
Overlay:   #2E2A24  (Dropdowns, overlays)
Text:      #F5F3EF  (Primary text)
Text 2:    #A8A29E  (Secondary text)
Muted:     #6B6560  (Helper text, captions)
Success:   #34D399
Warning:   #FBBF24
Error:     #F87171
```

**Light theme** (activate with `class="light"` or `data-theme="light"`):
```
Primary:   #B8860B  (Deeper Gold — WCAG AA on white)
Hover:     #D4A017
Teal:      #0D9488  (Darker Teal — legible on light)
Coral:     #F46036
Light bg:  #FAFAF7  (Warm Ivory base)
Surface:   #FFFFFF
Elevated:  #F5F3EF
Overlay:   #EDEAE4
Text:      #1C1917
Text 2:    #57534E
Muted:     #78716C
Success:   #059669
Warning:   #D97706
Error:     #DC2626
```

**Color rule:** 60-30-10 (60% neutrals, 30% text+teal, 10% gold+coral)

### Typography
- **Plus Jakarta Sans** for display/headings — `--font-jakarta`
- **DM Sans** for body text, labels, UI — `--font-dmsans`
- Type scale: Display 48px → H1 36px → H2 28px → H3 22px → Body 16px → Small 14px

### Spacing — 4px base grid
```
xs=4  sm=8  md=12  base=16  lg=24  xl=32  2xl=48  3xl=64
```

### Border Radius
```
4px  → inputs, text fields
8px  → buttons, cards, dropdowns
12px → modals, panels
9999px → pills, avatars, badges
```

### Shadows
```
sm: 0 1px 2px rgba(0,0,0,0.05)   → buttons, inputs
md: 0 4px 6px rgba(0,0,0,0.07)   → cards, dropdowns
lg: 0 10px 15px rgba(0,0,0,0.1)  → modals, popovers
xl: 0 20px 25px rgba(0,0,0,0.15) → tour viewer overlay
```

### Buttons
| Variant | Style |
|---|---|
| Primary | `#D4A017` bg, `#0A0908` text, 8px radius, 14px bold, 40px height |
| Teal | `#2DD4BF` bg, `#0A0908` text — spatial/navigation actions |
| CTA | `#FB7A54` bg, white text — urgent/promotional actions |
| Secondary | transparent bg, gold 1.5px border, gold text |
| Ghost | no bg, gold text — low-priority actions |

### Icons
- Lucide React only (`lucide-react`)
- 24px default, 1.5px stroke, rounded caps
- Gold `#D4A017` for interactive, Teal `#2DD4BF` for spatial/navigation, Grey `#6B6560` for decorative

## Brand Voice in UI Copy

| Do | Don't |
|---|---|
| Short, confident sentences | Jargon or buzzwords |
| "Your tour is ready" | "Leveraging our neural pipeline..." |
| "Upload. Process. Share." | "hey!! it's done lol" |
| Empowering, capability-first | Patronizing ("don't worry, it's easy!") |

**Personality keywords:** Immersive · Intelligent · Effortless · Premium · Seamless
