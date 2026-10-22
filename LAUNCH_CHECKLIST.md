# BaselineKits Launch Checklist

This project has a Next.js frontend, an Express API, Supabase for database and image storage, and Stripe Checkout. Vercel Services can deploy the frontend and API in one Vercel project, with GoDaddy managing the domain and DNS.

## 0. Prepare the GitHub version

- The launch application state was published to `main` in commit `eb37e68` and deployed by Vercel.
- This checkout may still contain unrelated local files and edits. Do not use `git add .` or blindly commit every file.

## 1. Deploy the frontend and API

- Import the repository into Vercel and keep the project root at the repository root (`.`), where `vercel.json` lives. The Services configuration builds `frontend` as the public Next.js storefront and `backend` as the Express API.
- The public `/api/*` rewrite routes requests to the API service; all other paths route to the storefront. The frontend defaults to the same-origin `/api` path.
- Configure `ADMIN_SECRET`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `FRONTEND_URL` in Vercel's server-side environment variables. Include the Vercel project URL for initial testing, then both domain origins; for example `FRONTEND_URL=https://<project>.vercel.app,https://baselinekits.com,https://www.baselinekits.com`.
- Set `GOOGLE_MAPS_API_KEY` for Google address autocomplete. Do not commit `.env` files or expose server-side secrets as `NEXT_PUBLIC_` variables.
- The canonical domain is `https://www.baselinekits.com`; `https://baselinekits.com` redirects to it. Both storefront and API health have been verified.
- Use `vercel dev` to run and test all services locally with Vercel's routing configuration.

## 2. Connect the GoDaddy domain

- Add both `baselinekits.com` and `www.baselinekits.com` to the Vercel project, then choose one as the primary domain and redirect the other to it.
- In GoDaddy DNS, enter the exact records Vercel supplies. Record types and targets depend on the Vercel project; do not guess them.
- Configure the apex domain and `www` consistently, and choose which one redirects to the canonical storefront URL.
- Wait for DNS and HTTPS certificate provisioning, then verify the storefront and API health endpoint over HTTPS.

## 3. Set production environment variables

Backend:

- `FRONTEND_URL` must contain every allowed storefront origin, comma-separated if there is more than one (for example, the canonical `www` and apex origins).
- `SUPABASE_URL` and `SUPABASE_KEY` must be configured server-side. Use the server-side service-role credential only on the backend; never expose it as a `NEXT_PUBLIC_` variable.
- Set strong, unique `JWT_SECRET` and `ADMIN_SECRET` values.
- Start with Stripe test-mode `STRIPE_SECRET_KEY` and test webhook signing secret. Switch both to live-mode values only after the complete test-mode flow passes.
- Set `GOOGLE_MAPS_API_KEY` if Google address autocomplete is enabled. Restrict the key to the required API and usage; keep it server-side.

Keep staging and production credentials separate. The frontend uses the same-origin `/api` rewrite, and backend allowed origins must match the deployed HTTPS storefront origins exactly.

## 4. Verify Supabase

- Apply the current schema and required migrations from `docs/database-schema.sql` to the intended production Supabase project.
- For an existing database, do not blindly rerun the full schema file; apply only migrations that have not already been run.
- `docs/migrations/20261015_recommendation_config.sql` and `docs/migrations/20261016_launch_schema_compat.sql` have been applied to the current Supabase project.
- Apply `docs/migrations/20261022_education_content.sql` to Supabase before deploying the admin Education manager (`/admin/education`); it creates and seeds the Education tables.
- Confirm required tables, policies, quiz content, products, kits, and recommendation data are present and correct.
- Create the `product-images` Storage bucket and verify its access settings support public product images and authorized admin uploads.
- Confirm the backend uses the correct production project and a server-only key.
- Take a recoverable backup before importing or changing production catalog data.
- Vercel service instances do not provide durable shared application-file storage. Recommendation weights now use the Supabase table from the migration above.
- The admin image-upload endpoint is limited to 4 MB to stay below Vercel's function request-body limit. Larger images must be resized before uploading.

## 5. Configure Stripe

