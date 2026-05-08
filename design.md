# JobDesk — Design Specification

## Design Philosophy
**Tone:** Editorial-utilitarian. Like a well-designed planner or notebook — functional and structured, but with warmth and character. Not a cold SaaS dashboard. Not generic. Feels like it was made by someone who actually job hunts.

**What makes it memorable:** The warm cream background + coral accent is distinctive without being loud. Typography pairing of a serif wordmark with a clean geometric body font adds editorial credibility. Every element earns its place.

---

## Color System

```css
--bg:           #F7F5F0   /* warm off-white — main background */
--surface:      #FFFFFF   /* cards, modals, inputs */
--surface-2:    #EFECE5   /* secondary surfaces, tag backgrounds */
--border:       #E3DFD7   /* subtle warm gray borders */

--text:         #1C1A16   /* near-black — primary text */
--text-2:       #6B6760   /* medium gray — secondary text, labels */
--text-3:       #A09C96   /* light gray — hints, timestamps, placeholders */

--accent:       #D4622A   /* coral/terracotta — CTAs, active states, brand */
--accent-light: #FAEADE   /* light coral — quick capture banner bg */
--accent-hover: #B85223   /* darker coral — hover state */
```

**Avoid:** Purple, dark blue, neon, generic SaaS blues. No gradients on text.

### Status Color Palette
| Status | Foreground | Background |
|---|---|---|
| Saved | `#8A8880` | `#F0EDE6` |
| Applied | `#2B7FD4` | `#E0EDFA` |
| Interview | `#C68B2A` | `#FBF0DC` |
| Offer | `#2D7D46` | `#DCF0E4` |
| Rejected | `#C94B4B` | `#FADFDF` |

### Outreach Stage Colors
| Stage | Foreground | Background |
|---|---|---|
| 1st Reachout | `#8A8880` | `#F0EDE6` |
| 1st Followup | `#C68B2A` | `#FBF0DC` |
| 2nd Followup | `#D4622A` | `#FAE8DE` |
| Replied | `#2D7D46` | `#DCF0E4` |
| No Response | `#8A8880` | `#F0EDE6` |
| Referred | `#2B7FD4` | `#E0EDFA` |

---

## Typography

| Role | Font | Weight | Size |
|---|---|---|---|
| Wordmark / Logo | Playfair Display | 700 | 18px |
| Section headings | Jost | 600 | 11px uppercase |
| Card titles (company) | Jost | 700 | 14px |
| Card subtitles (role) | Jost | 400 | 12px |
| Body / labels | Jost | 400–500 | 12–13px |
| Badges / tags / pills | Jost | 600 | 10–11px |
| Stat numbers | Jost | 700 | 22px |

**Source:** Google Fonts — `Playfair Display` (display serif) + `Jost` (geometric sans, feels warmer than Inter/Roboto)

---

## Layout & Dimensions

```
Popup width:  400px (fixed, standard Chrome extension)
Min height:   500px
Max height:   580px (scroll within main area)
Border radius: 10px cards, 6px inputs/buttons, 14px modals
Shadow: 0 2px 12px rgba(28,26,22,0.08)  /* cards */
        0 8px 32px rgba(28,26,22,0.14)  /* modals */
```

---

## Component Breakdown

### Header
```
[JobDesk wordmark]          [nudge badge]
────────────────────────────────────────
Height: ~44px. Clean. Wordmark in Playfair Display.
Orange animated pulse badge when follow-ups exist.
```

### Navigation (5 tabs)
```
[ Board ] [ Jobs ] [ People ] [ Nudges 🔴 ] [ Settings ]
────────────────────────────────────────────────────────
Icon + label. Active tab: coral underline + coral icon.
Inactive: gray. Badge on Nudges tab when items due.
```

### Quick Capture Banner (context-aware, appears at top)
```
┌─────────────────────────────────────────────┐
│ 💼  Detected on this page                   │
│     Software Engineer at Google    [ Add ]  │
└─────────────────────────────────────────────┘
Warm coral-tinted background. Slides down on appear.
Only shows when on a recognized job/profile page.
```

