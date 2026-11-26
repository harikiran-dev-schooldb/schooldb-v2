import { isTeacherRouteAllowed, type TeacherAccessSettings } from "./teacher-access.ts";
import { navigation } from "./navigation.ts";
import {
  BULK_OPERATION_ROUTES,
  isAdmissionsOnlySchool,
  validLandingRoute,
  isRouteAllowed,
  resolveConfiguredRoute,
  type RouteAccessConfig,
} from "./route-access.ts";
import {
  hasModuleAccess,
  moduleForRoute,
  type StaffPermissionMembership,
} from "./staff-permissions.ts";

export type MemberRouteAccess = StaffPermissionMembership;

const ALWAYS_VISIBLE_MEMBER_ROUTES = new Set([
  "settings",
  "notification-inbox",
  "user-guide",
]);

const ROLE_ONLY_MEMBER_ROUTES = new Map<string, Set<string>>([
  ["teacher/profile", new Set(["TEACHER"])],
  ["schools/route-access", new Set(["SUPER_ADMIN"])],
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

  const navigationHref = href==="parent-queries"?"queries":BULK_OPERATION_ROUTES.some((route) => route.href === href)
    ? "bulk-operations"
    : href;

  for (const item of navigation) {
    if (item.roles && !item.roles.includes(role)) continue;

    if (item.href === navigationHref) return true;
    if (
      item.children?.some(
        (child) =>
          child.href === navigationHref && (!child.roles || child.roles.includes(role)),
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
  if (href === "student-follow-ups" && !["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"].includes(membership.role)) {
    return false;
  }
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

  const relative=pathname.slice(prefix.length);
  const route = resolveConfiguredRoute(relative);
  if (!route) return false;
  if (!isRouteAllowed(school, route)) return false;
  const child=route==="admissions"?navigation.find(item=>item.title==="Admissions")?.children?.filter(item=>item.href!=="admissions"&&(relative===item.href||relative.startsWith(item.href+"/"))).sort((a,b)=>b.href.length-a.href.length)[0]:undefined;
  if(child?.roles&&!child.roles.includes(membership.role))return false;
  return isMemberRouteAllowed(membership,child?.href??route);
}

export function resolveWorkspaceLanding(school:RouteAccessConfig,membership:MemberRouteAccess,teacherAccess?:TeacherAccessSettings|null){
 const allowed=(href:string)=>isRouteAllowed(school,href)&&isMemberRouteAllowed(membership,href)&&(membership.role!=="TEACHER"||isTeacherRouteAllowed(teacherAccess,href));
 const configured=validLandingRoute(school,school.defaultLandingRoute);
 const preferred=membership.role==="TEACHER"?["teacher/dashboard",...(configured?[configured]:[])]:[...(configured?[configured]:[]),...(isAdmissionsOnlySchool(school)?["admissions/dashboard"]:[]),"dashboard","admissions/dashboard"];
 for(const href of preferred)if(allowed(href))return href;
 const candidates=navigation.flatMap(item=>item.href?[item.href]:(item.children??[]).map(child=>child.href));
 for(const href of candidates)if(!["schools","schools/route-access","user-guide","teacher/profile","settings","notification-inbox","bulk-operations","presentation"].includes(href)&&allowed(href))return href;
 return null;
}
