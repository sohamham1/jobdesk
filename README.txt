JobDesk

What this is
JobDesk is a Chrome extension for tracking jobs, referrals, and outreach.
It helps you:
- save jobs directly from supported job pages
- save people / referral contacts
- track application status
- manage follow-ups
- keep your own links, resumes, experience, and education details in one place


What is included
- popup.html / popup.css / popup.js
  Main extension interface and full-page workspace
- content.js
  Detects supported job/profile pages and powers one-click capture
- background.js
  Badge counts, reminders, and notifications
- manifest.json
  Chrome extension manifest
- icons/
  Extension icons


How to install locally
1. Open Chrome
2. Go to chrome://extensions
3. Turn ON Developer mode
4. Click Load unpacked
5. Select this project folder


How to use
1. Open a supported job page
2. Use the floating Save Job button, or open the extension
3. Open the full-page workspace for the best experience
4. Track:
   - status
   - referral state
   - referral contact
   - follow-ups
   - notes


Main features
- one-click job capture from supported sites
- people / referral tracking
- jobs sheet view for fast editing
- smart filters
- starred jobs
- follow-up nudges
- local “About Me” library
- experience and education copy bank for applications


Supported job-site detection
This build includes support for detection/scraping on sites such as:
- LinkedIn
- Greenhouse
- Lever
- Workday
- Kula
- Darwinbox
- Monster
- ZipRecruiter
- Dice
- Idealist
- Getwork
- Snagajob
- Instahyre
- Naukri
- FlexJobs


Important notes
- Scraping is heuristic-based, so some fields may still need manual cleanup.
- Data is stored through Chrome extension storage, not a backend server.
- Resume fields store only a path or link. The actual file is not uploaded.
- The extension is intentionally disabled on Gmail.


Recommended workflow
- Use the website overlay to save jobs quickly
- Use the full-page Jobs sheet as your main tracker
- Link referral contacts wherever possible
- Use Settings > About Me to store your reusable application information


If something does not work
- Refresh the extension from chrome://extensions
- Reload the target website page
- Try saving manually from the extension UI
- Some websites may need selector tweaks for perfect scraping


Project status
This is a working local Chrome extension project that is close to feature-complete for v1, with the main remaining work being real-world testing and small site-specific scrape fixes.
