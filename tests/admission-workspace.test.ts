import test from "node:test";
import assert from "node:assert/strict";
import { calculateExactAge, eligibleClassIds } from "../src/features/admissions/age-policy.ts";
import { readPlanning,seatBalance } from "../src/features/admissions/planning-policy.ts";
test("exact age and school-configured class matches",()=>{
 assert.deepEqual(calculateExactAge("2023-05-30","2027-06-01"),{years:4,months:0,days:2,totalMonths:48});
 assert.equal(calculateExactAge("2027-06-02","2027-06-01"),null);
 assert.deepEqual(eligibleClassIds("2023-06-01",{ageAsOfDate:"2027-06-01",rules:{a:{minMonths:48,maxMonths:59},b:{minMonths:60,maxMonths:71}}}),["a"]);
 assert.deepEqual(eligibleClassIds("2023-06-01",null),[]);
});
test("unknown fees and capacity remain distinct from zero",()=>{assert.deepEqual(readPlanning({a:{termFee:0,annualFees:-1,seatCapacity:40}}),{a:{termFee:0,seatCapacity:40}});assert.equal(seatBalance(undefined,10),null);assert.equal(seatBalance(10,12),-2);});
