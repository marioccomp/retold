import { Suspense } from "react";
import { getHighlightedProject } from "./actions/get-highlighted-project.action";
import { getFeedProjects } from "./actions/get-feed-projects.action";
import HeroSectionV2 from "./HeroSectionV2";
import FeedContent from "./FeedContent";
import { auth } from "@/src/domains/auth/auth";


export default async function Home() {
  const [projectDTO, feedProjects] = await Promise.all([
    getHighlightedProject(),
    getFeedProjects(),
  ]);

  const session = await auth()

  return (
    <div className="flex flex-col animate-[slideUpEntrance_0.8s_ease-out_forwards]">
      <HeroSectionV2 projectDTO={projectDTO} session={session} />
      <Suspense fallback={<div className="w-full h-96 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>}>
        <FeedContent projects={feedProjects} />
      </Suspense>
    </div>
  );
}

