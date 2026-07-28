export default function NotFound() {
  return (
    <main className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">School Not Found</h1>

        <p className="mt-3 text-muted-foreground">
          The requested school does not exist.
        </p>
      </div>
    </main>
  );
}
