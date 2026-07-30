# Indeed (in.indeed.com)

## Login check
Navigate to `https://profile.indeed.com/`. Take a snapshot.
- **Logged in**: page title "My Indeed Profile", shows "HARSH TYAGI" heading
  with contact info, CVs section, etc.
- **Not logged in**: redirects to `https://secure.indeed.com/auth?continue=...`
  ("Sign In | Indeed Accounts" page title).

If not logged in, tell Harsh to log into Indeed in the browser and let you
know when he's done, then re-check before proceeding. Never attempt to log in
on his behalf or ask for credentials.

## Profile note
Harsh's Indeed profile (`profile.indeed.com/resume` — the "Indeed CV" builder)
can drift out of sync with `profile.md` since it's a separate form-based
resume from his uploaded PDF. Worth a periodic glance to check work
experience/education/skills sections aren't stale (e.g. education showing
"Present" instead of a real end date makes him look still-enrolled). Not
something to re-check on every run, just worth knowing it can silently rot.
Separately, his uploaded PDF resume (`Resume_with_experience (1).pdf`) is
generally more current/detailed and is what the apply flow defaults to using
— that one doesn't need the same upkeep.

## Duplicate check
Navigate to `https://myjobs.indeed.com/applied`. Shows an "Applied" tab
(the tab list also has "Saved", "Interviews", "Archived") with a count next
to it, grouped by recency (e.g. "Last 14 days") — each entry shows role,
company, location, and "Applied X days/today on Indeed". Note the starting
count/list before a run and check against it before applying to a given
company + role pair.

## Job listing structure
Search via URL directly: `https://in.indeed.com/jobs?q=<KEYWORD>&l=<LOCATION>`
(e.g. `q=SDET&l=Noida`). Results load as a list on the left with a detail
pane on the right that updates as you click each result — clicking a job
title does NOT navigate to a new page/tab, it just swaps the right-hand
detail pane in place, so no tab-juggling needed here (unlike Naukri).

Each result card shows title, company, location (often tagged "Hybrid work
in ..." or "Remote in ..."), and a badge reading **"Easily apply"** when
Indeed's own native apply flow is available for that listing. **Cards
without "Easily apply" typically redirect to the company's own site or a
third-party ATS when you click through to apply — treat those as
external-apply and skip per criteria.md rule 6.** Confirm by opening the
detail pane: native listings show an **"Apply with Indeed"** button; external
ones show something like "Apply on company site" instead.

**Running only a `q=SDET` search and stopping there is not sufficient — this
is not optional.** Indeed has no "recommended jobs" tabs like Naukri/Wellfound
do, so the keyword search *is* the entire candidate-discovery mechanism here.
Skipping backend/dev-role queries means skipping those roles outright, not
just missing a few extra listings.

The `q` param supports Boolean `OR` with quoted phrases, confirmed working:
`q=SDET OR "QA Automation Engineer" OR "Backend Engineer"` (URL-encode spaces
as `+`, quotes as `%22`). Use this single combined query rather than
separate per-role searches — it naturally weights results toward SDET/QA
(they dominate the result set, matching Harsh's actual priority) while still
surfacing backend roles rather than excluding them. Skip the more generic
terms like plain "Software Engineer" or "Full Stack Developer" in the query
itself — they're too broad and just flood the results with unrelated
frontend/other listings without adding meaningfully more real backend
matches (confirmed by testing: a 7-term query pulled in far more noise for
barely more relevant coverage than this 3-term one). Run this query across
relevant locations (Noida at minimum; consider nearby NCR cities/Remote too).

## Reading salary
Shown directly on the card/detail pane when available (e.g. "₹12,00,000 -
₹20,00,000 a year" or "₹10,000 - ₹15,000 a month"). Many cards have no salary
at all — apply anyway per criteria.md rule 4 (no salary shown at all).

## Applying to a job (native "Easily apply" flow)
1. In the detail pane, click **"Apply with Indeed"**. This opens a **new
   browser tab** running Indeed's "SmartApply" wizard
   (`smartapply.indeed.com/beta/indeedapply/form/...`) — switch to it with
   `browser_tabs` (`action: "list"` then `action: "select"`), and close it
   when done so tabs don't pile up across a long run.
2. It's a multi-step form with a progress bar at the top (33% → 44% → 56% →
   ... → 100%). Steps seen so far, in order:
   a. **Location** — country/postal code/city are pre-filled from the
      profile; postal code is optional (Continue works with it blank).
   b. **Resume selection** — a radio choice between "Use your Indeed Resume"
      (the CV builder one) and any uploaded PDF (e.g.
      "Resume_with_experience (1).pdf"). The uploaded PDF is usually already
      selected by default and is generally the more complete/current one —
      leave it selected rather than switching.
   c. **Screener questions** — one or more pages of employer-defined
      questions, generally plain **free-text boxes** (not multiple
      choice/radio in what's been seen so far), things like LinkedIn URL,
      current company, current location, notice period, total years of
      experience, companies + tenure, education percentage/CGPA/branch/
      graduation year, and role-specific questions (e.g. "are you okay with
      hybrid in [city]?"). Answer every `*`-required field from `profile.md`
      — all of Harsh's standard screening answers map directly onto these.
      For a "percentage in 10th & 12th" style question when only one value is
      on file (profile.md only has Intermediate/12th %), answer with what's
      known labeled clearly (e.g. "12th: 96.4%") rather than fabricating a
      10th percentage.
   d. **Review** — a full read-only summary of contact info, resume (with
      inline PDF text preview), and every screener answer, plus an optional
      "Get email updates for [role] jobs in [location]" toggle (leave as
      found, don't opt in/out on Harsh's behalf) and the actual **"Submit
      your application"** button. This step says "You will not be able to
      edit your application after you submit" — worth double-checking the
      answers on this page before submitting, but no need to slow down for
      it beyond a normal read.
3. After submitting, the tab lands on a "Your application has been
   submitted" confirmation page. Close that tab and return to the search
   tab to continue.
4. Confirm success by checking `myjobs.indeed.com/applied` — the new
   company/role should appear at the top of the list.

## Notes
- Unlike Naukri/Wellfound, clicking a job card here does not open a new tab
  — only the "Apply with Indeed" button does. Keep track of the search
  results tab's index so you can switch back to it after each application.
- The exact set/order of screener questions is fully employer-defined and
  varies per listing — don't assume the same fields appear every time.
