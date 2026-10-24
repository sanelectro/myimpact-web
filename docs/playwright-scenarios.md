# Playwright E2E Scenarios

This document describes user journeys for browser-level end-to-end coverage. A
scenario should verify what a user can see and do across the application, not
only that an API request returned an expected status. API response assertions
are useful supporting checks, but they are not a substitute for verifying the
result in the UI.

## Coverage status

- **Implemented** means a current Playwright spec covers the journey.
- **Planned** means this is a target for future implementation; it is not
  covered by the current suite yet.

Current specs:

- `e2e/m61-auth-and-api-integration.spec.ts` covers sign-in errors, protected
  API authorization, session restoration/expiry, and sign-out (including a
  server-side revocation failure) with auth/API fixtures.
- `e2e/m62-dashboard.spec.ts` covers empty, partial-progress, capped aggregate,
  and API-error dashboard states with deterministic API fixtures.
- `e2e/m63-goals.spec.ts` uses deterministic API fixtures for goal and dashboard
  journeys.
- `e2e/m64-goal-document-ingestion.spec.ts` runs against the local real stack
  and exercises account registration and Workday document ingestion.
- `e2e/m65-evidence-associations.spec.ts` covers goal- and milestone-level
  evidence association.
- `e2e/m69-platform-admin.spec.ts` covers platform overview, cross-company
  employee review, invitations, account status changes, company updates, and
  the customer-user admin-route redirect using deterministic fixtures.

## Authentication and session

### Create an account, sign in, and sign out — Partially implemented

The M6.1 browser spec covers sign-in success/failure, authenticated navigation,
protected-route redirects, API authorization, session restoration, and
sign-out. Account registration and real credential persistence are covered by
the M6.4 real-stack spec.

**Browser checks: form mode and validation, visible error messages for
invalid/duplicate credentials, authenticated landing page, protected-route
redirect, and successful logout. Use a unique account and clean it up after
real-stack runs.

### Restore and expire a session — Planned

1. Sign in, reload the page, and verify the session is restored without
   returning to sign-in.
2. Simulate an expired/invalid refresh session and verify protected content is
   not shown and the user is prompted to sign in.
3. Verify logout clears the visible session even when server-side revocation
   reports an error.

## Goals

### Add a goal manually and manage its lifecycle — Implemented

1. Sign in and open the new-goal form.
2. Enter a title, description, dates, and scope, then create the goal.
3. Verify the goal appears in its detail view and in the goals list with the
   entered data and Draft status.
4. Edit the goal and verify the saved values appear.
5. Approve and activate it, then mark it completed and archive it with a
   reason.
6. Verify each state change in the UI and the archived goal's history.

Covered in `e2e/m63-goals.spec.ts`.

### Add a goal from a sample PDF — Planned with a real PDF fixture

1. Sign in and open goal import.
2. Upload a small, checked-in sample PDF containing goal-like content.
3. Verify imported goals are presented for review as drafts, with the expected
   title, scope, and source information.
4. Edit an imported goal and verify the updated detail view.
5. Verify duplicate goals are identified and skipped, and an input with no
   identifiable goals shows an empty-result message.
6. Upload an invalid/unprocessable file and verify a useful error is displayed.

The current UI spec partially covers this journey: it uploads synthetic PDF
bytes and supplies the import result through API fixtures. It does not yet use a
sample PDF file or verify real PDF extraction.

### Import a goal from a real sample document — Implemented for DOCX; PDF planned

1. Create a unique account and sign in.
2. Upload the checked-in Workday sample document.
3. Verify the document is processed and extracted goals appear as drafts.
4. Review and edit an imported goal, approve it, and activate it.
5. Repeat the import and verify the existing goal is not duplicated.
6. Clean up the test account.

The real-stack flow currently uses a generated DOCX fixture in
`e2e/m64-goal-document-ingestion.spec.ts`. Add a checked-in or generated PDF
fixture to cover real PDF extraction when the PDF ingestion path is ready.

