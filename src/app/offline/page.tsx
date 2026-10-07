import { OfflineExperience } from "@/components/pwa/OfflineExperience";
import { OfflineSnapshotViewer } from "@/components/pwa/OfflineSnapshotViewer";

export default function OfflinePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#030712] px-4 py-8 sm:px-6 sm:py-12">
      <div className="schooldb-offline-orb schooldb-offline-orb-one absolute -top-40 -left-32 size-[32rem] rounded-full bg-indigo-600/20 blur-3xl" aria-hidden="true" />
      <div className="schooldb-offline-orb schooldb-offline-orb-two absolute -right-44 -bottom-52 size-[38rem] rounded-full bg-violet-600/15 blur-3xl" aria-hidden="true" />
      <OfflineExperience />
      <div className="relative z-10 w-full max-w-5xl">
        <OfflineSnapshotViewer />
      </div>
    </main>
  );
}
