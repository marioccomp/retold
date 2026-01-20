"use client";

import { useTranslation } from "@/src/i18n/client";
import { PublicProfileDTO } from "@/src/domains/user/dtos/public-profile.dto";
import { FiEdit2, FiMail, FiPhone, FiCopy, FiCheck } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

type Props = {
    profile: PublicProfileDTO;
    ownProfile: boolean;
    onEditClick: () => void;
};

export default function ProfileContact({ profile, ownProfile, onEditClick }: Props) {
    const { dict } = useTranslation();
    const [copiedEmail, setCopiedEmail] = useState(false);
    const [copiedPhone, setCopiedPhone] = useState(false);

    const handleCopy = (text: string, type: "email" | "phone") => {
        navigator.clipboard.writeText(text);

        if (type === "email") {
            setCopiedEmail(true);
            setTimeout(() => setCopiedEmail(false), 2000);
            toast.success(dict.profile.email_copied);
        } else {
            setCopiedPhone(true);
            setTimeout(() => setCopiedPhone(false), 2000);
            toast.success(dict.profile.contact_section.copied);
        }
    };

    return (
        <section className="bg-white border border-[#e7eae9] rounded-2xl p-6 md:p-8 flex flex-col gap-6 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between">
                <h2 className="text-xl md:text-2xl font-bold text-[#152e2b] flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-[#05dc7f]/10 flex items-center justify-center text-[#05dc7f]">
                        <FiMail size={20} />
                    </span>
                    {dict.profile.contact_section.title}
                </h2>
                {ownProfile && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onEditClick}
                        className="rounded-full hover:bg-gray-100 text-[#6b7c7a] hover:text-[#152e2b] transition-colors cursor-pointer"
                        title={dict.profile.contact_section.edit}
                    >
                        <FiEdit2 size={18} />
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email */}
                <div className="flex flex-col gap-2 p-4 rounded-xl bg-gray-50 border border-[#e7eae9]">
                    <span className="text-sm font-semibold text-[#6b7c7a] uppercase tracking-wider flex items-center gap-2">
                        <FiMail size={14} />
                        {dict.profile.contact_section.email_label}
                    </span>
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-medium text-[#152e2b] break-all">
                            {profile.email || <span className="text-muted-foreground italic text-base">{dict.profile.contact_section.no_email}</span>}
                        </span>
                        {profile.email && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(profile.email!, "email")}
                                className="ml-auto rounded-full hover:bg-white hover:shadow-sm cursor-pointer"
                            >
                                {copiedEmail ? <FiCheck className="text-green-500" /> : <FiCopy className="text-gray-400" />}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-2 p-4 rounded-xl bg-gray-50 border border-[#e7eae9]">
                    <span className="text-sm font-semibold text-[#6b7c7a] uppercase tracking-wider flex items-center gap-2">
                        <FiPhone size={14} />
                        {dict.profile.contact_section.phone_label}
                    </span>
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-medium text-[#152e2b]">
                            {profile.phone || <span className="text-muted-foreground italic text-base">{dict.profile.contact_section.no_phone}</span>}
                        </span>
                        {profile.phone && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(profile.phone!, "phone")}
                                className="ml-auto rounded-full hover:bg-white hover:shadow-sm cursor-pointer"
                            >
                                {copiedPhone ? <FiCheck className="text-green-500" /> : <FiCopy className="text-gray-400" />}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
