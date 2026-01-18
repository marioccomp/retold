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
    <div className="flex flex-col">
      <HeroSectionV2 projectDTO={projectDTO} session={session} />

      <FeedContent projects={feedProjects} />
    </div>
  );
}

