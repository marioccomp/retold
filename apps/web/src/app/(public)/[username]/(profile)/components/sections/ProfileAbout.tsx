"use client";

import { FiBookOpen, FiEdit2 } from "react-icons/fi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/src/i18n/client";

type Props = {
  longBio: string | null;
  bio: string | null;
  ownProfile?: boolean;
  onEditClick?: () => void;
};

export default function ProfileAbout({ longBio, bio, ownProfile, onEditClick }: Props) {
  const { dict } = useTranslation();

  return (
    <Card className="border-border/50 shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/40 bg-white">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg text-foreground font-bold">
            <FiBookOpen className="text-primary" />
            {dict.profile.about_section}
          </CardTitle>

          {ownProfile && onEditClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onEditClick}
              className="w-8 h-8 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all cursor-pointer"
              title={dict.profile.edit_details}
            >
              <FiEdit2 size={14} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-5 pb-6">
        <p className="text-foreground/80 leading-relaxed text-[1rem] whitespace-pre-wrap">
          {longBio || (
            <span className="italic text-muted-foreground/60">{dict.profile.no_description}</span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
