# Fresh Global Money — International Product Architecture

Status: product and engineering blueprint; not a claim of licensing, stored value, live exchange pricing, or card issuance.

## Product commitment

Fresh Global Money is designed as a global-first financial platform. Uganda is the initial launch market and operational proving ground, not a geographic limit. The digital pass launches before physical cards; physical card programmes are a planned later capability and must be supported by the architecture from the beginning.

The visual identity of the pass must remain consistent with the approved Fresh reference: black base, purple Fresh emblem, electric-blue global motif, gold accents, cardholder Memphis Arafat, and Fresh Coin identity.

## Product surfaces

- Fresh ID: account identity, authentication, recovery, device trust, and step-up verification.
- Fresh Wallet: account balances, transaction history, deposits, withdrawals, and transfer initiation.
- Fresh Coin: a separately governed asset/accounting unit with explicit issuance, supply, valuation, redemption, and reserve rules before any real-money representation.
- Fresh Global Pass: digital presentation and, only after issuer/processor integration and compliance approval, tokenized payment credentials.
- Physical Fresh Cards: future virtual-to-physical card lifecycle, issuer processing, personalization, fulfilment, activation, freeze/unfreeze, replacement, and dispute support.
- Payment connections: country-specific banks, mobile-money operators, payment service providers, card schemes, and cross-border providers through approved adapters.

## Global-first architecture requirements

1. Country and jurisdiction configuration must be data-driven; do not hard-code Uganda as the only country.
2. Support ISO 4217 fiat currency codes and explicit decimal precision per currency. Never assume every currency has two decimal places.
3. Keep Fresh Coin units and fiat currency balances distinct. A display conversion is not a balance, exchange guarantee, reserve claim, or redemption promise.
4. Use a double-entry ledger with immutable journal entries, idempotency keys, transaction state transitions, reconciliation, and auditable reversals.
5. Payment adapters must be isolated by provider, country, capability, and environment (sandbox/production).
6. Store timestamps in UTC and render local time by user/account preference.
7. Build payment authorization, limits, fraud checks, sanctions/AML screening hooks, dispute handling, and audit trails as server-side controls.
8. Keep sensitive cardholder data out of the application database wherever possible; use issuer/processor tokenization and hosted/approved capture flows. Do not store CVV or PIN data.
9. Support multi-language, accessible mobile-first UX, and localization of number/date formats.
10. Add observability, reconciliation reports, operational controls, incident response, and tested recovery procedures.

## Physical card readiness

The data model and API boundaries should anticipate:
- card programme and issuer references;
- tokenized card identifiers (not raw PAN/CVV);
- virtual/physical form factor;
- lifecycle status (created, pending, active, frozen, expired, replaced, closed);
- shipping address and fulfilment tracking with strict access controls;
- activation, freeze/unfreeze, replacement, and lost/stolen workflows;
- cardholder consent, disclosures, fees, limits, and regional availability.

Do not manufacture, print, ship, or advertise a usable physical card until a licensed issuer/programme manager, processor, scheme arrangements, required certifications, and market approvals are in place.

## Fresh Coin value statement

The proposed design label "1 FRESH = $100 USD" is a product concept only. It must not be represented as a live market price, guaranteed peg, backed reserve, redeemable value, or spendable customer balance. Before any monetary issuance or redemption, publish and approve the asset model, legal classification, supply controls, reserve/custody arrangements (if applicable), independent reconciliation/audit, risk disclosures, and jurisdiction-specific regulatory approvals.

## Rollout sequence

1. Complete and validate the digital pass presentation inside the existing Fresh Wallet.
2. Establish Fresh ID ownership, wallet account model, ledger invariants, and safe balance display.
3. Implement internal ledger transfers and test-only payment adapter contracts.
4. Pilot compliant payment integrations in Uganda after provider onboarding and approvals.
5. Add country/currency configuration and expand market-by-market after legal, operational, and partner readiness.
6. Add issuer-backed virtual cards.
7. Add physical card issuance, fulfilment, activation, servicing, and support.

## Definition of done

No stage is complete based on UI appearance alone. Require automated tests, security review, migration/reconciliation checks, mobile browser validation, production deployment verification, and documented operational ownership. Keep sandbox and production clearly separated.
