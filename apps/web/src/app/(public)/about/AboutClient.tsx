"use client";

import AboutRetold from "@/src/components/AboutRetold";
import CreatorCard from "@/src/components/CreatorCard";

interface UserLinks {
  github?: string | null;
  linkedin?: string | null;
  website?: string | null;
  twitter?: string | null;
}

interface CreatorData {
  username: string;
  name: string;
  role: string;
  bio: string;
  avatarUrl?: string;
  links: UserLinks;
}

interface AboutClientProps {
  creators: CreatorData[];
  dict: any;
}

export default function AboutClient({ creators, dict }: AboutClientProps) {
  return (
    <main className="min-h-screen pt-20 pb-20 overflow-hidden bg-background">
      {/* Background blobs for premium feel */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full animate-pulse delay-1000" />
      </div>

      <div className="relative z-10">
        <AboutRetold />

        <section className="max-w-7xl mx-auto px-6 mt-12 md:mt-24">
          <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              {dict.about.creators.title}
            </h2>
            <p className="text-muted-foreground text-lg">
              {dict.about.creators.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {creators.map((creator, i) => (
              <div 
                key={creator.username} 
                className="animate-in fade-in slide-in-from-bottom-10 duration-700"
                style={{ animationDelay: `${i * 150}ms`, animationFillMode: 'both' }}
              >
                <CreatorCard
                  name={creator.name}
                  handle={creator.username}
                  role={creator.role}
                  bio={creator.bio}
                  avatarUrl={creator.avatarUrl}
                  links={creator.links}
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
