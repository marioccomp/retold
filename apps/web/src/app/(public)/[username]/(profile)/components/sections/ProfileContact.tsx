"use client";

import { useTranslation } from "@/src/i18n/client";
import { PublicProfileDTO } from "@/src/domains/user/dtos/public-profile.dto";
import { FiEdit2, FiMail, FiPhone, FiCopy, FiCheck } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3 border-b border-border/40 bg-white">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg text-foreground font-bold">
            <FiMail className="text-primary" />
            {dict.profile.contact_section.title}
          </CardTitle>
          {ownProfile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onEditClick}
              className="w-8 h-8 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all cursor-pointer"
              title={dict.profile.contact_section.edit}
            >
              <FiEdit2 size={14} />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email */}
          <div className="flex flex-col gap-2 p-4 rounded-xl bg-muted/30 border border-border">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <FiMail size={14} />
              {dict.profile.contact_section.email_label}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-lg font-medium text-foreground break-all">
                {profile.email || (
                  <span className="text-muted-foreground italic text-base">
                    {dict.profile.contact_section.no_email}
                  </span>
                )}
              </span>
              {profile.email && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(profile.email!, "email")}
                  className="ml-auto rounded-full hover:bg-white hover:shadow-sm cursor-pointer"
                >
                  {copiedEmail ? (
                    <FiCheck className="text-green-500" />
                  ) : (
                    <FiCopy className="text-gray-400" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-2 p-4 rounded-xl bg-muted/30 border border-border">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <FiPhone size={14} />
              {dict.profile.contact_section.phone_label}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-lg font-medium text-foreground">
                {profile.phone || (
                  <span className="text-muted-foreground italic text-base">
                    {dict.profile.contact_section.no_phone}
                  </span>
                )}
              </span>
              {profile.phone && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(profile.phone!, "phone")}
                  className="ml-auto rounded-full hover:bg-white hover:shadow-sm cursor-pointer"
                >
                  {copiedPhone ? (
                    <FiCheck className="text-green-500" />
                  ) : (
                    <FiCopy className="text-gray-400" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
