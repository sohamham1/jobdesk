# JobDesk — Chrome Extension Plan (v1)

## What It Is
A lightweight Chrome extension CRM for job seekers. One-click capture jobs and contacts from any webpage. Track applications, referral outreach, and follow-ups — all stored locally in your browser, zero cost, no server.

---

## Architecture
- **Chrome Extension** — Manifest V3
- **Storage** — `chrome.storage.sync` (free cross-device sync via user's Google account)
- **Distribution** — GitHub zip → "Load Unpacked" in Chrome. No Web Store needed for v1.
- **Future modes** — Same codebase can serve researchers (papers/citations) and law students (cases/articles)

---

## File Structure
```
manifest.json         ← extension config, permissions
popup.html            ← full CRM UI (all views)
popup.css             ← design system + component styles
popup.js              ← all app logic: storage, rendering, events
content.js            ← page scraper + auto-tagger (runs on every page)
background.js         ← service worker: daily alarm, follow-up notifications
icons/                ← 16, 48, 128px icons
README.md             ← how to install (load unpacked guide)
```

---

## Data Model

### Job
| Field | Type | Source |
|---|---|---|
| id | uuid | auto |
| company | string | auto-scraped / manual |
| role | string | auto-scraped / manual |
| url | string | auto (current tab URL) |
| source_site | string | auto-detected from URL |
| job_type | string[] | **auto-tagged** from page text |
| role_category | string[] | **auto-tagged** from title/description |
| status | enum | manual |
| starred | boolean | manual (unlimited stars) |
| date_added | ISO date | auto |
| deadline | date | manual |
| salary_range | string | auto-scraped if visible |
| notes | text | manual |
| interview_notes | text | manual |
| activity | event[] | auto-logged on state change |

### Contact (linked to one or more Jobs)
| Field | Type | Source |
|---|---|---|
| id | uuid | auto |
| name | string | auto-scraped / manual |
| profile_url | string | auto (current tab URL) |
| platform | string | auto-detected (LinkedIn, Twitter, GitHub, Scholar, etc.) |
| current_role | string | auto-scraped |
| current_company | string | auto-scraped |
| college | string | auto-scraped (LinkedIn Education) |
| past_companies | string[] | auto-scraped (LinkedIn Experience) |
| person_type | string[] | **auto-tagged** (Recruiter, Hiring Manager, Alumni, Founder, Investor, Employee) |
| relationship | enum | manual (Cold DM, Warm, Alumni Network, Referral, Met at Event) |
| outreach_stage | enum | manual (1st Reachout → 1st Followup → 2nd Followup → Replied → No Response → Referred) |
| linked_job_ids | string[] | manual — one contact can link to multiple jobs |
| last_contacted | date | manual |
| notes | text | manual |

---

## Auto-Tagging Logic (content.js)

### Job Type (from page body text)
| Pattern | Tag |
|---|---|
| "intern", "internship" | `Internship` |
| "contract", "contractor", "freelance" | `Contract` |
| "part-time", "part time" | `Part-time` |
| "remote" | `Remote` |
| "hybrid" | `Hybrid` |
| none of above | `Full-time` |

### Role Category (from job title + description)
| Keywords | Tag |
|---|---|
| engineer, developer, SWE, backend, frontend, iOS, Android | `Software Engineering` |
| product manager, PM, APM, RPM | `Product Management` |
| venture capital, VC, investor, investment analyst | `Venture Capital` |
| consultant, consulting, strategy, advisory | `Consulting` |
| data scientist, data analyst, ML, AI | `Data & AI` |
| design, UX, UI, product designer | `Design` |
| finance, IB, private equity, PE | `Finance` |
| marketing, growth, brand, content | `Marketing` |
| operations, ops, chief of staff | `Operations` |
| research, researcher, scientist | `Research` |

### Person Type (LinkedIn profile detection)
| Signal | Tag |
|---|---|
| Title: Recruiter / Talent / HR | `Recruiter` |
| Title: Hiring Manager / EM | `Hiring Manager` |
| Title: Founder / CEO / Co-founder | `Founder` |
| Title: Partner / Principal / Investor | `Investor` |
| Same company as a saved job | `Employee` |
| Same college as user (set in Settings) | `Alumni` |

### Source Site (from tab URL)
`linkedin.com/jobs` → LinkedIn · `indeed.com` → Indeed · `glassdoor.com` → Glassdoor · `greenhouse.io` → Greenhouse · `lever.co` → Lever · `workday` → Workday · `handshake.com` → Handshake · `wellfound.com` → Wellfound

---

## Quick Capture (context-aware banner)
When popup opens:
- **On a job post page** → banner shows "💼 Detected: [Role] at [Company]" + [Add Job] button
- **On a LinkedIn/profile page** → banner shows "👤 Detected: [Name] at [Company]" + [Add Person] button
- **Anywhere else** → no banner; user manually adds via + button

---

## Views (inside popup)

| Tab | What it shows |
|---|---|
| **Board** | Stats grid (total, applied, interviews, reply rate) + funnel + follow-ups due + starred jobs |
| **Jobs** | Searchable, filterable list of all jobs. Click → job detail slide-in |
| **People** | All contacts, filterable by stage/company/college |
| **Nudges** | Follow-up queue sorted by urgency. Quick action buttons to bump stage |
| **Settings** | College (for alumni detection), follow-up threshold days, notifications toggle, CSV export |

---

## Full Feature List

### Core
- [x] One-click capture job from any job post tab
- [x] One-click add contact from any profile tab
- [x] Auto-tag job type, role category, source, person type
- [x] Multiple contacts per job
- [x] One contact can link to multiple jobs
- [x] Unlimited starred / priority jobs

### Tracking
- [x] Job status: Saved → Applied → Interview → Offer → Rejected
- [x] Outreach stage per contact: 1st Reachout → 1st Followup → 2nd Followup → Replied → No Response → Referred
- [x] Activity timeline auto-logged per job (status changes, contacts added, etc.)
- [x] Last contacted date per contact

### Intelligence
- [x] "Who do I know there?" — when viewing a job, surfaces existing contacts at that company
- [x] Warm path finder — surfaces contacts whose *past companies* match a new job's company
- [x] Reply rate analytics (replied + referred / total contacted)
- [x] Pipeline funnel visualization
- [x] Rejection pattern tracking (where in the funnel are you dropping off?)

### Nudges
- [x] Follow-up due queue: contacts not replied to after X days (configurable)
- [x] Extension badge count (orange number on icon)
- [x] Daily desktop notification via `chrome.alarms` + `chrome.notifications`
- [x] Quick stage-bump buttons directly from Nudges tab

### Productivity
- [x] Outreach message templates with {{name}}, {{company}}, {{role}} placeholders
- [x] Interview notes field per job
- [x] One-click copy for any URL, email, name
- [x] Duplicate detection (warns if job URL or profile URL already saved)
- [x] Search + filter across jobs and contacts

### Data
- [x] `chrome.storage.sync` — cross-device via user's Google account (free, no server)
- [x] CSV export of all jobs + contacts
- [x] Color-coded status and stage badges

---

## Sync Strategy
| Tier | Method | Cost | Setup |
|---|---|---|---|
| Default (v1) | `chrome.storage.sync` | Free | Zero — just works |
| Power users (v2) | GitHub Gist | Free | Paste token once |

`chrome.storage.sync` limit: 100KB / 512 items. Fine for ~200 jobs + contacts.

---

## Nudge Delivery
1. `background.js` sets a `chrome.alarms` alarm on install (fires daily at 9am)
2. On alarm: loads all contacts, checks `last_contacted` vs `settings.followup_days`
3. Contacts overdue → `chrome.notifications.create()` fires desktop notification
4. Extension badge updated with count via `chrome.action.setBadgeText()`
5. Clicking notification opens the popup to the Nudges tab

---

## Build Order
1. ✅ `manifest.json`
2. ✅ `popup.html` (all views + modals)
3. ✅ `popup.css` (design system)
4. ⬜ `popup.js` (storage, rendering, all logic)
5. ⬜ `content.js` (page detection + scraping + auto-tagging)
6. ⬜ `background.js` (alarms + notifications + badge)
7. ⬜ Icons (16, 48, 128px)
8. ⬜ README.md (install guide)
