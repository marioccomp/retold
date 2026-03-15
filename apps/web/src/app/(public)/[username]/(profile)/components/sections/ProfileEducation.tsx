"use client";

import { FiBriefcase, FiCalendar, FiEdit2 } from "react-icons/fi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EducationDTO } from "@/src/domains/user/dtos/public-profile.dto";
import { useTranslation } from "@/src/i18n/client";

type Props = {
  educations?: EducationDTO[];
  ownProfile?: boolean;
  onEditClick?: () => void;
};

export default function ProfileEducation({ educations, ownProfile, onEditClick }: Props) {
  const { dict, lang } = useTranslation();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return dict.profile.currently;
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US", {
      month: "long",
      year: "numeric",
    });
  };

  return (
    <Card className="border-border/50 shadow-sm h-full">
      <CardHeader className="pb-3 border-b border-border/40 bg-card">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg text-foreground font-bold">
            <FiBriefcase className="text-primary" />
            {dict.profile.education_section}
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
      <CardContent className="space-y-6 pt-5">
        {educations && educations.length > 0 ? (
          educations.map((edu, idx) => (
            <div key={idx} className="flex gap-4 last:mb-0 mb-6 font-sans">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                <FiBriefcase className="text-primary w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-foreground text-[1.05rem] leading-tight">
                  {edu.degree}
                </span>
                <span className="text-muted-foreground font-medium">{edu.institution}</span>
                <span className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded-md w-fit font-medium">
                  <FiCalendar className="w-3 h-3" />
                  {formatDate(edu.startDate)} — {formatDate(edu.endDate)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <FiBriefcase className="text-muted-foreground w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-muted-foreground italic">
                {dict.profile.edit_section_modal.education_none}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
