export function AppShell({ title = "PawTrack", children }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto w-full max-w-5xl px-6 py-4">
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}
