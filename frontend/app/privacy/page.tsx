import Link from 'next/link';
import Navbar from '../components/Navbar';

const sections = [
  {
    title: 'Information handled',
    body: 'Depending on how you use the site, this may include account name and email, password credentials stored in protected form, phone number and addresses you provide, order and kit details, sizing selections, quiz responses, and customer-support messages. The site also stores cart and sign-in data in your browser’s local storage.',
  },
  {
    title: 'Payments and service providers',
    body: 'Stripe processes checkout payments. When you use address autocomplete, the address text you enter and the selected address are sent to Google Places. We may also use service providers for hosting and data storage, Smarty address verification if that feature is re-enabled, shipping, and site operations. Those providers receive information needed to perform their services. Confirm the provider list and applicable international data transfers before publishing a final policy.',
  },
  {
    title: 'How information is used',
    body: 'Information is used to create and secure accounts, prepare and fulfill orders, provide order and account communications, support sizing and product-related notices, respond to requests, prevent misuse, and operate or improve the site. Account email is used for necessary purchase and service messages.',
  },
  {
    title: 'Optional marketing choice',
    body: 'At checkout you may separately opt in to product and offer emails. This choice is optional and does not affect checkout. The current checkout records your choice with the order; no mailing-list delivery provider is configured by this change. Before sending marketing, connect an email provider and provide a working unsubscribe method.',
  },
  {
    title: 'Retention, security, and your choices',
    body: 'We use reasonable safeguards, but no online service can guarantee absolute security. Complete this draft with the business’s retention periods, data-access/deletion request process, and any rights required by applicable privacy laws. Contact: [insert privacy contact email and business legal name].',
  },
  {
    title: 'Updates',
    body: 'This draft should be revised when the site’s data practices change. Publish an effective date and explain how material changes will be communicated before treating this as a final policy.',
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />
      <article className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-8 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-amber-200">
          <p className="font-bold uppercase tracking-widest text-sm">Draft for business and legal review</p>
          <p className="mt-1 text-sm text-amber-100/80">
            This draft includes items that still need confirmation. Complete the bracketed details and review it before publication as a final policy.
          </p>
        </div>
        <h1 className="text-3xl font-extrabold uppercase tracking-wide">Privacy Policy</h1>
        <p className="mt-2 text-sm text-stone-500">Draft version 2026-10-12. Effective date to be confirmed.</p>
        <p className="mt-6 text-stone-300 leading-relaxed">
          This draft explains information BaselineKits may handle when you browse the site, create an account, or place an order.
        </p>
        <div className="mt-8 space-y-7">
          {sections.map(section => (
            <section key={section.title}>
              <h2 className="text-lg font-bold text-orange-400">{section.title}</h2>
              <p className="mt-2 text-stone-300 leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>
        <Link href="/terms" className="mt-10 inline-block text-orange-400 underline">Read the draft Terms of Use</Link>
      </article>
    </main>
  );
}
