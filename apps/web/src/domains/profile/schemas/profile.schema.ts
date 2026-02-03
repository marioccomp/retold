import { z } from "zod";

const trim = (v: unknown) => (typeof v === "string" ? v.trim() : v);

export const getProfileSchema = (dict: any) => z.object({
    title: z.preprocess(trim, z.string().max(50, dict.validation.title_max)),

    // Agora validando como Headline (mximo 100 caracteres)
    bio: z.preprocess(
        trim,
        z.string().max(100, dict.validation.headline_max)
    ),

    githubUrl: z.preprocess(
        trim,
        z.string()
            .refine(
                (val) => {
                    if (!val || val === "") return true;
                    const githubRegex = /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/;
                    return githubRegex.test(val);
                },
                { message: dict.validation.github_invalid }
            )
            .transform((val) => {
                if (!val || val === "") return "";
                if (!val.startsWith("http")) {
                    return `https://${val.replace(/^www\./, "")}`;
                }
                return val.replace(/^(https?:\/\/)www\./, "$1");
            })
            .optional()
    ),

    linkedinUrl: z.preprocess(
        trim,
        z.string()
            .refine(
                (val) => {
                    if (!val || val === "") return true;
                    const linkedinRegex = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/;
                    return linkedinRegex.test(val);
                },
                { message: dict.validation.linkedin_invalid }
            )
            .transform((val) => {
                if (!val || val === "") return "";
                if (!val.startsWith("http")) {
                    return `https://${val.replace(/^www\./, "")}`;
                }
                return val.replace(/^(https?:\/\/)www\./, "$1");
            })
            .optional()
    ),
    websiteUrl: z.preprocess(
        trim,
        z.string()
            .refine(
                (val) => {
                    if (!val || val === "") return true;
                    // Regex básica para: qualquer_coisa.dominio (mínimo de uma URL)
                    const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
                    return urlRegex.test(val);
                },
                { message: dict.validation.url_invalid }
            )
            .transform((val) => {
                if (!val || val === "") return "";
                if (!val.startsWith("http")) {
                    return `https://${val}`;
                }
                return val;
            })
            .optional()
    ),

    phone: z.preprocess(
        trim,
        z.string()
            .refine(
                (val) => {
                    if (!val || val === "") return true;
                    // Validação simples de telefone (apenas números, +, -, (, ), espaços)
                    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;
                    return val.length > 5;
                },
                { message: dict.profile.contact_section.validation.phone_invalid }
            )
            .optional()
    ),

    contactEmail: z.preprocess(
        trim,
        z.string()
            .email({ message: dict.validation.email_invalid })
            .optional()
            .or(z.literal(""))
    ),
});

export const getProfileDetailsSchema = (dict: any) => z.object({
    longBio: z.string().nullable(),
    skills: z.array(z.string()),
    educations: z.array(z.object({
        degree: z.string().min(1, dict.validation.course_required),
        institution: z.string().min(1, dict.validation.institution_required),
        startDate: z.string().min(1, dict.validation.start_date_required),
        endDate: z.string().nullable(),
    })),
});
