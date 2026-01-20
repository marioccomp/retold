"use client";

import Image from "next/image";
import defaultCover from "@/assets/capa.jpg";
import { useTranslation } from "@/src/i18n/client";

type Props = {
    cover?: string | null;
};

export default function ProfileBanner({ cover }: Props) {
    const { dict } = useTranslation();

    return (
        <section className="py-6 px-4 sm:px-8 md:px-16 lg:pl-24 lg:pr-16">
            {cover ? (
                <img
                    src={cover}
                    className="w-full h-[160px] sm:h-[200px] md:h-[250px] object-cover rounded-xl block shadow-sm"
                    alt={dict.profile.alt_cover}
                />
            ) : (
                <Image
                    src={defaultCover}
                    className="w-full h-[160px] sm:h-[200px] md:h-[250px] object-cover rounded-xl block shadow-sm"
                    alt={dict.profile.alt_cover}
                    priority
                />
            )}
        </section>
    );
}
