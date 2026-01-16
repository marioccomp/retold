"use client";

import Image from "next/image";
import { FiExternalLink, FiPlus } from "react-icons/fi";
import { PublicProfileDTO } from "@/src/domains/user/dtos/public-profile.dto";

type Props = {
  profile: PublicProfileDTO;
  ownProfile: boolean;
  searchQuery: string;
};

export default function CertificationsSection({ searchQuery, ownProfile, profile }: Props) {
  const FALLBACK_CERT =
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=800&auto=format&fit=crop";

  const certifications = profile.certifications;

  const filtered = certifications.filter(
    (cert) =>
      cert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.issuer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewCertification = () => {
    console.log("Abrir modal de nova certificação");
  };

  return (
    <>
      {/* Card de adicionar nova certificação */}
      {ownProfile && searchQuery === "" && (
        <div
          className="w-full min-h-[240px] h-full flex flex-col items-center justify-center gap-4 border-2 border-dashed border-[#e7eae9] rounded-xl bg-[#fafafa] text-[#6b7c7a] cursor-pointer transition-all duration-200 hover:border-[#05dc7f] hover:text-[#05dc7f] hover:bg-[rgba(5,220,127,0.04)] hover:-translate-y-[3px]"
          onClick={handleNewCertification}
          role="button"
          tabIndex={0}
        >
          <FiPlus className="w-9 h-9 stroke-[1.5px]" />
          <span className="font-semibold text-[1.1rem]">Nova certificação</span>
        </div>
      )}

      {filtered.map((cert) => (
        <div
          key={cert.id}
          className="bg-white border border-[#e7eae9] rounded-xl overflow-hidden flex flex-col transition-all duration-200 h-full hover:border-[#05dc7f] hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(0,0,0,0.08)]"
        >
          <div className="relative w-full h-[160px] bg-[#f5f5f5]">
            <Image
              src={cert.image || FALLBACK_CERT}
              alt={cert.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="p-5 flex flex-col flex-1 relative">
            <div>
              <h4 className="m-0 mb-1 text-[#152e2b] text-[1.05rem] leading-tight">{cert.title}</h4>
              <p className="m-0 text-[0.85rem] text-[#6b7c7a]">
                {cert.issuer} • {cert.date}
              </p>
            </div>
            <a
              href={cert.link ?? ""}
              className="absolute bottom-5 right-5 text-[#6b7c7a] text-[1.1rem] transition-colors duration-200 hover:text-[#05dc7f]"
              target="_blank"
            >
              <FiExternalLink />
            </a>
          </div>
        </div>
      ))}
    </>
  );
}
