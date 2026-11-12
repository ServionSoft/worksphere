export function ShellFallback() {
  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <div className="hidden w-[260px] border-r border-border bg-sidebar lg:block" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-14 border-b border-border" />
        <div className="flex-1 p-6">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
          <div className="mt-4 h-40 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

export function ProjectDetailFallback() {
  return (
    <div className="flex flex-col gap-5">
      <div className="h-36 animate-pulse rounded-xl bg-muted" />
      <div className="h-10 w-full max-w-xl animate-pulse rounded-md bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
