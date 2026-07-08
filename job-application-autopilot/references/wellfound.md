# Wellfound (wellfound.com)

## Login check
Navigate to `https://wellfound.com/jobs`. Take a snapshot.
- **Logged in**: the header shows "Ready to interview" / an avatar button
  with the user's name, and a left nav with Home / Profile / Jobs / Applied /
  Messages.
- **Not logged in**: header shows "Log In" / "Sign Up" buttons instead.

If not logged in, tell Harsh to log into Wellfound in the browser and let you
know when he's done, then re-check before proceeding. Never attempt to log in
on his behalf or ask for credentials.

## Duplicate check
Navigate to `https://wellfound.com/jobs/applications`. Snapshot it and record
every company + role pair shown (status will say "Pending", "Not Accepted",
etc. — all of these count as already-applied). Skip any listing matching one
of these.

## Broaden location & region filters
Near the top of `/jobs`, there are two filter controls that narrow results
more than Harsh wants: a **location button** (defaults to his profile city,
e.g. "Noida") and a **region combobox** (defaults to e.g. "Asia"). Left as-is,
these silently exclude jobs elsewhere in India and remote roles based outside
India — both of which are fine per `criteria.md` (remote-from-anywhere and
USD-salary jobs should still be considered).

Before searching, open each control and broaden it:
- Location: change it from a single city to all of India (look for an
  "India"-wide option, or remove the specific-city restriction if that's how
  it's presented — the exact UI may vary, so explore the control's options
  rather than assuming one exact click path).
- Region: change it from "Asia" to the broadest available option (something
  like "Worldwide" or "Remote") so remote listings based outside India aren't
  filtered out before you even see them.

Do this once at the start of a run, then proceed. If a "Hiding jobs that do
not accept applications from your location" banner still appears after
broadening, that's fine — it's still narrower than filtering by city, and
Wellfound job pages typically state their own remote-hiring-eligible
countries anyway, which you'll see per-listing.

## Restrict to native-apply listings
On `https://wellfound.com/jobs`, there's a checkbox: **"Hide jobs which
require me to apply on the company's website."** Enable it — this filters out
external-apply listings so you don't have to check each one individually.
Listings that remain will show an "Apply on Wellfound" banner.

## Job listing structure
The `/jobs` page is a scrollable list of `article` elements, each with a
company name, blurb, employee count, and one or more role links (title,
location, salary range if shown). Click a role's link to open its detail page
in the same tab (Wellfound job pages don't open a new tab).

**Don't assume one snapshot shows every listing.** The page header shows a
count like "45 results" — a single snapshot typically only captures what's
rendered above the fold, which is fewer than that. Scroll down (or use
whatever pagination/infinite-scroll mechanism is present — check for a "load
more" trigger or just repeated scroll-and-snapshot) and keep going until
you've actually seen and evaluated a number of listings matching the stated
result count, not just whatever loaded initially. If the count is large,
loop scroll → snapshot → evaluate-new-cards until no new cards appear even
after scrolling (that's the real end of the list, regardless of what the
count says).

## Applying to a job
1. On the job detail page, click **"Apply now"** — this opens a modal dialog
   titled "Apply to [Company]".
2. The modal always shows the job's summary (location, hires-remotely-in, job
   type, visa sponsorship, relocation) plus a "Your Application" section with
   custom screening questions specific to that listing. Common ones: total
   work experience, product-based company experience, notice period, current
   CTC, expected CTC, relocation Yes/No, hybrid/onsite comfort Yes/No, current
   city, and a free-text "what interests you about this opportunity" note.
   Answer all of these from `profile.md` / `criteria.md` — none of them need
   asking Harsh.
3. Fill number/text fields with `browser_fill_form` (type: "textbox") — these
   work reliably.
4. **Radio buttons need special care.** The Yes/No radios are custom-styled;
   the underlying `<input type="radio">` is visually hidden, so
   `browser_fill_form` with `type: "radio"` will error ("Not a checkbox or
   radio button"), and clicking the wrapping `<div>` via a text filter can
   silently fail to actually check it. The reliable approach: click the
   *label's own ref* (the `generic [cursor=pointer]: "Yes"` text node next to
   the radio, not its parent div) directly by its snapshot ref. After
   clicking both radios, **re-snapshot before submitting** and confirm each
   shows `radio "Yes" [checked]` — don't trust the click result alone, Yes/No
   radios have silently failed to register in the past.
5. Once every required field shows a value and both radios show `[checked]`,
   click **"Send application"**.
6. Confirm success by checking `/jobs/applications` — the new application
   should appear at the top with status "Pending" and a "less than a minute
   ago" timestamp.

## Notes
- Some listings show salary as a monthly stipend (internships) vs. annual LPA
  (full-time) — read the units carefully before applying `criteria.md`.
- If a listing shows no custom screening questions at all, the modal may just
  have "Send application" with no fields — submit directly.
