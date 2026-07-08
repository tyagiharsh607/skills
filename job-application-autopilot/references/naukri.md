# Naukri (naukri.com)

## Login check
Navigate to `https://www.naukri.com/mnjuser/homepage`. Take a snapshot.
- **Logged in**: header shows "Jobs", "Companies", "Services" nav with a
  profile avatar, and a left/top nav including "Application status" with an
  update count (e.g. "48 Updates").
- **Not logged in**: redirects to or shows a login page instead.

If not logged in, tell Harsh to log into Naukri in the browser and let you
know when he's done, then re-check before proceeding. Never attempt to log in
on his behalf or ask for credentials.

## Duplicate check
Navigate to `https://www.naukri.com/myapply/historypage`. It shows a "Total
applies" count. **Don't paginate/scroll through the whole list to pre-build a
duplicate set before starting** — that count only grows every run (it's
50+ already and will keep climbing), so fully enumerating it costs more page
loads each time you run this, forever. Weigh that against what it's actually
preventing: accidentally clicking Apply on something already applied to,
which is a low-stakes mistake, not a costly one. Instead:
- Just note the current total count at the start (no scrolling needed) so you
  can report new-applications-this-run at the end (end count minus start).
- Watch for Naukri's own per-job signal instead — a job you've already
  applied to typically shows this on its own card/detail page (e.g. the
  Apply button area reflecting an already-applied state) rather than making
  you cross-reference a separate list. Use that as the real-time check.
- Keep a lightweight list of what you personally apply to *during this run*
  and skip it if it resurfaces later in the same session.
- Don't worry about catching every possible cross-session duplicate beyond
  that — the occasional repeat costs nothing close to what full enumeration
  costs every single run.

## Job listing structure
Start at `https://www.naukri.com/mnjuser/recommendedjobs` — it has several
tabs/sections shown as a row near the top. As of writing these were "Applies",
"Handpicked for you", "Profile", "You might like", "Preferences", but **don't
hardcode that list** — read the actual tab labels off the page snapshot each
time, since Naukri can rename, add, or remove tabs. Each tab is a separate
clickable element that swaps in a different list of `article` job cards
(title, company + Ambition Box rating, experience range, salary often "Not
disclosed", location) — clicking one tab does NOT show you the other tabs'
jobs, so you have to visit each tab individually.

**Go through every tab present on the page, not just the first one that
loads.** The only one to skip is whichever tab shows Harsh's own past
applications (labeled "Applies" as of writing — it'll be the one whose count
matches his applied-jobs history) — that's not a source of new candidates.
For every other tab actually shown, click into it, work through every job
card there, then move to the next. Only after all tabs are exhausted should
you fall back to the search bar.

Once every tab is exhausted, use the search bar at the top ("Enter keyword /
designation / companies" + "Enter location") with queries like "Software
Engineer", "SDET", "QA Automation", "Full Stack Developer", "Backend
Developer", "Backend Engineer" to keep finding candidates — don't stop just
because the recommended tabs ran dry. **This
search-fallback phase is not optional** — it's usually where most of the
volume is, since the recommended tabs only surface a handful of jobs each.
Run through all of the example queries above (and others if they seem
useful) before considering the run exhausted.

**Always set the Experience filter to 1 year on the search results page**
(the same standing default used for Instahyre's Experience field — Harsh has
1.5 years, so this is the realistic match range and keeps the pool from being
dominated by senior postings he'd have to skip on experience-range grounds
before even reading them). The sidebar's Experience control is a slider
(range "0 Yrs" to "30 Yrs"), which is fiddly to drag precisely — instead, set
it via URL: append `&experience=1` (or `?experience=1` if the URL has no
other query params yet) to the search results URL and navigate there
directly. This reliably sets the filter — the slider widget will show "1" as
the selected value, confirming it took. If a keyword search you ran lands on
a URL without this param, just add it and re-navigate rather than trying to
drag the slider by hand. As with Instahyre, this only changes what shows up
in the results — it doesn't reopen the door to skipping a job that still
lists more required experience once it's in front of you; that stays
governed by criteria.md rule 5.

### Handling oversized snapshots
Search results pages tend to render more DOM (results list + full nav
megamenu + filters sidebar) than a single `browser_snapshot` call wants to
return, and you may hit an "output too large" response. **That's a call to
narrow the snapshot, not a reason to skip the phase.** Use the `target`
parameter of `browser_snapshot` to scope it to just the results container
(pass a ref or selector for the results list element instead of snapshotting
the whole page — the same way job detail pages are read without needing the
header/megamenu). If you're not sure of the right ref yet, take one full
snapshot to find the results container's ref, then target that ref for
subsequent snapshots as you page through results. Getting an oversized
response is an easy, fixable problem — don't report the phase as skipped or
"not completed" because of it; fix the call and keep going.

**Important**: clicking a job title opens it in a **new browser tab**, not
the same tab. Each new tab tends to pull the browser window into focus on
screen — across many jobs in a run, that's a visible browser popping up
repeatedly, which defeats the point of running this in the background.
**Avoid clicking the title at all.** Every job card link has an `/url` in the
snapshot (e.g. `/job-listings-software-engineer-...`) — read that URL directly
from the snapshot and use `browser_navigate` to go straight there in the
*same* tab, exactly like the Wellfound flow does. This gets you to the same
job detail page without ever opening a new tab.

Only fall back to clicking + `browser_tabs` (`action: "list"` then
`action: "select"`) if a particular card genuinely has no extractable URL in
the snapshot — and close any tab you do end up opening as soon as you're done
with it.

## Reading salary
Naukri often shows "Not Disclosed" on the listing card. On the job detail
page, check for a **"Salary insights"** widget (a collapsible section, e.g.
"Software Engineer in [Company] typically earns between ₹7.3 - ₹8 L/yr") —
use that as a proxy against `criteria.md`'s thresholds. If there's no salary
and no insights widget either, apply anyway per rule 4 in criteria.md.

## Applying to a job
1. On the job detail page, click the **"Apply"** button (top-right, next to
   "Save").
2. Most of the time this is genuinely one-click: it navigates straight to an
   "Apply Confirmation" page (URL contains `myapply/saveApply`) using the
   saved Naukri resume/profile — no screening questions at all.
3. Sometimes a **chatbot-style screening questionnaire** appears instead
   (multi-step, one question at a time). Answer each from `profile.md` —
   experience, notice period, CTC, current city, relocation, hybrid comfort,
   education (remember: degree is COMPLETED 2025, not in progress), skills,
   etc. Submit through to completion.
4. Confirm success by checking `historypage` — "Total applies" should have
   incremented and the new company/role should show "Application sent
   today".

## Notes
- The "Reviews" / "About company" / "Similar jobs" sections on the job detail
  page are just extra content — skip past them to find Apply and the salary
  info near the top.
- If a listing is from a third-party recruiter/consultancy with a vague
  title, use judgment on relevance (criteria.md rule 5) before spending time
  opening it.
