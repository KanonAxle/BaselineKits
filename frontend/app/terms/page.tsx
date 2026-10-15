import Link from 'next/link';
import Navbar from '../components/Navbar';

const sections = [
  {
    title: '1. Accounts',
    body: 'You must provide accurate account information and keep your password secure. You are responsible for activity carried out through your account. Contact us promptly if you believe your account has been accessed without permission.',
  },
  {
    title: '2. Products, kits, and orders',
    body: 'We make reasonable efforts to show product details, kit contents, prices, and availability accurately. Product availability may change. An order request is not accepted until we confirm it. If we cannot fulfill an accepted order or a listed price is materially incorrect, we will contact you before charging or arrange an appropriate correction.',
  },
  {
    title: '3. Payment',
    body: 'Payments are processed by Stripe. We do not ask you to provide full payment-card details directly to BaselineKits. Stripe’s terms and privacy practices also apply to its payment services.',
  },
  {
    title: '4. Shipping, returns, and cancellations',
    body: 'We currently ship to addresses in the United States only. Shipping is $14.95 for orders with a merchandise subtotal below $300 and free for orders with a merchandise subtotal of $300 or more. Once Stripe Tax is configured, any applicable sales tax will be calculated at checkout based on the shipping destination. Order processing time varies with order size and product availability and may exceed two weeks. We will email an estimated processing and shipping timeframe after an order is placed; estimates are not guarantees, and we will contact you if we become aware of a material delay. You are responsible for providing a complete and accurate shipping address. To request cancellation, contact info@baselinekits.com before fulfillment work begins; we will issue a full refund for an order we are able to cancel at that stage. Once fulfillment work has begun, cancellation may no longer be possible. To request a return, email info@baselinekits.com within 30 days after delivery. Change-of-mind returns must be unopened and unused; the customer pays return shipping, and an eligible refund is subject to a 10% restocking fee on the returned item price. We provide return instructions and the return address by email. For items that arrive damaged or incorrect, contact us promptly; we waive the restocking fee and return shipping cost. Approved refunds are issued to the original payment method after we receive and inspect the return. Nothing in these terms limits rights that cannot legally be waived.',
  },
  {
    title: '5. Preparedness information',
    body: 'Products and kits are intended to support preparedness. They are not a guarantee of safety, rescue, survival, or uninterrupted operation, and they are not a substitute for professional medical advice, training, or instructions supplied with a product. Check product limitations, expiration dates, and safe-use instructions before use.',
  },
  {
    title: '6. Acceptable use and content',
    body: 'Do not misuse the site, interfere with its operation, attempt unauthorized access, or use it in violation of applicable law. Site text, design, and other materials may not be copied or redistributed except as allowed by law or with permission.',
  },
  {
    title: '7. Changes and contact',
    body: 'We may update these terms by publishing a revised version. The effective date and version should be updated when the terms change. Questions about orders or these terms: BaselineKits at info@baselinekits.com.',
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />
      <article className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-8 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-amber-200">
          <p className="font-bold uppercase tracking-widest text-sm">Draft for business and legal review</p>
          <p className="mt-1 text-sm text-amber-100/80">
            Review these draft policies for the business and applicable consumer-protection requirements before treating them as final.
          </p>
        </div>
        <h1 className="text-3xl font-extrabold uppercase tracking-wide">Terms of Use</h1>
        <p className="mt-2 text-sm text-stone-500">Draft version 2026-10-15. Effective date to be confirmed.</p>
        <p className="mt-6 text-stone-300 leading-relaxed">
          These draft terms describe use of the BaselineKits website and purchases made through it. They need review and completion for the business and the places where it operates.
        </p>
        <div className="mt-8 space-y-7">
          {sections.map(section => (
            <section key={section.title}>
              <h2 className="text-lg font-bold text-orange-400">{section.title}</h2>
              <p className="mt-2 text-stone-300 leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>
        <Link href="/privacy" className="mt-10 inline-block text-orange-400 underline">Read the draft Privacy Policy</Link>
      </article>
    </main>
  );
}
