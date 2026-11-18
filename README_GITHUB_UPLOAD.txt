TET2 v0.25 — SECOND CHANCE CUP FORMAT PILOT (GITHUB-SAFE ENGINEERING)

EXISTING REPO UPDATE — NO CLONING AGAIN
1. Keep the recent TET2 recovery JSON you exported privately from your phone.
2. Extract this ZIP. Copy ALL its contents into your ALREADY CLONED TET2
   repository folder, replacing existing files. DO NOT delete the .git folder.
3. Open that TET2 folder in VS Code, then Terminal > New Terminal. Run:
      git add -A
      git commit -m "TET2 v0.25 Second Chance Cup Pilot"
      git push origin main
4. Open the same TET2 Pages URL on your phone and refresh. The small header
   should say 0.25. Do NOT reinstall, clear browsing/site storage, or reimport
   your Garage. Leave OTG! untouched.

WHAT'S NEW:
- Independent 16-car SECOND CHANCE CUP engineering pilot.
- Four groups of four; one recorded run per car on the SAME route for that group;
  fastest in each group qualifies for knockout.
- Two semifinal matches, ONE bronze medal duel between semifinal losers BEFORE
  the final, then gold/silver in the final. 16 solo times + 4 knockout matches.
- All timed inputs support digits only: 0336784 becomes 03:36.784.
- Equal fastest group times are a safe stop; correct a saved group time BEFORE
  semifinals. Tied knockout times require a rerun; no result is banked.
- Every result uses the current private TET2 per-event IndexedDB registry and
  participates in unified backup, Evil List, Race Control and medal reporting.
- Undo removes only this Cup's latest saved result.
- Competition HQ now has a real button to RACE CONTROL; Race Control lists the
  next independent events and opens them directly instead of offering only an
  aggregate count and a confusing legacy Race Off button.

IMPORTANT: THIS IS ONLY A FORMAT PILOT, NOT QUALIFICATION IMPLEMENTATION.
The 16 cars are uniquely selected at random from your privately imported Garage
and are explicitly PROVISIONAL. They are not real Second Chance qualifiers.
Eligibility/source-competition rules and the full official running order are
NOT finalised. Do not begin the real Evil Tournament with this build.

PRIVACY:
This ZIP contains application source files, generic icons, and public FH5
route names. It contains NO owned Garage JSON, original family photos or real
racing-result backups. GitHub Pages makes these code files publicly readable;
NEVER commit your OTG portable backup, imported Garage JSON, or TET2 backup.
Your currently imported 704-car Garage stays in the phone's existing local
TET2_GARAGE_PRIVATE_V1 IndexedDB. Results use existing TET2 storage. A ZIP
update cannot by itself guarantee data permanence; preserve private backups.
Different GitHub Pages repository paths on the same hostname are NOT an
independent browser security boundary; use a separate domain for stronger
isolation if desired. No service worker or automatic cache is installed.

QA STATUS (ENGINEERING, NOT PHONE APPROVAL):
- JS syntax, source asset manifest, and ZIP integrity checked.
- Deterministic engine tests: provisional 16 unique entrants; 4×4 group phase;
  20 sequential records; semifinals; bronze-before-final; podium; invalid
  result detection; group tie blocking/correction; undo — passed.
- Phone live test for this NEW v0.25 feature is PENDING. Existing v0.24
  Race Off and private IndexedDB workflow previously passed on the user's phone.
- Browser HTTP QA was blocked by the execution environment's administrator;
  no live website or actual phone test is claimed for v0.25.
