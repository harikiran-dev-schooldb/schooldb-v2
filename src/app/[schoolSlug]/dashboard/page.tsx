import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { syncUser } from "@/lib/sync-user";

export default async function Dashboard({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/login");
  }

  const { schoolSlug } = await params;

  const user = await syncUser();

  return (
    <main className="p-10">
      <h1 className="text-3xl font-bold">{schoolSlug}</h1>

      <p>{user?.email}</p>
    </main>
  );
}
