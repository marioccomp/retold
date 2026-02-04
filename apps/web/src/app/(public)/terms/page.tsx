import { Metadata } from "next";
import { getDictionary } from "@/src/i18n/server";

export const metadata: Metadata = {
    title: "Termos de Serviço | Retold",
    description: "Leia os Termos de Serviço do Retold e entenda seus direitos e responsabilidades ao usar nossa plataforma.",
};

export default async function TermsPage() {
    const dict = await getDictionary();

    return (
        <div className="bg-white min-h-screen py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold text-gray-900 tracking-tight sm:text-5xl mb-4">
                        {dict.legal.terms.title}
                    </h1>
                    <p className="text-lg text-gray-600">
                        {dict.legal.updated_at.replace("{date}", new Date().toLocaleDateString('pt-BR'))}
                    </p>
                </div>

                <div className="prose prose-lg prose-emerald max-w-none text-gray-600">
                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">{dict.legal.terms.intro_title}</h2>
                        <p>{dict.legal.terms.intro_text}</p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">{dict.legal.terms.usage_title}</h2>
                        <p className="mb-4">{dict.legal.terms.usage_text}</p>
                        <ul className="list-disc pl-6 space-y-2">
                            {dict.legal.terms.usage_list.map((item: string, index: number) => (
                                <li key={index}>{item}</li>
                            ))}
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">{dict.legal.terms.content_title}</h2>
                        <p>{dict.legal.terms.content_text}</p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">{dict.legal.terms.termination_title}</h2>
                        <p>{dict.legal.terms.termination_text}</p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">{dict.legal.terms.liability_title}</h2>
                        <p>{dict.legal.terms.liability_text}</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">{dict.legal.terms.changes_title}</h2>
                        <p>{dict.legal.terms.changes_text}</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
