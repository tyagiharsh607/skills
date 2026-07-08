# Instahyre (instahyre.com)

Instahyre works differently from Wellfound/Naukri: instead of a plain
browsable list with an "Apply" button on every card, it's a matching-style
platform where you view a job's full detail and then decide "Apply" or "Not
interested" — closer to a swipe-through queue than a search results page.

## Login check
Navigate to `https://www.instahyre.com/`. Take a snapshot.
- **Logged in**: it auto-redirects to `/candidate/opportunities/?matching=true`
  and the nav shows Activity / Opportunities / Inbox / Profile / Settings /
  Sign out.
- **Not logged in**: stays on the homepage showing "Login" / "Signup" and
  "Sign in with LinkedIn" / "Sign in with Google" buttons.

If not logged in, tell Harsh to log into Instahyre in the browser (LinkedIn,
Google, or email — his choice) and let you know when he's done, then
re-check before proceeding. Never attempt to log in on his behalf.

## Duplicate check
On `/candidate/opportunities/`, there's a **"Filter by status"** panel with
radio options: "Undecided (N)", "Interested (N)", "Not Interested (N)". The
**"Interested" count is the applied-jobs equivalent** — every job Harsh has
clicked "Apply" on lands here (the count visibly increments right after
applying, e.g. 83 → 84).

**Don't paginate through the full Interested list to pre-build a duplicate
list before starting.** That count only grows over time (it's well past 300
already), so fully enumerating it costs more page loads every single run —
that's a real, guaranteed, ever-increasing cost. Compare that to the actual
risk being guarded against: accidentally clicking Apply again on a job
already marked Interested. That's a low-stakes mistake (nothing breaks,
Instahyre doesn't seem to treat it as a duplicate error) — not worth paying
a large, scaling setup cost every run to fully prevent. Instead:
- Just note the current "Interested (N)" count at the start (one glance, no
  pagination) so you can report how many *new* applications this run
  produced (end count minus start count).
- Keep a lightweight list of company+role pairs you actually apply to
  *during this run* — that's free, you're already looking at each one — and
  skip re-applying if the exact same one resurfaces later in the same
  session (this can happen since the browse mode isn't guaranteed to exclude
  same-session applies immediately).
- Don't worry about cross-session duplicates beyond that. If it happens
  occasionally, the cost is negligible compared to the setup cost of
  preventing it perfectly.

## Job listing structure
There are two distinct sources of candidates — use both:

1. **Curated queue** (`/candidate/opportunities/?matching=true`): jobs
   Instahyre's own matching algorithm has selected for Harsh, filtered by the
   status radios above. Check "Undecided" first — that's the queue of
   pending decisions. This is often small or empty; don't treat an empty
   Undecided queue as "no jobs available," just move to the broader search.
2. **Broader browse** (via the **"Search other jobs"** panel, visible on the
   opportunities page under a "Search other jobs" expandable header): set
   these two filters **every time, before clicking "Show results"**:
   - **Experience (in years): `1`** — narrows the pool to roughly 1,500 jobs
     (vs. ~13,500 with the field empty). Harsh has 1.5 years of experience,
     so this slice is already the realistic match set — no need to also
     sweep the unfiltered/higher-experience pool.
   - **Job Functions: `All - Software Engineering`** — click the "Select job
     functions" textbox, which opens a categorized dropdown (Software
     Engineering, IT Operations and Support, Data Science and Analysis,
     Product / Project Management, Sales and Business, Marketing, etc., each
     with an "All - X" option plus sub-specialties). Pick **"All -
     Software Engineering"**. Without this, the browse pool includes
     completely unrelated functions (Sales, Marketing, HR, Product
     Management, ...) mixed in with engineering roles — setting this filter
     is what keeps the browse list on-topic in the first place, which
     matters more here than on Wellfound/Naukri since Instahyre's unfiltered
     pool spans every job function, not just tech roles.
   - Combined, `years=1` + `Job Functions=All - Software Engineering` cut the
     pool to ~243 jobs, confirmed to be entirely engineering/QA/dev titles
     (Backend/Frontend/Full-Stack Engineer, SDE, SDET, QA Engineer, iOS/
     Android/React Native Developer, etc.) — no Sales/Marketing/PM leakage.
   - You can still add Skills / Industries / Locations / Companies / Company
     Size on top of these two if useful, and click **"Show results"**. This
     navigates to a URL with `search=true&years=1&job_functions=%2Fapi%2Fv1%2Fjob_category%2F1`
     (the job_functions value is a URL-encoded API path Instahyre generates
     when you pick "All - Software Engineering" from the dropdown — don't try
     to type it manually, always select it from the dropdown so the right
     encoded value gets attached).

   To be clear on what this does and doesn't change: these are standing
   defaults for *how to search* on this platform, not criteria.md rules.
   Once a job is in front of you (from this filtered browse or otherwise),
   still never skip it just because its own posted requirement says more
   years than Harsh has — that's still governed by criteria.md rule 5,
   unchanged. The Job Functions filter, unlike Experience, IS effectively
   doing criteria.md rule 5's job up front (excluding non-software functions
   entirely) — that's intentional and fine, since rule 5 was always about
   role *type*, and this filter operates on the same axis, just earlier in
   the pipeline.

Each job in either view is a **card** (not a link to a separate page) showing
title, company, location, founded year/employee count, a blurb, and skill
tags, plus two buttons: **"View »"** and **"Not interested"**.

## Reading salary
Instahyre generally does **not show a specific salary figure** on cards or in
the expanded detail — there's a "Salary and Benefits" line in some detail
panels, but it's a Glassdoor-style culture rating out of 5 (e.g. "3.7"), not
an actual number. Treat effectively every Instahyre listing as "no salary
shown" and apply criteria.md rule 4 (apply regardless) unless you do spot an
actual currency figure somewhere, which would be unusual.

## Applying to a job
1. Clicking **"View »"** on a card does NOT open a new tab or navigate away —
   it expands a full detail panel inline on the same page (About Company, Job
   Description with Function/Requirements/Preferred Skills, office photos,
   Benefits, Tech Stack, and the hiring contact's name).
2. **The real apply action is at the bottom of that expanded detail**, not on
   the collapsed card — two buttons: "Not interested" and **"Apply"**. Click
   "Apply" to submit.
3. No screening-question form was observed for the job tested so far (single
   click, no follow-up modal) — but if one does appear on some listing,
   answer it from `profile.md` the same way as any other platform.
4. After clicking Apply, the detail panel appears to **auto-advance to the
   next job** in the list with fresh Apply/Not-interested buttons already
   loaded — convenient, but re-snapshot to confirm what's actually showing
   before clicking again, don't assume the advance happened.
5. Confirm success via the "Interested (N)" count on the status filter panel
   incrementing by one.

## Notes
- Job cards render a lot of DOM (company description, skill tags, office
  photos once expanded) — search/browse result pages can produce oversized
  snapshots the same way Naukri's do. Scope snapshots to the results
  container via the `target` parameter rather than snapshotting the whole
  page; see naukri.md's "Handling oversized snapshots" for the same pattern.
- Postings frequently ask for far more years of experience than Harsh has
  (e.g. "5-8 years") — per criteria.md rule 5, that is not a reason to skip;
  only the role type (software/QA vs. unrelated) matters.
