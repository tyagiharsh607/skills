---
name: job-application-autopilot
description: Automatically browse job listings on a supported platform (currently Wellfound, Naukri, and Instahyre — check the skill's references/ folder for the current live list, since more get added over time) and apply to every job matching Harsh's standing salary/role criteria, using his saved profile to answer screening questions. Use this whenever Harsh asks to apply to jobs, find and apply, "run the job applier", "apply on wellfound/naukri/instahyre", or otherwise wants bulk/automated job applications submitted on his behalf — even if he doesn't name a specific platform (ask which one). Do not use this for browsing/researching jobs without applying, or for one-off manual applications he wants to review before submitting himself.
---

# Job Application Autopilot

Harsh wants to apply to jobs across platforms with as little back-and-forth as
possible. The only thing this skill should ever ask him is **which
platform**. Everything else — his profile, his screening-question answers,
which jobs qualify, how long to run, whether to run in the foreground or
background — is already decided. Don't re-ask things covered by the
reference files below; that defeats the point of this skill.

## Step 1 — Ask which platform

**Actually list the contents of `references/` every time — don't answer from
memory of what platforms used to exist.** This skill grows by dropping in new
`references/<platform>.md` files (see "Adding a new platform" below), and
nothing in this SKILL.md file gets edited when that happens — so any specific
platform names mentioned elsewhere in this document (including in examples
below) are illustrative, not an authoritative or exhaustive list. The only
source of truth for "what platforms are currently supported" is running a
directory listing on `references/` right now and excluding `profile.md` and
`criteria.md` (shared, not platform files) — whatever `.md` files remain ARE
the current platform list, whether that's two, three, or ten. Ask Harsh which
one he wants to run right now.

## Step 2 — Load context

Read, in order:
1. `references/profile.md` — Harsh's fixed profile and default answers to any
   screening question.
2. `references/criteria.md` — the standing rules for which jobs qualify.
3. `references/<platform>.md` — the platform-specific mechanics: how to check
   login, where the already-applied list lives, how the job listings are
   structured, and exactly how the apply flow works on that site (including
   any UI quirks it's already run into, like Wellfound's hidden radio
   inputs).

## Step 3 — Confirm login

Follow the platform file's login-check steps. If Harsh isn't logged in, tell
him plainly (e.g. "You're not logged into Wellfound — please log in in the
browser and let me know") and wait. Don't proceed with the apply loop until
he confirms. Never ask for or handle credentials yourself.

### If the browser won't connect (profile/session lock)

The Playwright browser tools sometimes fail to navigate or check login with
an error about another instance already using the browser profile, or a
leftover Chrome process from a previous run holding a lock. This almost
always means a previous background agent from an earlier autopilot run (or
this same skill, re-invoked) never got a chance to close its browser —
usually because it was stopped mid-task rather than finishing cleanly. Don't
ask Harsh to go find and close things himself; handle it directly:

1. Check for other agents/tasks still running (TaskList or equivalent) that
   might be holding the browser open. Stop any leftover ones from a previous
   autopilot run (TaskStop) — it's safe to assume a lingering agent from a
   killed/orphaned prior run is not doing anything Harsh still needs.
2. If a Chrome/Chromium process is still holding the lock after that, find
   it and close it. Be precise about *which* process: only target the
   automation-controlled browser instance (identifiable by the profile
   directory or debugging port the Playwright MCP server uses — check its
   config/logs for the exact path rather than guessing), never a Chrome
   window that could be Harsh's own regular browsing session. If it's not
   clearly identifiable as the automation instance, say so and ask before
   closing anything — killing the wrong browser could lose his unrelated
   work.
3. Retry the browser action. If it still fails after clearing one conflict,
   it's fine to try once more, but don't loop on this indefinitely — after a
   couple of failed retries, tell Harsh plainly what's going on and what
   you've already tried, rather than repeating the same failing action.

## Step 4 — Run the apply loop, in the background

This is tool-call-heavy (every candidate job needs a navigate + snapshot +
click, sometimes several rounds for a screening form) and shouldn't block the
conversation or pop a visible browser window into focus. Launch it as a
background agent (fork) rather than running it turn-by-turn yourself, and
give that agent everything it needs in one self-contained prompt:

- The platform's login-check confirmation (already done — tell the agent it's
  logged in, no need to re-check).
- The full contents of `profile.md`, `criteria.md`, and the platform file (or
  just tell the agent to read them itself from this skill's `references/`
  directory — cheaper prompt, same result).
- Explicit instruction to: pull the already-applied list first, then work
  through job listings for real (navigate, snapshot, click — not just narrate
  a plan), applying to every match and skipping non-matches with a reason.
- **No batch cap.** Keep going until there are no more reasonably-findable
  candidates left — that means every section/tab of the platform's job
  listing page (not just the first one visible), AND relevant search queries,
  are exhausted, or until told to stop. Some platforms split recommendations
  across multiple tabs (e.g. Naukri's "Handpicked for you" / "You might like"
  / "Preferences" — see naukri.md); make sure the agent knows to visit each
  one rather than stopping after the first. Note in the final report if it
  stopped for exhaustion vs. some other reason.
- **"I did a decent amount of work" is not a stopping condition.** Only three
  things justify ending a run: genuinely exhausting every candidate source
  (all tabs + all sensible search queries), a real unrecoverable error worth
  surfacing, or Harsh explicitly saying to stop. Tell the agent this
  explicitly — otherwise it's prone to wrapping up early and calling it "a
  reasonable stopping point," leaving whole phases (like the search-fallback
  step on Naukri) undone without being asked to stop.
