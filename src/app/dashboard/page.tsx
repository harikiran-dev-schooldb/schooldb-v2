import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/login");
  }

  return (
    <main className="p-10">
      <h1 className="text-4xl font-bold">Dashboard</h1>

      <p className="mt-5">Welcome to SchoolDB 🚀</p>
    </main>
  );
}
