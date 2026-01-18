"use client";

import { useState } from "react";
import { PublicProfileDTO } from "@/src/domains/user/dtos/public-profile.dto";
import { useTranslation } from "@/src/i18n/client";

// Specialized Components
import ProfileAbout from "./components/sections/ProfileAbout";
import ProfilePinnedProject from "./components/sections/ProfilePinnedProject";
import ProfileStats from "./components/sections/ProfileStats";
import ProfileEducation from "./components/sections/ProfileEducation";
import ProfileSkills from "./components/sections/ProfileSkills";

// Individual Modals
import EditAboutModal from "./components/modals/EditAboutModal";
import EditEducationModal from "./components/modals/EditEducationModal";
import EditSkillsModal from "./components/modals/EditSkillsModal";

type Props = {
    profile: PublicProfileDTO;
    ownProfile: boolean;
};

export default function ProfileSection({ profile, ownProfile }: Props) {
    const { dict } = useTranslation();

    // Individual Modal States
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
    const [isEducationModalOpen, setIsEducationModalOpen] = useState(false);
    const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);

    // Initial check for data
    const skills = profile.skills || [
        "React",
        "Next.js",
        "TypeScript",
        "Node.js",
        "Tailwind CSS",
        "PostgreSQL",
    ];

    // Mock stats
    const stats = {
        commits: 1250,
        prs: 45,
        issues: 12,
        projectsCount: profile.projects.length
    };

    const pinnedProject = profile.projects[0];

    return (
        <div className="flex flex-col gap-10 animate-[fadeIn_0.6s_ease-out_forwards] pb-24 relative">
            {/* 1. About Section */}
            <ProfileAbout
                longBio={profile.longBio}
                bio={profile.bio}
                ownProfile={ownProfile}
                onEditClick={() => setIsAboutModalOpen(true)}
            />

            {/* 2. Pinned Projects Section */}
            <ProfilePinnedProject project={pinnedProject} />

            {/* 3. Stats Section */}
            <ProfileStats stats={stats} />

            {/* 4. Secondary info (Education & Skills) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <ProfileEducation
                    educations={profile.educations}
                    ownProfile={ownProfile}
                    onEditClick={() => setIsEducationModalOpen(true)}
                />
                <ProfileSkills
                    skills={skills}
                    ownProfile={ownProfile}
                    onEditClick={() => setIsSkillsModalOpen(true)}
                />
            </div>

            {/* Individual Section Modals */}
            <EditAboutModal
                isOpen={isAboutModalOpen}
                onClose={() => setIsAboutModalOpen(false)}
                profile={profile}
            />

            <EditEducationModal
                isOpen={isEducationModalOpen}
                onClose={() => setIsEducationModalOpen(false)}
                profile={profile}
            />

            <EditSkillsModal
                isOpen={isSkillsModalOpen}
                onClose={() => setIsSkillsModalOpen(false)}
                profile={profile}
            />
        </div>
    );
}
