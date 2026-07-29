import { syncUser } from "./sync-user";

export async function getCurrentMembership() {
  const user = await syncUser();

  if (!user) {
    throw new Error("User not found");
  }

  const membership = user.memberships[0];

  if (!membership) {
    throw new Error("Membership not found");
  }

  return membership;
}