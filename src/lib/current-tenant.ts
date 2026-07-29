import { syncUser } from "./sync-user";

export async function getCurrentTenant() {
  const user = await syncUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const membership = user.memberships.find((m) => m.isActive);

  if (!membership) {
    throw new Error("No active membership found.");
  }

  return {
    user,
    schoolId: membership.schoolId,
    role: membership.role,
    membership,
  };
}