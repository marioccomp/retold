"use client";

import { FiCode, FiEdit2 } from "react-icons/fi";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/src/i18n/client";

type Props = {
  skills: string[];
  ownProfile?: boolean;
  onEditClick?: () => void;
};

export default function ProfileSkills({ skills, ownProfile, onEditClick }: Props) {
  const { dict } = useTranslation();

  return (
    <Card className="border-border/50 shadow-sm h-full">
      <CardHeader className="pb-3 border-b border-border/40 bg-white">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg text-foreground font-bold">
            <FiCode className="text-[#05dc7f]" />
            {dict.profile.skills_section}
          </CardTitle>

          {ownProfile && onEditClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onEditClick}
              className="w-8 h-8 rounded-lg hover:bg-[#05dc7f]/10 text-muted-foreground hover:text-[#05dc7f] transition-all cursor-pointer"
              title={dict.profile.edit_details}
            >
              <FiEdit2 size={14} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="flex flex-wrap gap-2.5">
          {skills && skills.length > 0 ? (
            skills.map((skill) => (
              <Badge
                key={skill}
                variant="outline"
                className="px-4 py-1.5 text-[0.85rem] font-semibold border-[#05dc7f]/20 text-[#047857] bg-[#05dc7f]/5 hover:bg-[#05dc7f]/10 transition-all rounded-full"
              >
                {skill}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground italic text-sm m-auto">
              {dict.profile.edit_section_modal.skills_none}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
