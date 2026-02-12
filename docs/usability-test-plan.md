# Usability Test Plan — Mise KitchenSync

Purpose: validate the core user journeys (guest ordering, kitchen ticket handling, manager inventory/margin checks) for clarity, speed, and error recovery.

## Test objectives
- Verify guests can discover, add items, and place an order in <= 2 minutes with 0 critical errors.
- Verify kitchen staff can receive, view, and acknowledge tickets within 10s of order creation.
- Verify managers can open a recipe and read cost/margin information within 30s and understand stock status.
- Identify UX friction points, ambiguous labels, and missing affordances.

## Participants
- 5–8 participants per role (Guest, Cook/Kitchen staff, Manager)
- Recruit from target persona: QSR staff, small restaurant managers, and untrained guest testers for first-time flows.

## Test environment
- Device matrix: Desktop Chrome, iOS Safari (mobile web), Android Chrome, medium-resolution KDS display (tablet).
- Use a controlled dev instance with seeded sample data. Ensure `AUTO_PROVISION` is disabled for production-safe testing.

## Scenarios & Tasks
1. Guest: "Place an order"
   - Task: From landing, sign in as guest or use quick guest flow, find `Margherita Pizza`, add 1 to cart, checkout and submit order.
   - Success criteria: order confirmed page shown; no errors; total time < 2 min.
   - Metrics: time on task, error counts, clicks to complete.

2. Guest: "Unavailable item"
   - Task: Attempt to order an out-of-stock item. Observe messaging and alternatives.
   - Success: clear why item unavailable and suggested alternatives shown.

3. Kitchen: "Receive and acknowledge ticket"
   - Task: With kitchen UI open, observe incoming order, mark as in-progress, complete it.
   - Success: new ticket appears within 10s of order; chef can change status and see items.

4. Manager: "Check recipe cost and availability"
   - Task: Open recipe detail, review calculated cost, margin, and stock warning.
   - Success: cost numbers clear and conversion unit shown; stock flag appears when low.

5. Edge case: "Network loss during order"
   - Task: Simulate network drop on guest device while submitting; validate retry path and user messaging.
   - Success: user sees meaningful error, can retry, and the system prevents duplicate orders.

## Test script (moderated)
- Intro (2 min): explain goals; ask participant to think aloud.
- Tasks (20–30 min): walk through tasks above. Record screen and timings.
- Post-task SUS (System Usability Scale) or short questionnaire (5–7 items).
- Debrief (5–10 min): ask open questions about confusing elements, suggestions.

## Metrics to capture
- Time on task
- Task success rate (binary)
- Error rate and type (critical, major, minor)
- SUS score
- Qualitative observations and quotes

## Success criteria (pass/fail)
- Critical flow (guest place order) success rate >= 90% with median time <= 2 minutes.
- Kitchen tickets appear within <= 10s for 95% of orders in the test environment.
- Manager finds cost/margin info within 30s for 90% of cases.

## Recruitment & incentives
- Recruit hospitality staff from local restaurants for realistic feedback.
- Offer $50–$100 per participant depending on depth and time.

## Tools & recording
- Use Zoom/Google Meet for remote moderated tests and record sessions.
- Use HotJar/FullStory (if privacy & compliance allow) for session replay in pilot.

## Issues to watch for (observational checklist)
- Confusing labels on menu items
- Lack of unit or yield information in recipe details
- Hard-to-find order status or unclear success confirmation
- Missing error handling for offline submissions

## Deliverables after testing
- Usability report with prioritized issues (Critical / Major / Minor)
- Updated UX backlog with annotated screenshots
- Short list of quick wins (labels, CTAs, error messages) and engineering tasks (retry logic, debounce, idempotency)

## Example quick wins (expected)
- Add clearer `Add to cart` affordance on mobile
- Show real-time availability badge on menu list (In stock / Low / Out)
- Add retry and idempotency token for order submission to avoid duplicates

---

If you'd like, I can:
- create a short clickable prototype for the guest ordering flow (Figma or simple HTML) for early testing,
- create a participant recruitment email template,
- run a moderated test session and summarize results (if you provide test accounts and a dev endpoint).
