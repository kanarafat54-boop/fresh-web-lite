# Fresh Earning & Money — Master Map

Status: consolidated product and engineering inventory. This document distinguishes repository evidence, previously agreed product scope, and future concepts. It is not a claim that every earning method, payment rail, payout, card, or financial service is live.

## 1. Platform architecture

Fresh Web Lite is one unified platform with interconnected directorates. The platform Home recommends directorates, content, services, and activities; it is not a second wallet or a replacement for directorate interfaces.

- Earning surfaces: Fresh Flow, Fresh Create / Fresh Studio, Creator Studio, Fresh Communication, Fresh AI, Fresh Explore, and future commerce/services.
- Financial directorate: Fresh Wallet.
- Global financial experience: Fresh Global, inside the financial domain, with its own dedicated full-window experience.
- Shared identity and infrastructure: Fresh ID, permissions, notifications, search, APIs, security, and common platform services.
- Authoritative financial record: existing Fresh Treasury. Do not create a parallel wallet ledger.

Money flows from an earning surface to a verified receivable/settlement event, through the existing Treasury accounting boundary, and then to the user's available balance or an approved external payout rail. An analytics number, creator view count, draft invoice, payment request, sandbox settlement, or proposed conversion is not by itself spendable money.

## 2. Earning map

### A. Creator and audience economy — Fresh Flow / Creator Studio

Existing repository evidence:
- Creator Studio has Publish, Analytics, Distribute, Design, Audio, and Monetize tabs.
- Publishing workflows exist for posts, Shorts, and Long Videos; creator drafts and published media are loaded through repository functions.
- Creator analytics include post count, short count, views, likes, reposts, and followers.
- The creator interface labels monetization as a section, but a tab label alone does not establish a live revenue or payout programme.

Previously agreed product scope (planned until implemented and validated):
- Creator monetization and earnings dashboard.
- Transparent earnings breakdowns, eligibility, payout status, fees, and settlement history.
- Monetization across creator tools, analytics, live media, moderation, and reliability where the product offers paid services.
- Fresh Live monetization only after core authenticated host/viewer playback, chat, and termination flows are reliable.
- Future creator revenue types may include advertising share, paid subscriptions/memberships, paid content or access, tips/gifts, live-event support, sponsorship/brand campaigns, and commerce referrals. These are product candidates, not confirmed live programmes.

### B. Commerce and seller economy — Fresh Live Market

Previously discussed scope (planned):
- Seller storefronts and product catalogues.
- Product tags and affiliate links.
- Offers and live shopping.
- Orders, receipts, seller verification, and buyer protection.
- Seller revenue, platform commissions, refunds, cancellations, chargebacks, and settlement reporting.
- Payment and compliance integrations must be ready before real transactions are enabled.

### C. Services and independent business income

Arafat Digital Services is a separate real-world income initiative, not an already integrated Fresh payout programme. Recorded target: start with 100,000 UGX capital and build toward 25,000,000 UGX monthly revenue. Its positioning is “Turn ideas into systems.” Treat this as a business target, not current earnings.

Potential service revenue categories to track when actually offered:
- Digital setup and workflow/system building.
- Website and platform work.
- Content/media production and editing.
- Automation and AI-assisted services.
- Ongoing support, maintenance, and retainers.

Each service needs a clear offer, scope, price, delivery evidence, customer acceptance, invoice/receipt, and recorded payment before it is counted as revenue.

### D. Fresh AI and platform services

Future monetization candidates:
- Paid tiers or usage-based access to compute-intensive AI capabilities.
- Media generation and production services.
- Business/API access and automation services.
- Enterprise or developer services.

These require actual trained/available capabilities, usage metering, transparent pricing, cost controls, and billing. Do not sell unavailable or training-required capabilities.

### E. Platform-level revenue

Potential platform income streams:
- Advertising and sponsored placements with clear disclosure.
- Paid subscriptions and premium features.
- Seller/service commissions.
- Creator and event commerce fees.
- Business/API plans.
- Optional transaction or payout fees where disclosed and legally permitted.

Keep platform revenue distinct from creator/seller/customer funds and from owner funds.

## 3. Financial system map

### Existing Fresh Treasury

The repository defines the Treasury boundary and currently uses:
- `treasury_accounts`
- `ledger_transactions`
- `ledger_entries`
- `treasury_account_balances`
- `treasury_my_balances`
- `treasury_my_transactions`
- Existing RPCs such as `treasury_ensure_user_account`, `treasury_transfer_internal`, and `treasury_resolve_recipient`
- Server route: `/api/finance/treasury`

Architecture rules:
- Double-entry, balanced transactions and immutable journal entries.
- Integer minor units; no floating-point money arithmetic.
- Idempotency, server-side authorization, auditability, reconciliation, and controlled reversals.
- External providers are adapters, not the accounting source of truth.
- A balance is real only when trusted ledger and settlement controls record it.

