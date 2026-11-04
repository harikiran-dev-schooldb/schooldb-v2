# SchoolDB school demo runbook

Use this runbook before and during an in-person school demonstration. The goal is a reliable 15–20 minute conversation built around the school’s daily work, not a tour of every menu.

## The day before

1. Use only fictional student, parent, staff, payment, and contact data in the `demo` school.
2. Keep Cashfree in sandbox and turn WhatsApp automation off. Never enter a real UPI reference or send a test message to a real family.
3. Run the complete preflight:

   ```bash
   npm run demo:preflight
   ```

4. Resolve every `BLOCKED` item. `IMPROVE` items are optional, but populated attendance, fees, homework, notices, and results make the story much stronger.
5. Sign in with the dedicated demo administrator account. Do not use a production owner account in front of a school.
6. Open these pages once so authentication and data are warm:

   - `/<demo-slug>/dashboard`
   - `/<demo-slug>/students`
   - `/<demo-slug>/attendance`
   - `/<demo-slug>/homework`
   - `/<demo-slug>/reports`
   - `/<demo-slug>/my`

7. Capture fresh screenshots of the dashboard, attendance, fees, and family view on the demo device. Keep them available offline as the fallback.

To check a different demo tenant:

```bash
DEMO_SCHOOL_SLUG=my-demo npm run demo:check
```

Use `npm run demo:check -- --strict` when you want every recommended content area populated.

## Suggested 15–20 minute walkthrough

### 1. Start with their priorities — 2 minutes

Ask: “Which three areas consume the most staff time today—attendance, fees, parent communication, reports, or something else?” Use their answer to choose the next screens.

### 2. Management dashboard — 3 minutes

Show the active academic year, student and staff totals, attendance, fee collection, action queues, and alerts. Explain that each number is school-scoped and role-aware.

### 3. One connected student journey — 6 minutes

Open one fictional student and follow the same record through enrollment, attendance, homework, fees/receipts, exam results, documents, and parent/student self-service. This demonstrates the value of one connected source of data better than opening unrelated modules.

### 4. A daily staff workflow — 4 minutes

Choose the workflow closest to the visitor’s priority:

- Teacher: mark attendance, add homework, enter marks.
- Accountant: view outstanding fees, collect a sandbox payment, show a receipt.
- Administrator: admissions, reports, permissions, audit history.
- Reception: student lookup, enquiry/admission, visitor or supported fee workflow.

### 5. Mobile and family experience — 3 minutes

Use a phone-sized window or device to show the family overview, attendance history, homework, notices, fees, and receipts. Mention PWA installation and notifications only if the required integration is configured.

### 6. Close on rollout — 2 minutes

Ask for student count, boards/syllabi, number of campuses, current software, priority modules, desired go-live date, and the decision process. Agree on one next step: scoped pilot, data template, quotation, or follow-up with management.

## Demo safety rules

- Never expose `.env` files, API keys, database consoles, production logs, or real personal data.
- Do not promise a feature that was not shown or verified. Record it as a requirement.
- Do not trigger production payments, WhatsApp messages, push broadcasts, bulk imports, promotions, or destructive actions.
- Keep the browser zoom at 100%, notifications muted, and unrelated tabs closed.
- Carry a charger, hotspot, HDMI/USB-C adapter, and the offline screenshots.

## If internet or login fails

1. Switch to the saved screenshots and continue the same connected-student story.
2. Explain the workflow and decisions each screen supports; do not spend the meeting debugging.
3. Offer a short live follow-up once connectivity is restored.
4. After the visit, record the failure and rerun `npm run demo:preflight` before the next demonstration.

## Notes to capture after the meeting

- School, contact, role, student/staff count, campuses, and syllabus.
- Current system and biggest pain points.
- Required modules and reports.
- Data migration sources and quality.
- Payment, WhatsApp, attendance-device, and integration needs.
- Decision makers, budget/timeline signal, objections, and agreed next action/date.
