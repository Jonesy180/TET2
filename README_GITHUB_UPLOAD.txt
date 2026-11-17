TET2 v0.23 — GITHUB-SAFE FIRST PHONE QA (ENGINEERING ONLY)

THE FILES IN THIS ZIP ARE INTENDED FOR A PUBLICLY SERVED GITHUB PAGES SITE.
They contain app source, competition engines, routes, and generic TET2 icon graphics.
They DO NOT contain Andy's owned-car Garage JSON, source photos, or racing backups.

UPLOAD TO GITHUB
1. Create/use a SEPARATE TET2 repository, not the public OTG! repository.
2. Unzip this archive. Upload the contents of the extracted folder to the site root,
   including index.html, *.js, tet2.css, manifest.webmanifest and icons/.
3. Enable GitHub Pages for the chosen branch and site root (or use the existing
   OTG! workflow, but publish this repository separately).
4. Open the HTTPS Pages URL on your phone. Choose Add to Home Screen as usual;
   the app's short label is TET2.

FIRST-RUN GARAGE IMPORT — ON PHONE, NOT IN GITHUB REPOSITORY
5. On the first visit, the app will request one private FH5 Garage JSON.
   Choose the original OTG-PORTABLE-BACKUP-2026-11-17T17-43-34-348Z.json,
   or the earlier TET2_FH5_Garage_Donor_704cars.json.
6. The app extracts and validates exactly 704 FH5 cars / 123 manufacturers,
   stores them in TET2_GARAGE_PRIVATE_V1 IndexedDB, and verifies readback.
   It imports NO past OTG racing results. This frozen engineering collection
   can NOT be replaced by a different collection in this build.
7. On the home page select PRIVATE PHONE PREFLIGHT; run the first read-only test.
   Then WRITE MARKER, reload the app, VERIFY AFTER RELOAD, and DELETE MARKER.
8. Export a complete TET2 backup in the RECOVERY screen and keep that file PRIVATE.
   Only after the above tests pass, create ONE disposable engineering event and
   check the List/Results/Race Control connection. Not official racing yet.

IMPORTANT SAFETY / LIMITATIONS
- GitHub Pages makes SITE CONTENT PUBLIC; do not publish an OTG backup, Garage JSON,
  private results, source family photos, or any personally sensitive media.
- TET2 local IndexedDB is not uploaded by GitHub. It is bound to browser ORIGIN;
  another browser/profile/device or different domain won't automatically have it.
- Different GitHub Pages repository PATHS on the same username.github.io host
  share the SAME browser security origin. Database names are separate but this is
  not a security boundary. Use a separate host/custom domain for stronger separation.
- Imported Gallery/3D art MAY be publicly visible once committed. No family artwork
  is included in v0.23; cartoon illustrations will be a later design phase.
- No automatic service worker or update cache is installed in v0.23. A browser
  connection is required to load the app; this avoids auto-update loop risks.
- Production-scale performance, full native donor event controllers and REAL phone
  IndexedDB/Web Crypto have NOT YET BEEN CERTIFIED. Do not begin official Slot 001.
- The app can import this 704-car collection only in v0.23; changing car ownership
  later requires a safe, versioned Garage-update workflow, not forcing a new file.
- OTG! remains untouched; TET2 stores its own data separately.