### Browse, filter, and archive goals — Planned

1. Sign in with active, completed, and archived goals.
2. Browse the goals list and verify each goal's scope and status.
3. Open an archived goal from the archive view and verify its deactivation
   reason and history.
4. Verify archived goals do not appear among active goals.

## Dashboard, evidence, and impact

### Review goal progress and supporting evidence — Implemented

1. Sign in with a goal that has an assessment, evidence, and impact.
2. Verify dashboard progress and summary.
3. Open the goals list and verify the goal's progress status matches the
   dashboard.
4. Open goal details and verify the assessment, evidence, and linked impact
   are visible.

Covered in `e2e/m63-goals.spec.ts`.

The dashboard empty, partial-progress, aggregate-capping, and API-error states
are covered in `e2e/m62-dashboard.spec.ts`.

### Review milestones and update progress — Planned

1. Open a goal with milestones and verify milestone names, dates, and statuses.
2. Complete or update a milestone using the UI.
3. Verify the changed status and resulting goal progress are reflected in the
   goal detail and dashboard.
4. Verify empty and error states when milestones cannot be loaded.

### Explore career insights and reports — Planned

1. Open career journey and verify the current and adjacent career stages.
2. Open an available insight/report and verify it is associated with the
   signed-in user's goals and evidence.
3. Verify clear empty, loading, and recoverable error states when no insight
   or report is available.

## Platform administration

### Review customer accounts, invite users, and manage access — Implemented

1. Review account totals and company health on the platform overview.
2. Invite a customer user and verify the generated invitation link and pending
   account state.
3. Review a customer's goal, evidence, and impact across companies.
4. Disable and reactivate a customer account; resend a pending invitation.
5. Review customer company names and account counts in the directory.
6. Verify a customer user is redirected away from platform-admin screens.

Covered in `e2e/m69-platform-admin.spec.ts` using deterministic API fixtures.
These UI tests do not replace backend authorization tests for admin APIs or
cross-organization data access.

## Future user-facing scenarios

These journeys should be added as their corresponding product features become
available:

- **Knowledge and evidence:** add or import evidence, associate it with a goal,
  and verify it appears in the goal's evidence and impact views.
- **AI assistant:** ask a question grounded in the signed-in user's goals and
  evidence, then verify the response and any cited source links.
- **Cross-user isolation:** create two users with distinct goals, switch
  sessions, and verify neither user can see the other's data.
- **Responsive navigation and accessibility:** complete key sign-in, goal
  creation, and import journeys at mobile and desktop widths using accessible
  labels and keyboard navigation.

## Test implementation guidance

Run an individual milestone suite with:

```bash
npm run test:e2e:m61
npm run test:e2e:m62
npm run test:e2e:m63
npm run test:e2e:m64
npm run test:e2e:m65
npm run test:e2e:m69
```

Run the complete M6.1–M6.5 browser suite, including the M6.4 real-stack
ingestion journey, with:

```bash
npm run test:e2e:m61-m65
```

This uses ports 5175, 8003, and 8002 for the web, auth API, and AI API so it
does not reuse or disrupt the regular development services. The real-stack
M6.4 scenario requires a migrated database and configured document extraction
provider. Set `DATABASE_URL` and the local auth/JWKS environment values before
running it against a disposable database.

M6.4 starts the local API and AI services and needs the configured document
extraction provider. M6.9 covers platform-admin workflows; no M6.6–M6.8
Playwright suite is included in this milestone scope.

- Prefer accessible locators such as roles and labels; assert visible outcomes
  and navigation as a user would experience them.
- Use deterministic fixtures for focused UI behavior and real-stack tests for
  integration journeys that need database, authentication, or document
  processing.
- Keep assertions on API status/payload only where they clarify the journey;
  also assert the resulting user-visible state.
- Keep tests isolated: create unique records, avoid relying on execution order,
  and clean up data created in real-stack tests.
- Cover success, validation, empty, duplicate, and recoverable failure states
  where they are relevant to the journey.
