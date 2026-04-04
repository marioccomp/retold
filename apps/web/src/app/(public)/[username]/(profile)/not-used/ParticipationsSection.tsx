"use client";

import Image from "next/image";
import { FiPlus } from "react-icons/fi";
import { PublicProfileDTO } from "@/src/domains/user/dtos/public-profile.dto";
import { useTranslation } from "@/src/i18n/client";

type Props = {
  profile: PublicProfileDTO;
  ownProfile: boolean;
  searchQuery: string;
};

export default function ParticipationsSection({ searchQuery, ownProfile, profile }: Props) {
  const { dict } = useTranslation();
  const FALLBACK_EVENT =
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop";

  const participations = profile.participations;

  const filtered = participations.filter(
    (part) =>
      part.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewParticipation = () => {
  };

  return (
    <>
      {/* Card de adicionar nova participação */}
      {ownProfile && searchQuery === "" && (
        <div
          className="w-full min-h-[240px] h-full flex flex-col items-center justify-center gap-4 border-2 border-dashed border-[#e7eae9] rounded-xl bg-[#fafafa] text-[#6b7c7a] cursor-pointer transition-all duration-200 hover:border-[#05dc7f] hover:text-[#05dc7f] hover:bg-[rgba(5,220,127,0.04)] hover:-translate-y-[3px]"
          onClick={handleNewParticipation}
          role="button"
          tabIndex={0}
        >
          <FiPlus className="w-9 h-9 stroke-[1.5px]" />
          <span className="font-semibold text-[1.1rem]">{dict.profile.new_participation}</span>
        </div>
      )}

      {filtered.map((part) => (
        <div
          key={part.id}
          className="bg-white border border-[#e7eae9] rounded-xl overflow-hidden flex flex-col transition-all duration-200 h-full hover:border-[#05dc7f] hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(0,0,0,0.08)] [&_small]:text-[#9ca3af] [&_small]:text-[0.8rem]"
        >
          <div className="relative w-full h-[160px] bg-[#f5f5f5]">
            <Image
              src={part.image || FALLBACK_EVENT}
              alt={part.title}
              fill
              className="object-cover"
              unoptimized
            />
            <span className="absolute bottom-3 left-3 bg-[#152e2b] text-[#05dc7f] text-[10px] font-bold py-1 px-2 rounded z-[2]">
              {part.role}
            </span>
          </div>
          <div className="p-5 flex flex-col flex-1 relative">
            <div>
              <h4 className="m-0 mb-1 text-[#152e2b] text-[1.05rem] leading-tight">{part.title}</h4>
              <p className="mt-2 text-[0.85rem] leading-[1.4] text-[#4a5554] line-clamp-2">
                {part.description}
              </p>
              <small>{part.date}</small>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