- Complete Stripe business, payout, and tax settings as applicable to the business.
- Stripe Tax integration is implemented but disabled by default. Determine registration obligations with a tax professional, enable Stripe Tax in test mode, configure tax registrations and appropriate product/shipping tax codes, and set backend `STRIPE_TAX_ENABLED=true` only after those settings are ready. Do not enable live payments until tax behavior and obligations are reviewed.
- After the domain is connected and HTTPS is ready, configure the Stripe test webhook endpoint at `https://<canonical-domain>/api/webhooks/stripe` for `checkout.session.completed`; put its test signing secret in `STRIPE_WEBHOOK_SECRET`.
- Use Stripe test mode first. Verify the successful checkout, cancellation, webhook delivery, and resulting paid order status before enabling live mode.
- The test webhook and a successful Stripe test checkout have been reported working. Before live mode, confirm the Stripe test event marks the order paid and test a cancellation.
- Confirm the order amount and line items are correct for both normal kit checkout and any supported customizations.
- The site collects a shipping address, and Stripe Checkout collects it again when Stripe Tax is enabled so it can calculate tax from the destination. The webhook saves Stripe's paid total and tax amount to the order.
- Test Stripe Tax in test mode with addresses in jurisdictions where the business is registered and where it is not; verify the tax, shipping charge, total, webhook, and stored order amounts before live mode.

## 6. Complete customer-facing policies and operations

- Replace all draft placeholders in the Terms of Use and Privacy Policy, including business identity, contact details, shipping, returns, refunds, data retention, and customer privacy requests.
- Have the policies reviewed for the business and the regions where it will sell. The current site explicitly labels both policies as drafts; do not launch paid checkout with unfinished policy text.
- Current draft terms describe U.S.-only shipping, $14.95 shipping below a $300 merchandise subtotal and free shipping at $300 or more, variable order processing estimates, cancellations before fulfillment begins, and the return/refund rules provided by the business. They remain drafts pending review.
- Shippo live rate quotes are not connected yet. Checkout currently uses the fixed shipping policy above; decide package dimensions before adding live rates. Pirate Ship does not offer an API for checkout rate quotes.
- Confirm required Terms acceptance is recorded with each order and the optional marketing opt-in stays separate.
- Configure `RESEND_API_KEY`, `EMAIL_FROM`, `CONTACT_EMAIL`, and `PUBLIC_SITE_URL` in the backend environment. Verify the sending domain in Resend and use `BaselineKits <info@baselinekits.com>` only after the domain is authorized.
- Transactional email sends verification and password-reset links for accounts, a welcome message after email verification, contact-form submissions to `CONTACT_EMAIL`, and order confirmations after Stripe marks an order paid. Apply `docs/migrations/20261017_email_verification_password_reset.sql` to Supabase before deploying these authentication changes, then verify each email flow before launch.
- Marketing email is not sent by this integration. The app records optional marketing consent, but a marketing provider, unsubscribe handling, and compliant mailing-list workflows must be implemented separately before sending promotional email.
- Define how orders will be fulfilled, shipped, tracked, refunded, and supported. Confirm the published catalog reflects actual stock and prices.

## 7. Run a production-like smoke test

- Test account registration, sign-in, sign-out, and account-required checkout.
- Test the public Kits and Products pages, hidden-product behavior, kit detail pages, quiz recommendations, cart totals, and address autocomplete.
- Test admin sign-in and the intended product, kit, quiz, image-upload, and order-management workflows.
- Place a Stripe test-mode order with a real test address; verify the database order, Stripe webhook, order status, and customer success page.
- Confirm the site and API work from the custom domain, with no localhost URLs or browser console/network errors.
- Test on mobile and desktop, and verify navigation, contact details, policy links, and page metadata.

## 8. Launch and monitor

- Take a final database and catalog backup.
- Switch Stripe to live credentials only after the test-mode flow passes.
- Verify the live webhook signing secret and the exact production domains in `FRONTEND_URL`.
- Monitor API logs, Stripe webhook deliveries, Supabase errors, and the first orders closely.
- Keep a documented rollback path and retain a way to disable checkout if payment or fulfillment processing fails.
