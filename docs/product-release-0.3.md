# Mise KitchenSync 0.3

This release turns the owner’s costing workspace into a more useful daily operating tool. It adds reviewed menu sales, dated staff plans, service routines and guidance. The hosted app remains a private pilot.

## Product decisions

The primary user is an owner or kitchen manager at an independent restaurant. A new user should be able to start with one supplier and one dish, understand every number shown and find the next action without training.

- Keep the existing forest and cream design. Use one set of form controls, table patterns, empty states and save messages.
- Show missing values as missing. A missing price, count or hourly rate does not mean zero.
- Make previews and assumptions visible. Imports need review; price tests do not change the menu.
- Preserve the original records. Current recipe costs are labelled as estimates when applied to historical sales.
- Explain terms beside the work. A short contextual guide should answer the question without leaving the screen.
- Make staff planning distinct from account access and payroll processing.

## Release backlog and acceptance criteria

| Story | Acceptance criteria | Verification |
| --- | --- | --- |
| As an owner, I need a useful setup sequence. | Progress comes from saved inputs; unfinished steps link to the relevant screen. | Readiness calculations and interface tests |
| As a manager, I need to review menu performance. | CSV validation; preview before save; explicit recipe matching; duplicate snapshot protection; weighted costs; incomplete totals stay unknown. | Menu analysis, API and interface tests |
| As a chef, I need to test a menu price. | Show estimated contribution change at unchanged volume; do not edit saved prices. | Menu interface and calculation checks |
| As a manager, I need an affordable weekly plan. | Sunday–Saturday grid; rates stored on shifts; unpaid breaks; overnight handling; overlap rejection; availability and hours review notices. | Operations and interface tests |
| As a manager, I need reviewed hours for payroll. | Actual hours required for approval; approved entries reopened before editing; export only approved entries for the selected week. | Operations and interface tests |
| As a chef, I need repeatable service checks. | Editable opening and closing routines; separate service dates; completion metadata; archive without deleting history. | Operations and interface tests |
| As a new user, I need help where I work. | Contextual guides; searchable guide contents; keyboard page search; plain definitions. | Guide and interface tests |
| As an owner, I need my records kept separate. | Authenticated owner scope; rejected cross-origin writes; revision conflicts; new records survive backup and reload; demo never calls private APIs. | Real SQLite API tests and demo tests |

## Iteration and release process

1. Keep each story small enough to review independently. Write the acceptance criteria before considering the story finished.
2. Implement the domain rules before connecting forms. Preserve older backup compatibility.
3. Test the successful workflow and the failures that could change money, hours or records.
4. Run typecheck, unit and interaction tests, lint and the production build.
5. Publish privately, then review the live result and record verification limits.
6. Pilot the workflows in service. Track where users hesitate and use those findings to select the next iteration.

A release passes this engineering gate when its required checks pass, source is in GitHub, the private deployment succeeds and unfinished capabilities are disclosed. Commercial activation has additional requirements below.

## Pilot evaluation

Use Fabergé’s private workspace and two additional consenting kitchens. Keep their business data out of public source and fixtures.

Measure time to complete the first recipe, time spent preparing the weekly schedule, import corrections, unresolved missing inputs, repeat weekly use and requests for help. Compare the same tasks before and after the pilot. Treat savings as measured results, not product promises.

## Commercial activation

These are launch requirements, not enabled features:

- Arrange customer access to the private hosted workspace before selling a subscription.
- Select the merchant account and price, configure billing secrets and webhook delivery, then test checkout, renewal, failed payment, cancellation and account recovery.
- Confirm support ownership, customer terms, privacy handling, refund policy and applicable tax setup.
- Run signed-in desktop and mobile browser testing. The managed environment has no supported browser-control capability in this session; automated interaction tests do not replace that check.
- Validate capacity and recovery with representative customer records. The current owner-scoped workspace uses bounded JSON snapshots and a 2 MB save limit. It is designed for a pilot, not a claim of enterprise-scale operation.

## Next backlog

Prioritise with pilot evidence. Shared team permissions, tenant administration, direct POS connections, invoice extraction and multi-location reporting require separate acceptance criteria and configuration. Payroll exports remain distinct from a payroll engine. Restaurant-specific rules must be verified for the jurisdiction being supported.
