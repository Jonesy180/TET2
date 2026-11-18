TET2 ENGINEERING v0.26 — SECOND CHANCE CUP LOAD FIX (GITHUB-SAFE)

REAL PHONE ISSUE (Nov 18, 2026): tapping CREATE PROVISIONAL CUP had no
visible effect; the app reported "Cannot read properties of undefined
(reading 'create')" in a message far down the Evil List. Race Off still
worked. The 0.25 page was displayed, but its Second Chance module was not
available at the time of the click. This is compatible with an outdated
cached boot.js (v0.24 lacks the new module), or a missing/failed deployment
of instance-second-chance.js. The phone screenshot alone cannot prove which.

FIXES:
* All entry-point assets and dynamically loaded modules have a build=026
  query parameter, so a newer HTML cannot quietly reuse an old boot.js.
* Create button now shows readiness/errors DIRECTLY under the button.
* When a Cup successfully creates, opens that Cup's Group A immediately.
* Missing module never creates a phantom schedule slot. All other racing
  features remain usable (no unnecessary reset or global safe-stop).
* No changes to IndexedDB database names, the Garage schema, race formats,
  or saved competition data. Official Second Chance qualifying rules and
  running order are NOT finalised; the Cup is a provisional FORMAT PILOT.

INSTALL IN SAME TET2 GITHUB REPOSITORY; NEVER CLONE OR CLEAR SITE DATA AGAIN:
1. Extract this ZIP and copy ALL application files into your already-cloned
   Documents/TET2 Git repository folder, replacing old files. Do NOT touch
   the hidden .git directory. Ensure instance-second-chance.js and boot.js
   appear in the repository root alongside index.html.
2. VS Code → Terminal → New Terminal:
       git add -A
       git commit -m "TET2 v0.26 Second Chance phone load fix"
       git push origin main
3. Open your normal GitHub Pages URL on the same phone, refresh, confirm
   version 0.26 and the green Cup-engine-ready message below Create.
4. Press Create ONCE. It should open Group A / Car 1 of 4 automatically.
   Do not enter times until the visible 16-car draw has been checked.
5. Keep previous private recovery JSON safe. Do NOT import/reinstall/clear.

IMPORTANT: ZIP CONTAINS NO PRIVATE FH5 GARAGE, PLAYER RESULTS, OR FAMILY PHOTOS.
DO NOT UPLOAD THE ORIGINAL OTG! BACKUP OR YOUR PRIVATE TET2 JSON TO GITHUB.
GitHub Pages repository paths on the same hostname are not separate origins.
This build has only local static syntax/regression tests; actual-phone QA is pending.
