import { navigation } from "@/lib/navigation";
import {
  isRouteAllowed,
  resolveConfiguredRoute,
  type RouteAccessConfig,
} from "@/lib/route-access";
import {
  hasModuleAccess,
  moduleForRoute,
  type StaffPermissionMembership,
} from "@/lib/staff-permissions";

export type MemberRouteAccess = StaffPermissionMembership;

const ALWAYS_VISIBLE_MEMBER_ROUTES = new Set([
  "settings",
  "notification-inbox",
  "user-guide",
]);

const ROLE_ONLY_MEMBER_ROUTES = new Map<string, Set<string>>([
  ["teacher/profile", new Set(["TEACHER"])],
]);

function isRoleOnlyMemberRouteAllowed(role: string, href: string) {
  const allowedRoles = ROLE_ONLY_MEMBER_ROUTES.get(href);
  return allowedRoles ? allowedRoles.has(role) : null;
}

export function isDefaultRoleRouteAllowed(role: string, href?: string) {
  if (!href) return false;
  const roleOnlyAccess = isRoleOnlyMemberRouteAllowed(role, href);
  if (roleOnlyAccess !== null) return roleOnlyAccess;
  if (ALWAYS_VISIBLE_MEMBER_ROUTES.has(href)) return true;

  for (const item of navigation) {
    if (item.roles && !item.roles.includes(role)) continue;

    if (item.href === href) return true;
    if (
      item.children?.some(
        (child) =>
          child.href === href && (!child.roles || child.roles.includes(role)),
      )
    ) {
      return true;
    }
  }

  return false;
}

export function isMemberRouteAllowed(
  membership: MemberRouteAccess,
  href?: string,
) {
  if (!href) return false;
  const roleOnlyAccess = isRoleOnlyMemberRouteAllowed(membership.role, href);
  if (roleOnlyAccess !== null) return roleOnlyAccess;
  if (["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(membership.role)) {
    return isDefaultRoleRouteAllowed(membership.role, href);
  }
  if (!membership.customPermissionsEnabled) {
    return isDefaultRoleRouteAllowed(membership.role, href);
  }
  if (ALWAYS_VISIBLE_MEMBER_ROUTES.has(href)) return true;
  const permissionModule = moduleForRoute(href);
  return Boolean(
    permissionModule && hasModuleAccess(membership, permissionModule, "VIEW"),
  );
}

export function isMemberSchoolPathAllowed(
  school: RouteAccessConfig,
  membership: MemberRouteAccess,
  pathname: string,
  schoolSlug: string,
) {
  const prefix = `/${schoolSlug}/`;
  if (!pathname.startsWith(prefix)) return false;

  const route = resolveConfiguredRoute(pathname.slice(prefix.length));
  if (!route) return false;
  if (!isRouteAllowed(school, route)) return false;
  return isMemberRouteAllowed(membership, route);
}
