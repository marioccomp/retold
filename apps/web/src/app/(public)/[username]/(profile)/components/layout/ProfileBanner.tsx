"use client";

import Image from "next/image";
import capa from "@/assets/capa.jpg";
import { useTranslation } from "@/src/i18n/client";

export default function ProfileBanner() {
    const { dict } = useTranslation();

    return (
        <section className="py-6 px-4 sm:px-8 md:px-16 lg:pl-24 lg:pr-16">
            <Image
                src={capa}
                className="w-full h-[160px] sm:h-[200px] md:h-[250px] object-cover rounded-xl block shadow-sm"
                alt={dict.profile.alt_cover}
                priority
            />
        </section>
    );
}
