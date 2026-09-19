# School Support Android

Standalone internal school ticketing app, kept separate from the SchoolDB parent/student Android app.

## V1 scope

- Staff and admin can raise tickets.
- Admin can monitor all tickets, assign, reply, update priority/status, resolve and close.
- Student complaints can reference an existing SchoolDB student.
- Student search supports both admission number and student name.
- Student records remain in SchoolDB; this app stores only the selected student ID on a ticket.
- Planned push notifications reuse the proven Firebase/FCM approach from `android/`.

## Planned flow

Login -> Ticket Dashboard -> Raise Ticket -> optional Student Search -> Ticket Details -> Replies/History -> Resolve/Close.

## API contract planned

- `GET /api/v1/support/students?q=`
- `GET /api/v1/support/tickets`
- `POST /api/v1/support/tickets`
- `GET /api/v1/support/tickets/:id`
- `POST /api/v1/support/tickets/:id/messages`
- `PATCH /api/v1/support/tickets/:id`

The next implementation step is the shared SchoolDB backend: ticket Prisma models, authorization, student search, and ticket endpoints.
