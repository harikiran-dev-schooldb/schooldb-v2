import test from "node:test";
import assert from "node:assert/strict";
import { validateSchoolProfile } from "../src/features/schools/school-profile.ts";
test("school profile validates contact and administrative fields",()=>{assert.deepEqual(validateSchoolProfile({city:" Visakhapatnam ",udiseCode:"12345678901",email:"office@example.com",timezone:"Asia/Kolkata"}),{city:"Visakhapatnam",udiseCode:"12345678901",email:"office@example.com",timezone:"Asia/Kolkata"});});
test("school profile rejects unknown fields and invalid values",()=>{for(const input of [{slug:"other"},{workspaceStatus:"disabled"},{website:"javascript:alert(1)"},{subscriptionExpiry:"2027-02-30"},{udiseCode:"123"},{timezone:"invalid"},{openingTime:"16:00",closingTime:"08:00"},{subscriptionStart:"2027-03-01",subscriptionExpiry:"2027-02-01"}])assert.throws(()=>validateSchoolProfile(input));});
