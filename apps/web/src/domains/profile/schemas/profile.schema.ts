import { z } from "zod";

const trim = (v: unknown) => (typeof v === "string" ? v.trim() : v);

export const profileSchema = z.object({
    title: z.preprocess(trim, z.string().max(50, "Title must have at most 50 characters")),

    // Agora validando como Headline (mximo 100 caracteres)
    bio: z.preprocess(
        trim,
        z.string().max(100, "Headline must have at most 100 characters")
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
                { message: "Use o formato: github.com/seu-usuario" }
            )
            .transform((val) => {
                if (!val || val === "") return "";
                if (!val.startsWith("http")) {
                    return `https://${val.replace(/^www\./, "")}`;
                }
                return val.replace(/^(https?:\/\/)www\./, "$1");
            })
            .optional()
            .or(z.literal(""))
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
                { message: "Use o formato: linkedin.com/in/seu-usuario" }
            )
            .transform((val) => {
                if (!val || val === "") return "";
                if (!val.startsWith("http")) {
                    return `https://${val.replace(/^www\./, "")}`;
                }
                return val.replace(/^(https?:\/\/)www\./, "$1");
            })
            .optional()
            .or(z.literal(""))
    ),
});

export const profileDetailsSchema = z.object({
    longBio: z.string().nullable(),
    skills: z.array(z.string()),
    educations: z.array(z.object({
        degree: z.string().min(1, "Course is required"),
        institution: z.string().min(1, "Institution is required"),
        startDate: z.string().min(1, "Start date is required"),
        endDate: z.string().nullable(),
    })),
});
