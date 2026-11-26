import test from "node:test";
import assert from "node:assert/strict";
import { resolveWorkspaceLanding,isMemberSchoolPathAllowed } from "../src/lib/navigation-access.ts";
import { ADMISSIONS_ONLY_ROUTES } from "../src/lib/route-access.ts";
const admin={role:"SCHOOL_ADMIN",customPermissionsEnabled:false,permissions:[]};
const staff={role:"RECEPTIONIST",customPermissionsEnabled:false,permissions:[]};
const admissions={routeAccessRestricted:true,allowedRoutes:[...ADMISSIONS_ONLY_ROUTES],defaultLandingRoute:"admissions/dashboard"};
test("admissions-only staff land on admissions, not ERP dashboard",()=>{assert.equal(resolveWorkspaceLanding(admissions,admin),"admissions/dashboard");assert.equal(resolveWorkspaceLanding(admissions,staff),"admissions/dashboard");assert.equal(isMemberSchoolPathAllowed(admissions,staff,"/demo/admissions/settings","demo"),false);assert.equal(isMemberSchoolPathAllowed(admissions,admin,"/demo/attendance","demo"),false);});
test("default full ERP and permission fallback",()=>{assert.equal(resolveWorkspaceLanding({routeAccessRestricted:false,allowedRoutes:[]},admin),"dashboard");assert.equal(resolveWorkspaceLanding({routeAccessRestricted:true,allowedRoutes:["admissions"],defaultLandingRoute:"dashboard"},staff),"admissions/dashboard");assert.equal(resolveWorkspaceLanding({routeAccessRestricted:true,allowedRoutes:[]},staff),null);});
