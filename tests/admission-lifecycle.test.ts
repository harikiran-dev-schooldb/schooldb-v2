import test from "node:test";
import assert from "node:assert/strict";
import { documentsReady, usableFeePlan } from "../src/features/admissions/lifecycle-policy.ts";
test("optional review preserves existing applications; required review needs verified uploads",()=>{assert.equal(documentsReady(false,[]),true);assert.equal(documentsReady(true,[]),false);assert.equal(documentsReady(true,[{reviewStatus:"PENDING"}]),false);assert.equal(documentsReady(true,[{reviewStatus:"VERIFIED"},{reviewStatus:"REJECTED"}]),false);assert.equal(documentsReady(true,[{reviewStatus:"VERIFIED"}]),true);});
test("fee plan must contain items and installments",()=>{assert.equal(usableFeePlan({items:[]}),false);assert.equal(usableFeePlan({items:[{installments:[]}]}),false);assert.equal(usableFeePlan({items:[{installments:[{}]}]}),true);});