- **A tool call failing (e.g. "output too large") means fix the call, not
  skip the step.** If a snapshot is too big, that's solvable by scoping it to
  a smaller part of the page (see the platform file for specifics, e.g.
  naukri.md's "Handling oversized snapshots") — it is never a reason to
  report a phase as skipped or move on without it.
- **Never end a turn by asking "want me to keep going?" (or any variant).**
  This is an unattended background run — there is nobody watching to answer
  that question in the moment, so ending on one just stalls the whole run
  until Harsh happens to notice and nudge it, which defeats the entire point
  of backgrounding this. Tell the agent explicitly: if there's more
  reasonably-findable work left, the answer to "should I continue" is always
  yes by design — so just keep calling tools instead of phrasing it as a
  question. The only things worth surfacing in a message are (a) true
  exhaustion with a factual final report, (b) a real blocker with no
  reasonable default (state it as a fact needing a decision, not "should I
  continue?"), or (c) Harsh explicitly asking for a status check. Partial
  progress with obvious next steps remaining is never one of these — it's just
  a sign to keep going.
- Ask it to periodically re-check the applied-list count so duplicate
  detection stays accurate across a long run (new applications from earlier
  in the same run should count as duplicates for later in the run too).
- Ask for a final report: total applied (with company — role — salary),
  total skipped grouped by reason (criteria not met, duplicate, external-site
  apply, irrelevant role, unanswerable question).

Tell Harsh you've kicked it off in the background and that you'll report back
when it's done or when he asks for a status check. If Harsh says to stop, use
the task-stop mechanism for that agent — don't just let it run unacknowledged.

## Step 5 — Report back

When the background agent finishes (or Harsh asks for a progress check),
relay its report plainly: how many applied, how many skipped and why, and
whether it ran out of candidates or was capped/stopped some other way. If the
run was interrupted partway through evaluating a specific job, say so — don't
imply that job was decided one way or the other.

**If the agent's report is really just "here's partial progress, want me to
keep going?"** — that's not actually done, and the answer is always yes per
this skill's design. Don't forward that question to Harsh as if it's his
decision to make; instead immediately send that same agent (or spawn a new
one if it's already stopped) a message telling it to keep going without
asking again, and only come back to Harsh once there's a real final report
or genuine blocker. The one exception: if Harsh is actively watching and asks
"what's the status," it's fine to relay progress-so-far as an FYI — just don't
treat "should I continue" as needing his input when nothing about the answer
has ever been in question.

If Harsh wants to keep going after a stop, resume by spawning a **new**
background agent (a stopped one can't be resumed) — brief it with what's
already applied/skipped so far so it doesn't repeat work.

## Adding a new platform

To extend this skill to a new site (e.g. LinkedIn, Indeed, whatever's next),
write `references/<platform-name>.md` covering the same five things the
existing files cover:
1. **Login check** — URL to visit and what logged-in vs. logged-out looks
   like.
2. **Duplicate check** — URL of the applied-jobs history page and how entries
   are shown.
3. **Job listing structure** — where listings live, how to filter out
   external-apply jobs if the platform distinguishes them, and any tab/
   navigation quirks (e.g. Naukri opens jobs in new tabs; Wellfound doesn't).
4. **Reading salary** — where it's shown, what to do when it's hidden, any
   proxy signal the platform offers (like Naukri's Salary insights widget).
5. **Applying** — the exact click-path, what screening questions typically
   look like, and any UI quirks worth flagging in advance (custom-styled
   inputs that don't respond to normal fill/click, multi-step chatbots,
   etc.) — these are worth documenting as soon as you hit them once, so the
   next run doesn't rediscover the same problem.

No changes to `SKILL.md`, `profile.md`, or `criteria.md` are needed — the
platform question in Step 1 picks up new files automatically.
