# Super Admin User Guide

The Super Admin controls SchoolDB workspaces and also has full management access inside an assigned school.

## Main responsibilities

- Create and manage school workspaces.
- Upload or remove school logos.
- Decide which routes/modules are available to each school.
- Create Principal, Vice Principal, School Admin, Accountant, and Receptionist logins.
- Govern access, audit activity, monitor system health, and support school operations.
- Perform any school-level workflow when required.

## Set up a new school

1. Open **Schools** and select **Add School**.
2. Enter the official school name and review the generated school URL.
3. Create the school. Your Super Admin membership is added automatically.
4. Upload the school logo from the school card.
5. Open **Route Access** and enable only the modules included for that school.
6. Enter the school workspace and complete **School Setup** in this order:
   - Academic Year
   - Syllabi & Branches
   - Classes
   - Sections
   - Subjects and Class Subjects
   - School Periods
   - Teachers, allocations, and class teachers
7. Create the Principal or School Admin in **People → User Accounts**.

Route Access controls the school as a whole. Individual role permissions still apply inside the enabled routes.

## Manage administrators and staff access

Open **People → User Accounts**.

- Use **Create staff user** for administrators and operational staff.
- Create teachers from **People → Teachers** so their login remains linked to academic allocations.
- Edit a staff account to correct its name, number, designation, role, or active status.
- Use custom permissions to assign `View`, `Manage`, or `No access` per module to Teachers, Accountants, and Receptionists.
- Test with the target role after changing access.

Administrator permissions are protected. Only a Super Admin can create or modify administrator-level access. Never grant broad access solely to make a missing menu appear; grant the smallest modules needed for the person's work.

## Governance routine

- Review **Activity & Audit Logs** for sensitive or unusual actions.
- Review **System Health** after deployments or reported failures.
- Review inactive staff accounts and disable access promptly when employment ends.
- Check **Reports** and **Management Analytics** for data quality gaps.
- Confirm backups, production migrations, payment webhooks, WhatsApp delivery, and push notification delivery with the technical operator.

## Multi-school safety

Before changing data, confirm the school name in the header. Use **Change school** rather than editing a URL manually. Treat exports and downloaded reports as school-confidential data.

For everyday school workflows, also follow the [Principal / School Admin guide](school-admin.md).

