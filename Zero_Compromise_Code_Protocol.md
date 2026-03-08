# ZERO COMPROMISE CODE PROTOCOL

## The Greenway Band — Code Quality Standard

**Version:** 1.0
**Created:** March 7, 2026
**Purpose:** Governing document for all Claude Code sessions. This file lives in project knowledge permanently. Every Claude Code prompt must reference it. If this protocol conflicts with speed, this protocol wins.

**Philosophy:** Apple does not ship things that mostly work. Neither do we. Every Claude Code session produces code that is verified, regression free, and deployable. Debugging is a failure of process, not an inevitability.

---

## SECTION 1: SESSION DISCIPLINE

### 1.1 Session Length

Two phases per session, maximum. This is already established (memory instruction) and is non-negotiable. After two phases, commit all work, end the session, and start fresh with a bridge prompt.

Why this matters: Claude Code's context window degrades with every phase. By phase 3, it starts "forgetting" code it wrote in phase 1. The merge field disaster in Week 2 and the context compaction in Week 4 both happened deep in sessions.

### 1.2 The Read Before Write Rule

Every Claude Code phase prompt must begin with this instruction:

```
Before writing any code, read every file you will modify. List the files you read and summarize what each one currently does. Do not proceed until this audit is complete.
```

Why this matters: Claude Code sometimes rewrites working functions because it assumes what a file contains instead of reading it. This single instruction eliminates the most common source of regressions.

### 1.3 The Build Gate

Every phase ends with `npm run build`. If there are errors, they get fixed before the phase is marked complete. No exceptions. The prompt language is:

```
Run npm run build. If there are any errors, fix them before confirming this phase is complete. Do not move to the next phase with build errors.
```

This is not just a final check. It happens after every single phase.

### 1.4 The Existing Code Fence

Every prompt must include an explicit "do not touch" list. This tells Claude Code which files and functions are already working and must not be modified unless the spec explicitly requires changes to them.

Format:

```
DO NOT MODIFY these files unless this prompt explicitly says to:
- src/components/Pipeline.jsx
- src/components/Dashboard.jsx
- src/hooks/useData.js
- [list all files that should not change]
```

Why this matters: Claude Code has a tendency to "improve" code it encounters while building something new. This fence prevents drive-by refactors that introduce regressions in working features.

### 1.5 Context Compaction Recovery

If context compaction occurs mid-session:

1. Stop immediately
2. Commit all current work with message: `WIP: [phase name] interrupted by context compaction`
3. End the session
4. Start a new session with this recovery prompt:

```
Read [spec file] and [build manifest]. Then review all files in src/. 
Summarize: (a) what exists and is working, (b) what was partially built, 
(c) what still needs to be built according to the spec. 
Do not rebuild anything that already works. 
Do not modify any file unless it is listed in your "still needs to be built" summary.
```

Never try to continue after compaction. The context is gone. Starting fresh takes 5 minutes. Debugging compaction-induced regressions takes hours.

---

## SECTION 2: PROMPT ARCHITECTURE

### 2.1 The Prompt Template

Every Claude Code phase prompt follows this exact structure. No freestyling.

```
## PHASE [X]: [NAME]

### CONTEXT
Read the following files before writing any code:
- [list every file this phase will read or modify]

Summarize what each file currently does. Do not proceed until this audit is complete.

### DO NOT MODIFY
These files are working and must not change unless this prompt explicitly says otherwise:
- [list all files outside this phase's scope]

### BUILD
[Exact specifications for what to build. Every field name, every behavior, every edge case.]

### ACCEPTANCE CRITERIA
When this phase is complete, ALL of the following must be true:
- [ ] [Criterion 1 — specific, testable]
- [ ] [Criterion 2 — specific, testable]
- [ ] [etc.]

### VERIFY
Run npm run build. Zero errors required.
Check that all [X] sidebar pages still render without console errors.
[Any phase-specific verification steps.]

Confirm completion by listing each acceptance criterion and its PASS/FAIL status.
```

### 2.2 Specificity Standard

