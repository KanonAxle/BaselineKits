import Link from 'next/link';
import Navbar from '../components/Navbar';

const sections = [
  {
    title: '1. Business identity and scope',
    body: 'BaselineKits is a DBA of Harrington Innovations LLC. These Terms of Use govern your access to and use of the BaselineKits website, product information, kit recommendations, account features, and purchase transactions. By visiting, creating an account, or ordering through the site, you agree to these terms and any policies we link from the site, including the Privacy Policy.',
  },
  {
    title: '2. Accounts',
    body: 'You must provide accurate account information and keep your password secure. You are responsible for all activity conducted through your account. If you believe your account has been accessed without authorization, contact us immediately at info@baselinekits.com. We may suspend or terminate access to the site when necessary to protect the security of the service or comply with legal obligations.',
  },
  {
    title: '3. Products, kits, and orders',
    body: 'We make reasonable efforts to describe products, kit contents, pricing, and availability accurately. Product availability, pricing, and configuration options may change without notice. A purchase is not complete until we accept the order and any required payment is authorized. If we cannot fulfill an order, if a price is materially incorrect, or if a product is unavailable after an order is submitted, we may contact you to confirm whether to proceed, cancel the order, or offer a suitable replacement.',
  },
  {
    title: '4. Payment and checkout',
    body: 'Payments are processed through Stripe. We do not store your full credit card details on our servers. Stripe’s terms and privacy practices apply to the payment process. By placing an order, you represent that you are authorized to use the selected payment method and that all information you provide is accurate. In addition to the purchase price, applicable sales tax and shipping fees may be charged at checkout as described on the site.',
  },
  {
    title: '5. Shipping, taxes, and delivery',
    body: 'We currently ship within the United States only. Shipping is $14.95 for merchandise subtotals below $300 and free for merchandise subtotals of $300 or more, unless a different shipping or tax policy is stated for a specific order. Applicable sales tax will be calculated based on the shipping destination and the settings in effect at checkout. Order processing times vary based on product availability, customization, and order volume. We will provide an estimate when possible, but processing and shipping estimates are not guarantees and may change. We are not liable for delays caused by weather, carrier disruptions, inventory shortages, acts of third parties, or other circumstances beyond our reasonable control.',
  },
  {
    title: '6. Cancellations, returns, and refunds',
    body: 'To request cancellation, contact us at info@baselinekits.com before fulfillment begins. If we are able to cancel the order before work starts, we will refund the full purchase price. Once fulfillment has begun, cancellations may no longer be possible. If you receive a damaged, incorrect, or incomplete item, contact us promptly at info@baselinekits.com and we will help resolve the issue. You may return unopened and unused items within 30 days of delivery, subject to return shipping costs and a 10% restocking fee on the returned item price for change-of-mind returns. We may require a return authorization and may provide a return address by email. Approved refunds will be issued to the original payment method after we receive and inspect the return. We do not provide returns for products that have been used, opened, or damaged by the customer beyond normal handling. Nothing in these terms limits consumer rights that cannot be waived under applicable law.',
  },
  {
    title: '7. Preparedness information and product use',
    body: 'Our products and kits are intended to support preparedness and personal readiness. They are not guarantees of safety, rescue, survival, uninterrupted service, or the ability to avoid all hazards. Product instructions, warnings, and safety information must be reviewed before use. Some items may require training, maintenance, replacement, or professional guidance. We are not a medical professional, emergency responder, or insurer, and the information on the site is informational only and not a substitute for professional advice.',
  },
  {
    title: '8. Acceptable use and intellectual property',
    body: 'You may use the site for lawful purposes only. You may not interfere with the operation of the site, attempt unauthorized access, misuse account credentials, disclose restricted information, or use the site to transmit harmful, deceptive, unlawful, or abusive content. All text, graphics, product descriptions, images, brand names, trademarks, and site design are the property of BaselineKits or its licensors and may not be copied, redistributed, republished, or used without written permission except as allowed by applicable law.',
  },
  {
    title: '9. Disclaimers and limitation of liability',
    body: 'The site and all products, content, and recommendations are provided on an “as is” and “as available” basis. To the maximum extent permitted by law, BaselineKits, Harrington Innovations LLC, and their affiliates, officers, employees, and agents disclaim all warranties, express or implied, including warranties of merchantability, fitness for a particular purpose, non-infringement, and reliability. We do not guarantee that the site will be error-free, uninterrupted, or free from external disruption. To the maximum extent permitted by law, BaselineKits and Harrington Innovations LLC shall not be liable for indirect, incidental, consequential, or punitive damages, including loss of use, lost profits, or loss of data, arising from the use of the site or products, even if advised of the possibility of such damages. Our aggregate liability for any claim arising from the site or a product order is limited to the amounts actually paid by you for the applicable order, unless applicable law provides a different remedy.',
  },
  {
    title: '10. Privacy and cookies',
    body: 'Our Privacy Policy explains what information we collect, how we use it, and how we handle contact, payment, and site analytics information. We use cookies, local browser storage, and analytics tools to keep the site functioning, support your account experience, and understand usage patterns. By using the site, you consent to those practices as described in our Privacy Policy, subject to your browser settings and applicable law.',
  },
  {
    title: '11. Governing law and updates',
    body: 'These terms are governed by the laws of the State of Indiana, without regard to conflict-of-law principles. We may update or revise these terms from time to time by publishing a revised version on the site. The date of the most recent revision appears on this page. Continued use of the site after a revision becomes effective constitutes your acceptance of that revision. Questions about these terms can be sent to info@baselinekits.com.',
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navbar />
      <article className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-extrabold uppercase tracking-wide">Terms of Use</h1>
        <p className="mt-2 text-sm text-stone-500">Effective October 19, 2026.</p>
        <p className="mt-6 text-stone-300 leading-relaxed">
          These Terms of Use govern your use of the BaselineKits website, account features, product information, kit recommendations, and purchase transactions. BaselineKits is a DBA of Harrington Innovations LLC, and by using the site or placing an order, you agree to these terms and our Privacy Policy.
        </p>
        <div className="mt-8 space-y-7">
          {sections.map(section => (
            <section key={section.title}>
              <h2 className="text-lg font-bold text-orange-400">{section.title}</h2>
              <p className="mt-2 text-stone-300 leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>
        <Link href="/privacy" className="mt-10 inline-block text-orange-400 underline">Read the Privacy Policy</Link>
      </article>
    </main>
  );
}
