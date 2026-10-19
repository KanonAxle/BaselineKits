import Link from 'next/link';
import Navbar from '../components/Navbar';

const sections = [
  {
    title: '1. Who we are',
    body: 'BaselineKits is a DBA of Harrington Innovations LLC. We operate the website and related services used to help customers evaluate, order, and manage preparedness kits and related products. This Privacy Policy explains how we collect, use, disclose, and protect information when you visit our site, create an account, contact us, or place an order.',
  },
  {
    title: '2. Information we collect',
    body: 'Depending on how you use the site, we may collect your name, email address, phone number, billing and shipping addresses, order history, product selections, quiz responses, support messages, and account information. We also store login and cart-related data in your browser and in our own application systems as needed to provide the service. When you interact with address autocomplete, the address text and selected address details may be sent to Google to complete address entry. When you contact us or place an order, we may collect the content of your message and any information needed to respond to you.',
  },
  {
    title: '3. How we use information',
    body: 'We use personal information to create and maintain accounts, process and fulfill orders, communicate about order status, respond to customer support requests, maintain security, prevent fraud, operate the website, improve the customer experience, comply with legal obligations, and provide product or sizing-related notices. We may also use information to maintain records of orders, support account access, and maintain the integrity of the service.',
  },
  {
    title: '4. Service providers and disclosures',
    body: 'We rely on third-party service providers to operate parts of the business, including payment processing with Stripe, transactional email delivery with Resend, web hosting with Vercel, data storage with Supabase, and location assistance through Google address services. These providers receive only the information needed to provide their services. We may also disclose information when required by law, court order, or legal process, or when necessary to protect the rights, safety, or property of BaselineKits, our customers, or others.',
  },
  {
    title: '5. Cookies, analytics, and local storage',
    body: 'We use cookies, browser local storage, and analytics tools to keep the site functioning, remember your preferences, support account access, preserve cart activity, and better understand traffic and usage patterns. Analytics tools may collect general information such as page visits, device and browser details, referring pages, and aggregate interaction data. If you do not want cookies or analytics, you may adjust your browser settings, although some features of the site may not function properly if cookies are blocked. We may update our analytics practices as the site evolves.',
  },
  {
    title: '6. Email and marketing communications',
    body: 'Transactional email is used for account verification, password reset, order confirmations, and customer support-related communication. We may also ask for separate consent to receive optional product or marketing emails. Any marketing communication will include a clear way to opt out and unsubscribe, and we will not send promotional email without a valid consent or lawful basis. If you opt out, we will stop marketing messages but may still send transactional messages needed to manage your account or order.',
  },
  {
    title: '7. Data retention, security, and your choices',
    body: 'We use reasonable administrative, technical, and physical safeguards designed to protect information, but no system is completely secure. We retain information for as long as necessary to fulfill the purposes described in this policy, comply with legal obligations, resolve disputes, and maintain business records. You may contact us at info@baselinekits.com to ask about your information, request correction of inaccurate information, or request that we delete personal information where allowed by law. Some information may need to be retained to complete a transaction, protect against fraud, or satisfy legal recordkeeping requirements.',
  },
  {
    title: '8. Children and sensitive personal information',
    body: 'The site is intended for individuals who are at least 18 years of age or who otherwise have the capacity to enter into a contract in their jurisdiction. We do not knowingly collect personal information from children under the age of 13 without parental consent where required by law. We also ask that you not provide sensitive personal information beyond what is needed to complete the transaction or support request.',
  },
  {
    title: '9. International use',
    body: 'Unless otherwise stated, the site is intended for use in the United States. If you access the site from outside the United States, you are responsible for complying with local laws and for understanding that your information may be transferred to and processed in the United States, where our service providers and systems are located.',
  },
  {
    title: '10. Updates and contact',
    body: 'This Privacy Policy may be updated from time to time to reflect changes in our practices, services, or legal requirements. The effective date at the top of this policy indicates the most recent revision. Continued use of the site after an update becomes effective means you accept the updated policy. If you have questions or would like to exercise your rights, contact us at info@baselinekits.com.',
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />
      <article className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-extrabold uppercase tracking-wide">Privacy Policy</h1>
        <p className="mt-2 text-sm text-stone-500">Effective October 19, 2026.</p>
        <p className="mt-6 text-stone-300 leading-relaxed">
          This Privacy Policy explains how BaselineKits, a DBA of Harrington Innovations LLC, collects, uses, stores, and protects personal information when you use our website, create an account, place an order, or contact us.
        </p>
        <div className="mt-8 space-y-7">
          {sections.map(section => (
            <section key={section.title}>
              <h2 className="text-lg font-bold text-orange-400">{section.title}</h2>
              <p className="mt-2 text-stone-300 leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>
        <Link href="/terms" className="mt-10 inline-block text-orange-400 underline">Read the Terms of Use</Link>
      </article>
    </main>
  );
}
