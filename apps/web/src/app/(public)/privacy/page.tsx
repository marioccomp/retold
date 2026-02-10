import { Metadata } from "next";
import { getDictionary } from "@/src/i18n/server";

export const metadata: Metadata = {
  title: "Política de Privacidade | Retold",
  description:
    "Entenda como o Retold coleta, usa e protege suas informações pessoais e nossas políticas de publicidade.",
};

export default async function PrivacyPage() {
  const dict = await getDictionary();

  return (
    <div className="bg-white min-h-screen py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight sm:text-5xl mb-4">
            {dict.legal.privacy.title}
          </h1>
          <p className="text-lg text-gray-600">
            {dict.legal.updated_at.replace("{date}", new Date().toLocaleDateString("pt-BR"))}
          </p>
        </div>

        <div className="prose prose-lg prose-emerald max-w-none text-gray-600">
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {dict.legal.privacy.collection_title}
            </h2>
            <p>{dict.legal.privacy.collection_text}</p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {dict.legal.privacy.usage_title}
            </h2>
            <p className="mb-4">{dict.legal.privacy.usage_text}</p>
            <ul className="list-disc pl-6 space-y-2">
              {dict.legal.privacy.usage_list.map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {dict.legal.privacy.sharing_title}
            </h2>
            <p>{dict.legal.privacy.sharing_text}</p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {dict.legal.privacy.private_repos_title}
            </h2>
            <p>{dict.legal.privacy.private_repos_text}</p>
          </section>

          <section className="mb-12 bg-emerald-50 p-8 rounded-2xl border border-emerald-100">
            <h2 className="text-2xl font-bold text-emerald-900 mb-4">
              {dict.legal.privacy.ads_title}
            </h2>
            <p className="text-emerald-800 mb-4">{dict.legal.privacy.ads_text}</p>
            <ul className="list-disc pl-6 space-y-2 text-emerald-800">
              {dict.legal.privacy.ads_list.map((item: any, index: number) => (
                <li key={index}>
                  <strong>{item.title}</strong> {item.text}
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {dict.legal.privacy.security_title}
            </h2>
            <p>{dict.legal.privacy.security_text}</p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {dict.legal.privacy.contact_title}
            </h2>
            <p>{dict.legal.privacy.contact_text}</p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {dict.legal.privacy.ai_processing_title}
            </h2>
            <p>{dict.legal.privacy.ai_processing_text}</p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {dict.legal.privacy.lgpd_rights_title}
            </h2>
            <p>{dict.legal.privacy.lgpd_rights_text}</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {dict.legal.privacy.cookies_title}
            </h2>
            <p>{dict.legal.privacy.cookies_text}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