The spec must be explicit enough that Claude Code cannot misinterpret it. The test: if you gave this prompt to a different AI model with no prior context, would it produce the same output? If not, the prompt needs more detail.

Bad: "Add a button that opens the email drafter."
Good: "Add a mail icon button (lucide-react Mail, 16px, color #6B7280) to the right side of each lead row in Pipeline.jsx. onClick opens the EmailDrafterModal component as a centered modal (max-width 640px, padding 24px). Pass the full lead object as a prop called `lead`."

Every prompt must specify:
- Exact component names and file paths
- Exact prop names and types
- Exact CSS values (colors, spacing, sizing)
- Exact behavior on click, on hover, on error, on empty state
- Exact data field names matching the Supabase schema

### 2.3 The "What Could Go Wrong" Block

For any phase involving API calls, data mutations, or multi-component wiring, include an explicit error handling section:

```
### ERROR HANDLING
- If the Claude API key is missing: [exact behavior]
- If the Supabase query fails: [exact behavior]
- If the lead data is incomplete (missing fields): [exact behavior]
- If the network request times out: [exact behavior]
```

This is not optional for AI-powered features. Every Claude API call, every Supabase mutation, every Twilio message needs explicit failure behavior defined in the prompt.

---

## SECTION 3: REGRESSION PREVENTION

### 3.1 The Sidebar Smoke Test

After every phase (not just at the end of a build week), verify all sidebar pages render. The prompt includes:

```
Navigate to each sidebar page (Dashboard, Pipeline, Band Ops, Content, Clients, Financials, Settings) and confirm each renders without console errors.
```

This catches the most common regression: a shared import or utility change that breaks an unrelated page.

### 3.2 The Git Commit Protocol

Every phase gets its own commit. Not one commit per session. Not one commit per build week. One commit per phase.

```
After completing this phase and verifying the build, commit with the message:
"Week [X] Phase [Y]: [short description]"
```

Why this matters: If phase 3 breaks something, you can roll back to the end of phase 2 without losing phases 1 and 2. With one giant commit, you lose everything.

### 3.3 The Regression Checklist

For builds that modify shared utilities (useData.js, formatters.js, supabaseClient.js, or any hook), the prompt must include:

```
### REGRESSION CHECK
After building, verify these existing features still work:
- Pipeline: leads load, stages display, drag-and-drop functions
- Dashboard: stats calculate, calendar renders, Claude Clues loads
- Email Drafter: modal opens, templates populate, merge fields resolve
- [add any feature that touches the modified utility]
```

This is in addition to the sidebar smoke test. It is specifically for phases that touch shared code.

### 3.4 No Silent Refactors

The prompt must include:

```
Do not refactor, rename, or reorganize any code outside the scope of this phase. If you see code that could be improved but is not part of this phase's spec, leave it alone. Note it in your completion summary if you want, but do not change it.
```

---

## SECTION 4: AI FEATURE SAFETY

The Command Center and client-facing website both use Claude API integrations. These require extra care because they involve network calls, token costs, and user-visible AI output.

### 4.1 API Call Isolation

Every Claude API call must go through a single shared helper function (already established: `callClaudeAPI` in the Command Center). Never call the API directly from a component. This gives us one place to add rate limiting, error handling, logging, and key validation.

### 4.2 Graceful Degradation Standard

Every AI-powered feature must have a complete, usable experience when the API key is missing or the API call fails. The prompt must specify the exact fallback UI:

```
### NO API KEY STATE
[Exact UI description — what the user sees, what message displays, what actions are available]

### API ERROR STATE
[Exact UI description — what happens on timeout, on 500, on rate limit]
```

No AI feature ships without both states fully designed.

### 4.3 Prompt Versioning

Every Claude API system prompt used in the Command Center must be stored as a named constant, not inline in a component. This makes prompts auditable and versionable.

```javascript
// Good: named, findable, versionable
export const EMAIL_DRAFTER_PROMPT_V1 = `You are...`;

// Bad: buried inline, invisible to audits
const response = await callClaudeAPI({ system: "You are..." });
```

---

## SECTION 5: CLIENT-FACING WEBSITE STANDARD

