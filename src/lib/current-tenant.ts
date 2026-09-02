import { syncUser } from "./sync-user";
import { getMembership, getSchoolBySlug } from "./tenant";

export async function getCurrentTenant(schoolSlug: string) {
  const user = await syncUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const school = await getSchoolBySlug(schoolSlug);

  if (!school) {
    throw new Error("School not found");
  }

  const membership = await getMembership(user.id, school.id);

  if (!membership) {
    throw new Error("No active membership for this school");
  }

  return {
    user,
    school,
    schoolId: school.id,
    role: membership.role,
    membership,
  };
}