### Fresh Wallet

Existing code surface:
- Treasury balance and transaction reads.
- Fresh Coin account initialization.
- Internal Fresh Coin recipient resolution and transfer initiation.
- Deposit/withdrawal payment request UI and request history.
- Currency-specific precision support.

Operational limitations:
- The UI and API surface do not prove external settlement is live.
- Current payment method catalogue explicitly describes its “connected” status as sandbox settlement; real processor APIs still need merchant credentials and production onboarding.
- A prior read-only audit found zero ledger transactions and zero ledger entries at that audit time, and no personal rows in the user-scoped balance/transaction views. Recheck before relying on current live state.

### Fresh Coin

- Separate accounting asset code: `FRESH`.
- The proposed display concept is `1 FRESH = $100 USD`.
- This is not a verified market price, guaranteed peg, reserve, backing, redeemable value, or spendable balance.
- Before any monetary issuance/redemption: approve asset/legal classification, supply controls, valuation method, reserve/custody arrangements if applicable, independent reconciliation/audit, risk disclosures, and jurisdiction-specific approvals.

### Fresh Global Money Pass and cards

- Digital Fresh Global Money Pass component and international architecture blueprint exist.
- Intended identity: FRESH emblem; cardholder Memphis Arafat; global-first design.
- Digital pass presentation is not an issued or usable payment card.
- Physical cards are a later capability requiring licensed issuer/programme manager, processor, card-scheme arrangements, certifications, fulfilment, and market approvals.
- Do not store CVV or PIN; use tokenized card credentials and approved capture/issuer flows.

## 4. Payment and payout connection catalogue

The code catalogues these rail families:
- Mobile money: M-Pesa, Airtel Money, MTN MoMo, Tigo/Mixx, Orange Money, Wave.
- Banks: local EFT/ACH, SEPA, SWIFT.
- Cards: Visa/Mastercard via processor.
- Digital wallets: PayPal, Apple Pay, Google Pay.
- Crypto on-chain: BTC, ETH, USDT, USDC.
- Instant account-to-account rails: e.g. UPI, Pix, FPS.
- Agent/cash and USSD banking.

These are catalogued integration targets. Region, currency, direction, provider contract, credentials, licensing, production status, and operational availability must be checked independently per method. A code catalogue entry is not proof of a live provider connection.

## 5. Current engineering work and status

- PR #264: Fresh Global Money Pass presentation and international architecture work; earlier conversation recorded it as merged. Verify current main history before relying on this as deployment proof.
- PR #267: Fresh Global / Wallet full-window styling; merge commit previously verified as `468f4ccf228083eb831276ec85768b580323b49d`.
- PR #268: currency-specific Treasury precision. Merged in this work session as `2ac066d3019a012a440932c8658893ec3704237c`. Its CI checks were all completed successfully before merge; Supabase Preview was skipped. This changes precision handling, not live balances or external payment connectivity.

## 6. Controls required before real money

- Fresh ID authentication, account ownership, MFA/step-up verification, device trust.
- Server-side authorization; no client-side minting or privileged ledger writes.
- Double-entry ledger, idempotency, immutable audit history, reconciliation and safe reversals.
- KYC/KYB, AML/sanctions screening, fraud monitoring, transaction limits and suspicious activity workflows as applicable.
- Provider webhook signature verification, replay protection, settlement matching and exception queues.
- Clear fees, FX rates, refunds, chargebacks, disputes, receipts and customer support.
- Country-by-country legal and licensing review, privacy and consumer disclosures.
- Separate sandbox and production environments, operational alerts, incident response and tested recovery.

## 7. Delivery sequence

1. Finish the read-only inventory of Treasury schema, RPC privileges, RLS, payment request lifecycle, and API routes.
2. Validate the Wallet experience against actual authenticated Treasury views; do not display fabricated or assumed balances.
3. Complete the Fresh Global digital pass presentation without implying card issuance.
4. Define revenue events and settlement contracts for each earning surface (creator, commerce, services, AI, subscriptions, ads).
5. Add auditable revenue allocation and creator/seller payable accounting using the existing Treasury model.
6. Implement payout eligibility, holds, fees, refunds, disputes, tax/reporting and reconciliation.
7. Integrate one approved Uganda payment provider in production after credentials, contracts, compliance and security review.
8. Expand payment rails and markets one country/corridor at a time.
9. Only then add issuer-backed virtual cards and later physical cards.

## 8. Status vocabulary

Use these labels in future project tracking:
- **Implemented**: code exists and its tests pass.
- **Integrated**: connected to the real authoritative backend and verified end-to-end.
- **Sandbox**: test-only settlement; never count as real customer funds.
- **Planned**: approved product scope without completed implementation.
- **Concept**: idea or design direction not yet approved for production.
- **Blocked**: dependent on credentials, provider, legal approval, model readiness, or another prerequisite.

Never convert a planned or sandbox feature into a live earning claim.
