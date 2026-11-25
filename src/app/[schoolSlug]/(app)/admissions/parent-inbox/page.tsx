import { redirect } from "next/navigation";
export default async function Page({params}:{params:Promise<{schoolSlug:string}>}) {const {schoolSlug}=await params;redirect("/"+schoolSlug+"/admissions/intake?view=parent-inbox");}