The client-facing website (greenwayband.com) requires an even higher standard than the Command Center because clients see it. The Apple Store analogy applies here.

### 5.1 Performance Budget

Every page must load in under 2 seconds on a standard connection. No layout shift after initial render. No flash of unstyled content. Images lazy load below the fold.

### 5.2 Mobile First

Every component is designed for mobile first, then scaled up. The wedding industry is heavily mobile (couples browse on phones). If it does not look perfect on iPhone 14 viewport width, it does not ship.

### 5.3 Browser Testing Scope

Before any client-facing page deploys, verify in:
- Chrome (desktop)
- Safari (mobile — this is the iPhone browser)
- Chrome (mobile)

Safari mobile rendering differences are the most common source of "it works on my computer" bugs.

### 5.4 Animation and Interaction Standard

Transitions are 200ms ease-out unless the spec says otherwise. Hover states on every interactive element. Focus states for accessibility. No janky scroll behavior. Every interaction must feel intentional and polished.

---

## SECTION 6: THE WEEKLY BUILD CADENCE

### 6.1 Monday: Spec and Verification Receipt (Claude Chat)

Write the spec. Cross-reference the manifest. Produce the Verification Receipt. Deliver Claude Code prompts. Nothing gets built until the receipt is clean.

### 6.2 Build Sessions (Claude Code)

Two phases per session. Commit after each phase. Fresh session for phases 3 and 4. Final session for phase 5 (if needed) plus full QA.

### 6.3 QA and Deploy (Claude Chat + Manual)

Run through the post-build QA checklist. Update the Build Manifest. Deploy to Netlify. Verify in production.

### 6.4 Session Limit Budget

A typical build week should take 3 to 4 Claude Code sessions:
- Session 1: Phases 1 and 2
- Session 2: Phases 3 and 4
- Session 3: Phase 5 + QA
- Session 4: Bug fixes only (if needed)

If a build week is taking more than 5 sessions, something is wrong with the spec. Stop and return to Claude Chat to diagnose.

---

## SECTION 7: THE PROMPT HANDOFF CHECKLIST

Before any Claude Code prompt ships (in addition to the Verification Receipt from instruction #38):

1. Every data field in the prompt matches the Supabase column name exactly (no aliases, no abbreviations)
2. Every component name in the prompt matches the actual filename in src/
3. Every import path in the prompt is verified against the current file structure
4. The "Do Not Modify" list is complete and includes every file outside this phase's scope
5. The acceptance criteria are specific enough to be tested with a yes/no answer
6. Error states are explicitly designed (not "handle errors gracefully")
7. The build gate instruction is present at the end

---

## SECTION 8: WHEN THINGS GO WRONG

### 8.1 One Bug: Fix It

If a single, isolated bug appears, fix it in the current session. Commit with message: `Fix: [description]`

### 8.2 Three or More Bugs: Stop

If three or more bugs appear in a single phase, stop the session. Do not try to fix them all. Commit the current state as WIP, end the session, and return to Claude Chat to assess whether the spec had gaps.

### 8.3 Regression in Working Feature: Rollback

If a new phase breaks a previously working feature, git rollback to the last clean commit for that feature. Do not try to "fix forward" through a regression. Identify what caused the regression, update the prompt to prevent it, and rebuild the phase cleanly.

### 8.4 The Five Session Rule

If any single build week takes more than 5 Claude Code sessions, escalate to Claude Chat for a full diagnostic. The spec is likely missing critical detail, or the architecture needs restructuring before more code is written.

---

## HOW TO REFERENCE THIS DOCUMENT

Every Claude Code prompt file (e.g., CC_v3_Week6_Claude_Code_Prompts.md) must begin with:

```
## GOVERNING PROTOCOL
This build follows the Zero Compromise Code Protocol (Zero_Compromise_Code_Protocol.md). 
Every phase prompt below includes: Read Before Write, Do Not Modify fence, Build Gate, 
and phase-level git commits. Refer to the protocol for error handling and regression standards.
```

This is a living document. It gets updated when we learn something new. Version bumps happen in Claude Chat, same as the Build Manifest.

---

**END OF PROTOCOL**
