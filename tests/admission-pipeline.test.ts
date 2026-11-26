import test from "node:test";
import assert from "node:assert/strict";
import { PIPELINE_STAGES,seatSummary,requiresSeatWaitlist } from "../src/features/admissions/pipeline-policy.ts";
import {readPlanning} from "../src/features/admissions/planning-policy.ts";
test("pipeline includes every application status exactly once",()=>assert.equal(new Set(PIPELINE_STAGES.map(s=>s.status)).size,7));
test("approved and converted consume one seat each",()=>{assert.deepEqual(seatSummary(10,3,5),{reserved:3,admitted:5,available:2});assert.equal(seatSummary(undefined,0,0).available,null);assert.equal(seatSummary(2,2,2).available,-2);});
test("seat limit enforcement is opt-in and zero capacity is valid",()=>{assert.equal(requiresSeatWaitlist(0,true,0,0),true);assert.equal(requiresSeatWaitlist(10,true,4,6),true);assert.equal(requiresSeatWaitlist(10,true,4,5),false);assert.equal(requiresSeatWaitlist(10,false,10,10),false);assert.equal(requiresSeatWaitlist(undefined,true,10,10),false);assert.deepEqual(readPlanning({class1:{seatCapacity:5,enforceCapacity:true},class2:{enforceCapacity:true}}),{class1:{seatCapacity:5,enforceCapacity:true},class2:{}});});