### Stats Grid (Dashboard)
```
┌──────┬──────┬──────┬──────┐
│  12  │   8  │   3  │  40% │
│ Jobs │Appl. │Inter.│Reply │
└──────┴──────┴──────┴──────┘
4-column grid. Numbers 22px bold. Labels 10px gray.
Applied = coral, Interviews = green, Reply % = amber.
```

### Pipeline Funnel (Dashboard)
```
  Saved  ████████████████░░░  8
Applied  ████████████░░░░░░░  5
   Int.  █████░░░░░░░░░░░░░░  2
  Offer  ██░░░░░░░░░░░░░░░░░  1
```
Horizontal bars with warm fills. Label left, count right.

### Job Card
```
┌─────────────────────────────────────────────┐
│ Google                          [Applied]   │
│ Software Engineer, L5           ☆  LinkedIn │
│ ─────────────────────────────────────────── │
│ [Remote] [Full-time] [SWE]     👥 2 people │
└─────────────────────────────────────────────┘
Click anywhere → Job Detail modal.
Star button toggles, no limit on stars.
Tags are small pill-shaped chips.
```

### Contact Card
```
┌─────────────────────────────────────────────┐
│ Jane Smith                   [1st Followup] │
│ Senior PM · Google                          │
│ MIT · ex: Meta, Stripe                      │
│ ─────────────────────────────────────────── │
│ [Alumni] [Employee]     Linked: Google SWE  │
│ Last contacted: 3 days ago                  │
└─────────────────────────────────────────────┘
```

### Nudge Card
```
┌ ▌ ───────────────────────────────────────── ┐
│   Jane Smith · 1st Reachout                  │
│   Google PM · last contacted 8 days ago      │
│                         [Bump stage] [Skip]  │
└─────────────────────────────────────────────┘
Left colored bar: red (>2x threshold), amber (1–2x), coral (at threshold).
```

### Modal
```
Full-width, slides up from bottom.
Max height: popup height − 40px, scrolls internally.
2-column form layout for related fields (Company | Role, etc.)
Tag boxes with removable chips for job_type and role_category.
```

---

## Micro-interactions & Motion

| Event | Animation |
|---|---|
| Tab switch | `fadeIn 0.15s ease` |
| Modal open | `slideUp 0.2s ease` from 12px below |
| Quick capture banner | `slideDown 0.2s ease` |
| Nudge badge | `pulse 2s infinite` scale |
| Card hover | `box-shadow` transition 0.15s |
| Pill/filter click | Background color transition 0.15s |
| Stage bump | Card fades out of Nudges list |

All animations are CSS-only (no JS animation libraries). Fast and purposeful — nothing decorative for its own sake.

---

## UX Principles

1. **Capture first, fill later.** URL is always auto-grabbed. Company/role is pre-filled when detectable. User can always edit.

2. **One screen, no nesting.** Everything lives in the popup. No new tabs. Job detail is a modal, not a new page.

3. **Follow-up urgency is visual.** Color-coded nudge cards make priority obvious at a glance. No reading required.

4. **Smart defaults.** Status defaults to "Saved". Stage defaults to "1st Reachout". Source auto-detected. Tags auto-suggested.

5. **Never lose context.** The "Who do I know there?" alert surfaces on job detail so you always know your warm paths before applying.

6. **Zero friction for daily use.** The extension opens in ~1 second. Most common action (add job, bump stage) is ≤2 clicks.

---

## Accessibility
- All interactive elements have visible focus states (`border-color: var(--accent)`)
- Color is never the *only* indicator — badges also have text labels
- Form labels are always visible (no placeholder-only labels)
- Sufficient contrast ratios: text on --bg passes AA

---

## Files
| File | Role |
|---|---|
| `popup.css` | Full design system implemented as CSS variables + component classes |
| `popup.html` | HTML structure using semantic elements |
| `popup.js` | All rendering logic (no inline styles, only class manipulation) |
