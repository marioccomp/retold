import { Loader2 } from "lucide-react";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* 1. Full Screen Centered Spinner Overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="bg-background/40 backdrop-blur-[2px] p-4 rounded-full border border-border/20 shadow-2xl">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      </div>

      {/* 2. Profile Banner Skeleton */}
      <div className="h-[250px] md:h-[300px] lg:h-[350px] w-full bg-muted/30 relative overflow-hidden">
        <div className="absolute inset-x-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg] animate-[shimmer_3s_infinite]" />
      </div>

      {/* 3. Main Layout Container (Skeletons in background) */}
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[320px_1fr] xl:grid-cols-[350px_1fr] gap-6 md:gap-8 lg:gap-12 px-5 sm:px-8 md:px-8 lg:px-8 xl:px-16 -mt-16 md:-mt-24 relative z-10 opacity-60">
        
        {/* Sidebar Skeleton */}
        <aside className="space-y-8">
          <div className="h-32 w-32 md:h-40 md:w-40 lg:h-48 lg:w-48 rounded-3xl bg-muted border-4 border-background shadow-lg overflow-hidden relative">
             <div className="absolute inset-0 bg-gradient-to-tr from-muted to-muted/10 animate-pulse" />
          </div>
          
          <div className="space-y-5 px-1">
            <div className="h-8 w-3/4 bg-muted/80 rounded-lg animate-pulse" />
            <div className="h-4 w-1/3 bg-muted/60 rounded-lg animate-pulse" />
            <div className="h-4 w-full bg-muted/40 rounded-lg animate-pulse" />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-h-[200px] mt-0 md:mt-16 max-md:mt-12">
          <div className="flex items-center gap-8 mb-10 border-b border-border/40 pb-5">
            <div className="h-8 w-28 bg-muted rounded-xl" />
            <div className="h-8 w-28 bg-muted/40 rounded-xl" />
          </div>

          {/* Cards Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-8 pb-20">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className="h-[180px] w-full bg-muted/10 rounded-2xl border border-border/20 p-5 space-y-4"
              >
                <div className="h-6 w-1/2 bg-muted/40 rounded-lg" />
                <div className="h-10 w-full bg-muted/20 rounded-xl" />
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
