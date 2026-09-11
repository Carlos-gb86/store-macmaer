# Macmaer — Legal, Checkout and Privacy Content Specification

> **Status:** Draft for implementation and pre-launch review  
> **Prepared:** 10 September 2026  
> **Purpose:** Source document for Codex to implement the legal/policy pages and related checkout behaviour for the new Macmaer e-commerce website.

## Important implementation note

This document is designed to make Macmaer's customer terms clear, internally consistent, and aligned with the main Swedish/EU consumer and data-protection requirements identified during the September 2026 review. It is not a substitute for a review by a Swedish consumer-law/privacy professional before launch, particularly because Macmaer sells internationally and mandatory consumer rules in a customer's country may also apply.

**Do not publish with placeholders unresolved.** Before production, replace all bracketed fields below and verify the actual suppliers/services used by the application.

Confirmed trader details:

- Legal trader: `Maria Botyan`, sole trader (`enskild näringsidkare`)
- Trading name: `Macmaer`
- Identification number: `19820627-4345`
- VAT registration number: `SE820627434501`
- Business address: `Trombongatan 22B, 421 51 Västra Frölunda, Sweden`
- Return address: same as the business address unless otherwise instructed when arranging a return
- Email: `info@macmaer.com`
- Customer service telephone: `072-874 87 56` (`+46 72 874 87 56` from outside Sweden)

These details should be easily and permanently accessible on the website (for example in the footer/contact/legal pages), not only hidden inside these Terms.

---

# 1. Terms of Sale and Website Use

**Last updated:** `[DATE OF LIVE ACTIVATION]`

These Terms of Sale and Website Use (the **“Terms”**) apply when you browse `macmaer.com`, place an order, or otherwise use services provided through the website.

Macmaer is operated by **Maria Botyan**, a sole trader (`enskild näringsidkare`) trading as **Macmaer**, established in Sweden, with identification number **19820627-4345** and VAT registration number **SE820627434501**. Our business address is **Trombongatan 22B, 421 51 Västra Frölunda, Sweden**. You can contact us at **info@macmaer.com** or **+46 72 874 87 56**.

Nothing in these Terms limits any mandatory rights that you have under applicable consumer law.

## 1.1 Who may place an order

By placing an order, you confirm that the information you provide is accurate and that you have legal capacity to enter into the purchase, or have any consent required from a parent or legal guardian.

Products on the website are primarily offered to consumers for personal use. If you wish to make a business or wholesale purchase, contact us so that any separate terms can be agreed where appropriate.

## 1.2 Product information and handmade variations

We aim to describe and photograph our products accurately. Macmaer products are handmade and small differences between individual items are normal. Unless a product page states otherwise:

- dimensions are approximate;
- placement of patterns, seams, knots and other handmade details may vary slightly;
- colours can appear differently because of lighting, photography, display calibration and screen settings; and
- natural or batch variations in materials may result in minor differences from photographs or samples.

These normal handmade or display-related variations do not remove any statutory rights you may have if a product is defective, unsafe or does not conform to the sales contract.

Product-specific care instructions, warnings, material information and intended-use information shown on the product page or supplied with the product form part of the product information and should be followed.

## 1.3 Prices, VAT and currencies

The product price shown by Macmaer is the retail selling price payable for that product in the currency selected on the website, excluding any separate shipping charge and any import charges that the checkout expressly states are not included.

Where VAT or another sales tax is legally chargeable by Macmaer, the applicable tax is included within the displayed product price unless the checkout expressly states otherwise. **A destination with a 0% Macmaer-collected VAT rate does not receive a reduction of the displayed retail product price.**

Example:

- A pillow displayed at **500 SEK** remains **500 SEK** for a Swedish customer; part of that amount is Swedish VAT where applicable.
- The same pillow remains **500 SEK** for a destination where Macmaer charges 0% VAT; no amount is deducted merely because no VAT is collected by Macmaer.

The site may allow prices and payment in SEK, EUR and USD. Converted prices may be rounded and may change before an order is placed as exchange rates or configured prices change. The **final amount and currency clearly displayed at checkout immediately before the customer places the order are controlling for that order**.

A bank, card issuer or payment service may impose its own currency-conversion or cross-border charges. Those charges are outside Macmaer's control and are not payments to Macmaer.

## 1.4 Obvious pricing and technical errors

We take reasonable steps to ensure prices and product information are correct. If an obvious pricing, stock or technical error is discovered before an order is accepted or fulfilled, we may contact you to explain the error and offer the choice, where appropriate, to proceed on the corrected terms or cancel the affected item/order for a full refund of amounts already paid for it.

Nothing in this section permits Macmaer to change the agreed price after a binding purchase merely because the sale later becomes less favourable to Macmaer, or otherwise to reduce mandatory consumer rights.

## 1.5 Placing an order and formation of the contract

Before the final order is submitted, the checkout must show the products ordered, material options/variants, destination, shipping method, product total, included/charged taxes where relevant, shipping charge and the final amount to pay. The customer must have an opportunity to correct input errors before placing the order.

The final checkout control must make it unambiguous that placing the order creates an obligation to pay (for example **“Place order and pay”** or another legally equivalent wording).

After an order is submitted, Macmaer will send an electronic acknowledgement/confirmation containing the order details and these contractual terms in a form the customer can retain.

Orders remain subject to genuine availability, successful payment, delivery restrictions and fraud/security checks. Macmaer may refuse or cancel an order for a legitimate reason, including inability to supply the product, a clearly erroneous price, suspected fraud, sanctions/legal restrictions, or inability to deliver to the stated destination. If payment has already been captured for an order that Macmaer cancels, the affected amount will be refunded without undue delay.

## 1.6 Payment

Available payment methods are displayed at checkout. Payments are processed by third-party payment providers, currently intended to include **Stripe**.

Macmaer does not store full payment-card numbers or card security codes. Payment providers may collect and process payment and fraud-prevention information under their own terms and privacy notices.

An order is not considered paid merely because a browser is redirected to a success page. The store should rely on confirmed server-side payment status from the payment provider.

## 1.7 Processing times

Current target processing times are:

- **Standard catalogue orders:** normally 2–4 business days before dispatch.
- **Genuinely custom/personalised orders:** normally 4–7 business days before dispatch, unless another lead time is stated on the product/order page.

These are estimates rather than guaranteed delivery dates. If a specific dispatch or delivery commitment is agreed for an order, that specific commitment applies.

## 1.8 Shipping and delivery

Macmaer ships from Sweden to the countries made available in the checkout. The list of available destinations may change.

Shipping cost is calculated at checkout according to the shipping destination and may also depend on package size, weight, order value and selected shipping service. The current reference range on the existing store is approximately **80–500 SEK per order**, but the amount shown at checkout is the applicable shipping price for the new store.

Macmaer's current policy provides **free domestic shipping within Sweden for orders above 500 SEK**. This threshold must be implemented as a configurable business rule, not hard-coded into policy logic, so that future changes can be reflected consistently on the site.

Shipments are normally sent with tracking where the selected service supports it.

Current estimated transit times after dispatch are:

- Sweden: **1–3 business days**
- EU destinations: **5–8 business days**
- Australia, Canada, Japan, New Zealand, South Korea and United States: **6–12 business days**

Other destinations should display an estimate at checkout or in the shipping information where available.

Transit estimates can be affected by carrier delays, public holidays, customs clearance, weather, strikes, border controls and other events outside Macmaer's reasonable control. Such events may affect estimates, but this does not limit any mandatory statutory remedy the customer has for delayed or failed delivery.

## 1.9 Risk during delivery, lost or damaged parcels

Where mandatory consumer law applies, Macmaer remains responsible for the goods during transport until the goods are delivered in the manner required by applicable law. A customer should contact **info@macmaer.com** promptly if a parcel is lost, damaged, incomplete, or shown as delivered but cannot be located so that Macmaer can investigate with the carrier.

The previous Macmaer wording stating categorically that package theft is not covered and cannot be replaced must **not** be reused as a blanket exclusion. Responsibility depends on whether legal delivery has occurred and on the facts of the case.

## 1.10 Incorrect addresses and unclaimed parcels

The customer is responsible for providing complete and accurate delivery information and should contact Macmaer immediately if an error is discovered.

If a shipment cannot be delivered or is returned because of an incorrect address supplied by the customer, failure to collect the parcel, or refusal of delivery for reasons not attributable to Macmaer, the customer may be responsible for the **actual reasonable additional shipping/return costs caused by that failure**, to the extent permitted by applicable law.

Failure to collect or refusal to accept a parcel does **not by itself** constitute a clear exercise of the statutory right of withdrawal. A customer wishing to withdraw should use the website withdrawal function or otherwise send Macmaer a clear withdrawal notice.

Macmaer will not impose an arbitrary penalty or automatically retain an unspecified “part of the order price”. Any permitted deduction must correspond to a legitimate cost or legal right and must not reduce mandatory consumer protections.

## 1.11 Customs, import VAT and other destination charges

For deliveries outside the EU, and in any other destination where local import charges may apply, customs authorities or carriers may charge import VAT, customs duties, brokerage/handling fees or similar charges.

**Unless the checkout explicitly states that a particular import charge is included and collected by Macmaer, these destination-country charges are not included in the Macmaer order total and are the recipient's responsibility.**

Macmaer cannot control customs decisions, local thresholds, clearance times or charges imposed by authorities or third-party carriers. Customers are responsible for checking local import restrictions and possible charges before ordering where this is important to them.

Refusing a parcel because import charges are due does not automatically remove responsibility for costs that Macmaer is legally entitled to recover, although mandatory withdrawal and consumer rights remain unaffected.

## 1.12 Right of withdrawal for distance purchases

For consumers who have a statutory right of withdrawal under Swedish/EU distance-selling law, the general withdrawal period is **14 days**. For goods, the period normally begins the day after the customer receives the goods (subject to the detailed rules applicable to split deliveries and other situations).

The customer does not need to give a reason.

To exercise the right in time, the customer must send a clear notice of withdrawal before the period expires. The customer may:

1. use the **online withdrawal function** provided on `macmaer.com`;
2. email **info@macmaer.com** with a clear statement; or
3. use the statutory/model withdrawal form made available on the site.

Macmaer must not require prior “approval” before a valid statutory withdrawal can be exercised.

### Mandatory online withdrawal function

Because the store concludes contracts online, Codex must implement a clearly accessible withdrawal function in accordance with the Swedish rules effective from **19 June 2026**. It must remain readily accessible during the withdrawal period and allow the customer to provide/confirm at least:

- customer name;
- information identifying the contract/order being withdrawn;
- the electronic means/address to which receipt should be confirmed; and
- an explicit confirmation that the customer is withdrawing.

After submission, the system must send an electronic receipt **without undue delay**, confirming the time the withdrawal notice was received.

Recommended public route: `/withdrawal` (or equivalent), linked from the footer, order confirmation and returns page.

## 1.13 Returning goods after withdrawal

After giving notice of withdrawal, the customer must send or hand back the goods within **14 days** in accordance with applicable law.

For a normal withdrawal (not a defective product claim), the customer pays the direct cost of return shipping, unless Macmaer has expressly agreed otherwise. The customer may choose a suitable return method and should package the goods with reasonable care and retain evidence of dispatch/tracking.

The customer may inspect a product to the extent reasonably necessary to establish its nature, characteristics and functioning. Where permitted by law, Macmaer may deduct an amount reflecting a proven reduction in value caused by handling beyond what was necessary for that purpose.

## 1.14 Refund following withdrawal

Where a statutory withdrawal applies, Macmaer will refund payments that must be refunded under applicable law, including the original standard delivery cost where the entire order is withdrawn. If the customer chose a more expensive delivery method than Macmaer's least expensive standard option, Macmaer does not have to refund the additional premium to the extent permitted by law.

Refunds will be made without undue delay and within the statutory period. For goods, Macmaer may withhold the refund until the goods have been received back or until the customer provides evidence that they have been sent back, whichever occurs first, where the law permits this.

Refunds will normally be made to the original payment method unless another method is expressly agreed and does not result in fees for the customer.

For a **partial return**, any treatment of the original outbound shipping charge must follow applicable law and the checkout terms for that order.

## 1.15 Custom and personalised products — withdrawal exception

A product is excluded from the statutory right of withdrawal **only where the legal exception actually applies**, for example when it is non-prefabricated and made according to the customer's individual specifications or is clearly personalised.

This exception must be interpreted narrowly.

**Important for Macmaer's product model:** simply choosing from Macmaer's ordinary pre-set catalogue options — such as a standard size, standard colour, standard fabric, standard knot design or standard clasp offered to all customers — must **not automatically be classified as a non-returnable personalised/custom product**. EU consumer-rights guidance specifically distinguishes genuinely individual specifications from selection among standard pre-set catalogue options.

Examples that are more likely to qualify as genuinely custom/personalised include:

- dimensions requested by the customer that are not offered as a standard size;
- a customer-specific embroidered/printed name, text or image;
- a bespoke design, combination or feature created specifically for that customer's request and not part of Macmaer's standard offer.

Where Macmaer relies on this exception, the product page and checkout must **clearly inform the customer before purchase** that the statutory right of withdrawal does not apply to that specific custom/personalised item and why.

## 1.16 Sale/discounted products

A product being on sale or discounted does **not by itself remove statutory withdrawal or complaint rights**. The old policy excluding all “sales orders” from returns must not be reused as a limitation of mandatory rights.

Macmaer may offer additional voluntary return/exchange policies with different conditions, but these must be clearly distinguished from statutory rights and may not reduce them.

## 1.17 Exchanges

Macmaer may offer exchanges as a customer-service option, but an exchange process must not replace or reduce statutory withdrawal or complaint rights.

For operational simplicity, the new store may implement an exchange as a return/refund plus a new order. If a direct exchange is offered, any additional shipping cost must be disclosed before the exchange is agreed.

## 1.18 Defective, damaged or non-conforming products (complaints)

A statutory complaint (**reklamation**) is different from a voluntary return or exercise of the right of withdrawal.

Consumers buying from a Swedish business have statutory rights if goods are defective or do not conform to the contract. Under current Swedish consumer rules, the general complaint period for goods is **three years**, subject to the conditions of the Consumer Sales Act and other applicable rules. A complaint made within two months after the consumer noticed the defect is considered to have been made in time under the Swedish rules.

Customers should contact **info@macmaer.com** and provide the order information and a description/photo of the issue where practical.

For a valid defect claim, statutory remedies may include repair, replacement, price reduction or cancellation/refund depending on the circumstances. Macmaer will bear costs that the law requires the seller to bear, including necessary return transport for a valid defect claim.

Nothing in the Returns Policy can shorten these statutory rights.

## 1.19 Cancellations before delivery

If you wish to cancel an order before dispatch, contact Macmaer as soon as possible. We will stop fulfilment where reasonably possible.

For products already produced specifically to a customer's individual specification, or where costs have already been incurred, rights and any recoverable costs depend on applicable law and the circumstances. Nothing in this section removes a statutory right of withdrawal where one exists.

## 1.20 Promotions and discount codes

Promotions and discount codes may have specific eligibility, validity periods and conditions displayed with the promotion. Unless otherwise stated, promotions cannot be combined. Discounts do not affect mandatory consumer rights.

Macmaer may refuse use of a code obtained or used through fraud, technical manipulation or clear abuse.

## 1.21 Website availability and third-party services

We aim to keep the website available and accurate but do not guarantee uninterrupted or error-free access. Maintenance, network failures, payment-provider outages, hosting issues and other technical events may temporarily affect availability.

Links to third-party sites or services are provided for convenience where applicable. Macmaer is not responsible for the independent content or privacy practices of third parties that it does not control. This does not reduce Macmaer's responsibility for third parties where applicable law makes Macmaer responsible for their acts as part of the sales contract, such as certain delivery obligations.

## 1.22 Intellectual property

Unless otherwise indicated, the Macmaer name, website design, product photography, product text, illustrations, graphics, logos and other original website content are owned by or licensed to Macmaer and are protected by applicable intellectual-property law.

Content may not be reproduced, republished, sold or commercially exploited without permission except where law permits it.

## 1.23 Customer reviews and submitted content

If the website allows reviews, photographs or other customer-submitted content, the customer confirms that they have the right to submit it and that it is not unlawful, misleading, defamatory, infringing or abusive.

By voluntarily submitting content for publication, the customer grants Macmaer a non-exclusive, worldwide, royalty-free licence to host, reproduce and display that content for operating and promoting the store, subject to applicable privacy and consumer law. Macmaer may moderate or remove unlawful, irrelevant, fraudulent or abusive content but should not manipulate reviews in a misleading manner.

## 1.24 Prohibited website use

You may not misuse the website, attempt unauthorised access, interfere with security or availability, introduce malicious code, scrape or overload the service in a manner that materially disrupts it, use it for fraud, or use it in violation of applicable law.

## 1.25 Limitation of liability

Nothing in these Terms excludes or limits liability, remedies or rights that cannot legally be excluded or limited, including mandatory consumer rights.

To the fullest extent permitted by law, Macmaer is not responsible for purely indirect or consequential losses arising from use of the website that were not reasonably foreseeable when the relevant contract was entered into, nor for losses caused solely by events outside Macmaer's reasonable control where applicable law does not make Macmaer responsible.

Macmaer does not accept liability for business losses arising from a consumer purchase made for commercial/resale purposes unless separately agreed.

No wording in these Terms should be interpreted as excluding liability for defective/non-conforming goods, legally required refunds, transport risk before delivery, or other liability imposed by mandatory law.

## 1.26 Changes to these Terms

Macmaer may update these Terms for future use of the website and future orders. The version applicable to an order is the version presented/available when that order is placed unless a later change is required by law and applies mandatorily.

Changes will not retroactively remove contractual or statutory rights already acquired by a customer.

## 1.27 Governing law and disputes

These Terms and purchases from Macmaer are governed by Swedish law, **without depriving a consumer of mandatory protections that apply under the law that cannot validly be excluded in the consumer's country of residence**.

If a problem arises, please contact **info@macmaer.com** first so that we can try to resolve it.

Consumers may, where the requirements are met, ask the Swedish National Board for Consumer Disputes (**Allmänna reklamationsnämnden, ARN**) to review a dispute. Information is available at `https://www.arn.se/`.

A dispute may also be brought before a competent court. Nothing in these Terms requires a consumer to submit a dispute to private arbitration where mandatory consumer law gives the consumer another right or forum.

**The previous ICC arbitration clause must not be reused for ordinary consumer purchases.**

## 1.28 Severability and no waiver

If a provision of these Terms is found invalid or unenforceable, the remaining provisions remain effective to the extent possible. Failure by either party to enforce a right on one occasion does not automatically waive that right for the future.

## 1.29 Contact

Questions about orders or these Terms can be sent to:

**Macmaer / Maria Botyan**  
Trombongatan 22B, 421 51 Västra Frölunda, Sweden  
Email: `info@macmaer.com`  
Telephone: `+46 72 874 87 56`

---

# 2. Privacy Policy

**Last updated:** `[DATE OF LIVE ACTIVATION]`

This Privacy Policy explains how **Maria Botyan**, a sole trader trading as **Macmaer** (**“Macmaer”, “we”, “us”**), collects and uses personal data when you visit `macmaer.com`, place an order, contact us, request a return/withdrawal, submit a review, or otherwise interact with our store.

For purposes of EU data-protection law, **Maria Botyan** is the data controller for the processing described in this policy, except where another company acts as an independent controller for its own service (for example, certain payment-provider processing).

Contact: `info@macmaer.com`  
Address: `Trombongatan 22B, 421 51 Västra Frölunda, Sweden`

## 2.1 Personal data we collect

Depending on how you use the store, we may process:

### Order and contact data

- name;
- email address;
- telephone number where needed for delivery/support;
- shipping address;
- billing address where provided/required;
- country/destination;
- order number and order history;
- products, variants, selected colours/sizes/options and customisation details;
- shipping method, tracking information and fulfilment status; and
- returns, withdrawals, refunds and complaint information.

### Payment and transaction data

Payments are processed through third-party payment providers such as Stripe. Macmaer may receive payment status, transaction identifiers, payment method type, limited card metadata (for example card brand/last digits where provided by the processor), fraud/risk information and refund status.

**Macmaer does not store full card numbers or card security codes.** Full payment credentials are collected/processed by the payment provider.

### Communications and customer service data

We process information you send when you email us, use a contact/withdrawal form, request a custom product, report a problem, or otherwise communicate with us. A custom request may contain additional information that you choose to provide; please avoid sending sensitive personal data unless it is genuinely necessary.

### Website, device and security data

The service may process technical data such as:

- IP address;
- browser/device information;
- timestamps;
- request/security logs;
- cookie or consent preferences;
- session/technical identifiers; and
- information needed to detect abuse, fraud or technical failures.

### Marketing and review data

If enabled, we may process your email address and marketing preferences when you subscribe to marketing communications, and the name/content/photos you choose to submit with a product review.

## 2.2 Where the data comes from

Most information is provided directly by you. We may also receive limited information from:

- payment processors;
- shipping/delivery providers;
- fraud/security service providers;
- website hosting/database providers; and
- other service providers used to complete an order or investigate a transaction.

## 2.3 Why we use personal data and the legal basis

| Purpose | Typical data | GDPR legal basis |
|---|---|---|
| Process, deliver and administer orders | Identity, contact, address, order, payment status | Performance of a contract / steps requested before a contract (Art. 6(1)(b)) |
| Provide customer support; handle returns, withdrawals and ordinary order issues | Contact, order and communication data | Contract (Art. 6(1)(b)); in some cases legitimate interests or legal claims |
| Meet bookkeeping, tax and other statutory duties | Order, transaction and invoice/accounting data | Legal obligation (Art. 6(1)(c)) |
| Prevent fraud, secure the store and investigate abuse | Technical, transaction, risk and security data | Legitimate interests (Art. 6(1)(f)), balanced against customer rights |
| Establish, exercise or defend legal claims | Relevant transaction/communication records | Legitimate interests and/or legal obligation as applicable |
| Send optional email marketing | Email and marketing preference | Consent (Art. 6(1)(a)), unless another lawful basis clearly applies under applicable marketing law |
| Use non-essential analytics/advertising cookies, if implemented | Cookie/device/usage data | Consent where required |
| Publish a customer review, if enabled | Review content and chosen display name | Consent or another documented lawful basis appropriate to the implementation |

Macmaer must document the lawful basis used for any processing added later rather than assuming that acceptance of the Terms is consent to all data processing.

## 2.4 When data is required

Information marked as required during checkout is needed to enter into or perform the purchase or to meet a legal requirement. If required shipping, contact or payment information is not provided, Macmaer may be unable to accept or fulfil the order.

Optional marketing consent is **not** a condition of purchasing from Macmaer.

## 2.5 Who receives personal data

We disclose personal data only where reasonably necessary for the purposes described above or where required by law. Recipients may include:

- **Stripe and/or other payment providers** — payment processing, refunds and fraud prevention;
- **Supabase** — intended database/storage/backend infrastructure;
- **Vercel** — intended website hosting/application infrastructure;
- **[TRANSACTIONAL EMAIL PROVIDER]** — order, shipping, withdrawal and support emails;
- postal, courier and logistics providers — shipping, tracking and delivery;
- accounting/bookkeeping/tax service providers;
- IT/security providers and professional advisers where necessary; and
- courts, regulators, tax authorities, customs authorities, law-enforcement bodies or other public authorities where disclosure is legally required or necessary to protect legal rights.

Before launch, Codex/owner must replace the generic email-provider placeholder and verify that this list matches the actual production stack.

Service providers acting on Macmaer's behalf should receive only the data reasonably required for their function and be subject to appropriate contractual/data-protection obligations.

## 2.6 International transfers

Some service providers or their subprocessors may process personal data outside Sweden or outside the European Economic Area (EEA).

Where GDPR requires safeguards for an international transfer, Macmaer will use an applicable lawful transfer mechanism, such as an adequacy decision or appropriate contractual safeguards, and additional measures where required.

The production owner must verify the actual locations/subprocessors and data-processing agreements for Stripe, Supabase, Vercel, the email provider, analytics provider (if any) and other relevant processors before launch.

## 2.7 Data retention

Macmaer keeps personal data only for as long as necessary for the purpose for which it is processed, unless a longer period is required by law or needed for a legal claim.

The previous blanket statement that personal data is “usually stored for 3 years” must **not** be reused.

The intended retention framework is:

- **Accounting/order records that constitute accounting information:** retained for the period required by Swedish bookkeeping/tax law. Current Swedish rules generally require accounting information to be retained for **seven years after the end of the calendar year in which the financial year ended**.
- **Active order, return, refund and complaint records:** retained as needed to perform the contract, meet legal obligations and handle/defend claims; records that are also accounting information follow the statutory accounting period.
- **Ordinary customer-service messages not needed for accounting or a continuing claim:** delete or anonymise when no longer reasonably necessary; target retention should be configured and documented internally (recommended starting point: up to 24 months after resolution unless there is a reason to retain longer).
- **Security/technical logs:** keep for a limited operational/security period and longer only where an incident, fraud investigation or legal requirement justifies it. Define the actual production retention in the technical documentation.
- **Marketing subscription data:** retain while the subscription is active. If consent is withdrawn, stop marketing; a minimal suppression record may be retained where needed to ensure the opt-out is respected.
- **Abandoned-cart data, if the feature is implemented:** establish a short, documented retention period appropriate to the purpose rather than keeping it indefinitely.

At the end of an applicable retention period, data should be deleted or anonymised unless further retention has a lawful basis.

## 2.8 Your data-protection rights

Depending on the circumstances and applicable law, you may have the right to:

- **Access** — obtain information about personal data Macmaer processes about you and, where applicable, a copy.
- **Rectification** — correct inaccurate or incomplete personal data.
- **Erasure** — request deletion where the legal conditions are met.
- **Restriction** — request restriction of processing in certain circumstances.
- **Object** — object to processing based on legitimate interests in certain circumstances.
- **Object to direct marketing** — you can object to direct marketing at any time; after such an objection the data will no longer be used for that purpose.
- **Data portability** — receive certain data you provided in a structured, commonly used and machine-readable format where the legal conditions are met.
- **Withdraw consent** — where processing relies on consent, withdraw that consent at any time. Withdrawal does not make earlier lawful processing unlawful.
- **Complain** — lodge a complaint with the competent data-protection authority. In Sweden, this is the **Swedish Authority for Privacy Protection (Integritetsskyddsmyndigheten, IMY)** at `https://www.imy.se/`.

Some rights are subject to legal exceptions. For example, Macmaer may be required to retain invoice/order information despite an erasure request where Swedish accounting or tax law requires retention.

To exercise a right, contact **info@macmaer.com**. Macmaer may need to verify the requester's identity before disclosing, correcting or deleting data.

## 2.9 Cookies, analytics and similar technologies

The store may use strictly necessary cookies or local-storage/session technologies to operate functions such as the cart, checkout, security and consent preferences.

If Macmaer introduces analytics, advertising or other non-essential tracking that requires consent, those technologies must **not be activated before the required consent is obtained**. The site should provide a cookie/consent interface allowing users to make and later change their choices.

Codex must generate/update the actual cookie disclosure from the technologies truly used in production; do not publish a generic list of cookies that the site does not actually set.

## 2.10 Marketing communications

If you voluntarily subscribe to marketing, Macmaer may use the contact details you provided for that purpose. Marketing messages must contain a simple way to unsubscribe. You may also unsubscribe by contacting `info@macmaer.com`.

Transactional messages necessary for an order, payment, return, security or customer-service matter are not marketing messages and may still be sent where legally permitted/required after a marketing unsubscribe.

## 2.11 Automated fraud/payment checks

Payment and fraud-prevention providers may use automated systems to evaluate transactions under their own policies. Macmaer should not state that it performs no automated decision-making unless this has been verified against the live payment/fraud configuration.

If Macmaer itself later introduces solely automated decision-making that produces legal or similarly significant effects, this Privacy Policy and the relevant process must be reviewed before activation.

## 2.12 Data security

Macmaer uses reasonable technical and organisational measures intended to protect personal data against unauthorised access, alteration, disclosure, loss or destruction. No internet or storage system can be guaranteed to be completely secure, so this policy does not promise absolute security.

Access to production customer/order data must be limited to authorised persons and systems. Server-side secrets, payment secret keys and administrative credentials must never be exposed in client-side code.

## 2.13 Third-party websites

The website may link to third-party websites. Their privacy practices are governed by their own privacy notices and are not controlled by Macmaer. This does not change Macmaer's obligations for processing carried out on its behalf by contracted processors.

## 2.14 Changes to this Privacy Policy

We may update this Privacy Policy when the store, suppliers, processing purposes or legal requirements change. The current version and its update date will be published on this page. If a change materially affects how previously collected personal data is used, Macmaer will take any additional notice/consent steps required by law.

## 2.15 Contact

For privacy questions or rights requests:

**Macmaer / Maria Botyan**  
Trombongatan 22B, 421 51 Västra Frölunda, Sweden  
Email: `info@macmaer.com`  
Telephone: `+46 72 874 87 56`

---

# 3. Shipping Policy (customer-facing standalone version)

**Last updated:** `[DATE]`

Macmaer ships handmade products from Gothenburg, Sweden, to destinations made available at checkout.

## Processing

- Standard catalogue orders: normally **2–4 business days** before dispatch.
- Genuinely custom/personalised orders: normally **4–7 business days**, unless a different lead time is displayed for the order.

## Shipping cost

Shipping is calculated at checkout using the **shipping destination** and may also depend on parcel size, weight, order value and service level. The current reference range is approximately **80–500 SEK per order**.

Domestic shipping within Sweden is currently free for orders over **500 SEK**. The threshold shown in the live checkout/site announcement is controlling if the business later changes this offer.

## Delivery estimates after dispatch

- Sweden: **1–3 business days**
- EU: **5–8 business days**
- Australia, Canada, Japan, New Zealand, South Korea and United States: **6–12 business days**

These are estimates and not guaranteed delivery dates. Carrier disruption, holidays, customs clearance and events outside Macmaer's reasonable control can cause delays. Mandatory rights for delayed/non-delivery remain unaffected.

## Tracking

Orders are normally shipped with tracking where supported by the selected service. Tracking details are sent when available.

## Lost, damaged or missing deliveries

If your parcel is damaged, incomplete, lost, or appears as delivered but cannot be found, contact `info@macmaer.com` promptly with the order number. Macmaer will investigate with the carrier and will meet any responsibility required under applicable consumer law.

## Incorrect addresses / unclaimed parcels

Please check your shipping address carefully. If a parcel is returned because of an incorrect address you provided or because it was not collected, you may be charged the actual reasonable additional transport cost caused by that issue to the extent permitted by law.

Not collecting a parcel is not, by itself, a withdrawal notice. If you wish to withdraw from a purchase, use our online withdrawal function or send us a clear notice.

## Customs

For international destinations, import taxes, customs duties, brokerage charges or similar fees may apply. Unless checkout explicitly says that a specific import charge is included, it is not collected by Macmaer and is the recipient's responsibility.

---

# 4. Returns, Right of Withdrawal, Exchanges and Complaints Policy

**Last updated:** `[DATE]`

This policy distinguishes four different situations: **statutory withdrawal**, **voluntary exchange**, **genuinely custom/personalised goods**, and **defective goods/complaints**. These are not the same legal process.

## 4.1 Statutory 14-day right of withdrawal

Where Swedish/EU distance-selling rules give you a right of withdrawal, you normally have **14 days** to notify Macmaer that you are withdrawing from the purchase. For goods, the period normally starts the day after you receive the goods.

You do not need to state a reason.

You can withdraw by:

- using the **Withdraw from an order** function on `macmaer.com`;
- emailing `info@macmaer.com` with a clear statement and your order details; or
- using the statutory/model withdrawal form available on the site.

You do **not** need Macmaer's prior approval for a valid statutory withdrawal.

After notifying us, send the goods back within **14 days**. Unless Macmaer agrees otherwise, you are responsible for the direct cost of return shipping for a normal withdrawal. Please package the goods carefully and keep proof of dispatch.

If you handle the product more than is reasonably necessary to inspect its nature, characteristics and functioning, Macmaer may make a lawful deduction for proven loss of value.

## 4.2 Refunds after withdrawal

For a valid statutory withdrawal, Macmaer will refund the payments that applicable law requires, including the standard outbound delivery charge when the entire order is withdrawn. Additional cost caused by choosing a premium/express service instead of the least expensive standard delivery need not be refunded where the law allows this.

We will refund without undue delay and within the statutory deadline. For returned goods, we may wait until we receive the goods or evidence that you sent them back, where permitted by law.

The refund is normally made to the original payment method.

## 4.3 Custom and personalised products

The statutory withdrawal exception applies only where a product is genuinely made to your individual specifications or clearly personalised within the meaning of applicable law.

Choosing ordinary options offered to every customer — such as a standard colour, standard size, standard fabric, standard knot design or standard clasp — does **not automatically** make a product non-returnable.

Where a particular order genuinely qualifies for the personalised/custom exception, this will be clearly stated on the product page and at checkout before you place the order.

## 4.4 Discounted/sale products

Discounted or sale items retain statutory withdrawal and complaint rights where those rights apply. A discount alone does not make an item non-returnable.

## 4.5 Exchanges

Please contact `info@macmaer.com` if you would prefer another standard product/variant. Where an exchange is offered, we will explain any new shipping cost before the exchange is agreed. Macmaer may process exchanges as a return/refund followed by a new order.

## 4.6 Defective or incorrect products / reklamation

If an item is defective, damaged before legal delivery, incorrect, or otherwise does not conform to the purchase contract, contact `info@macmaer.com` with your order number and a description of the problem. Photos are helpful where practical.

For consumers purchasing from a Swedish business, current Swedish law generally provides a **three-year complaint period for goods**, subject to the applicable legal conditions. This right is separate from the 14-day withdrawal period.

If a complaint is valid, Macmaer will provide the remedy and bear the costs required by applicable law. These may include repair, replacement, price reduction or cancellation/refund depending on the circumstances.

---

# 5. Pricing, VAT, Customs and Currency Policy

**Last updated:** `[DATE]`

## Product prices

Macmaer's displayed product price is the retail price payable for the product in the selected store currency. The new store uses a **fixed customer-facing retail-price model**: the product price is not reduced merely because Macmaer does not charge VAT for a particular shipping destination.

Example:

| Shipping destination | Displayed product price | Macmaer-collected VAT | Product amount paid by customer |
|---|---:|---:|---:|
| Sweden | 500 SEK | included where applicable | 500 SEK |
| Destination with 0% VAT collected by Macmaer | 500 SEK | 0 SEK | 500 SEK |

This replaces the legacy WooCommerce behaviour that reduced a 500 SEK VAT-inclusive Swedish price to 400 SEK when the customer's applicable Macmaer VAT rate was 0%.

## VAT/tax calculation

Applicable VAT/tax is determined from the legally relevant facts, including the **shipping destination** where destination is the applicable tax location. Tax logic must be performed server-side from configured tax rules and must not trust client-calculated values.

The amount of VAT included/charged should be shown in the order summary/invoice where required.

Do not hard-code a statement such as “EU always pays Swedish VAT” or “non-EU always pays no tax”. The production tax engine and policy must follow the tax treatment actually applicable to Macmaer, including any destination-VAT/OSS configuration in use.

## SEK / EUR / USD

Customers may select SEK, EUR or USD. The checkout must display the exact currency and amount that will be charged before the customer submits the order. Once the order is accepted/paid, store an immutable snapshot of:

- transaction currency;
- product unit prices;
- discounts;
- applicable VAT/tax rate and amount;
- shipping charge;
- exchange rate or configured price basis, where relevant; and
- final amount paid.

## Customs/import charges

Unless checkout expressly states otherwise, Macmaer does not collect destination-country customs duties, import VAT or carrier brokerage/handling fees. Such charges may be payable by the recipient to local authorities or the carrier.

---

# 6. Codex — Mandatory Checkout and Policy Implementation Requirements

The following are **technical/legal implementation requirements**, not optional copy suggestions.

## 6.1 Before final payment

Checkout must clearly show, immediately before the final order action:

- seller identity or readily available link to seller details;
- selected products and material characteristics/options;
- quantities;
- selected shipping destination/address;
- shipping method;
- product subtotal;
- discount, if any;
- tax/VAT included or charged, where relevant;
- shipping price;
- final total and currency;
- any known additional charge collected by Macmaer;
- link/access to Terms, Privacy Policy, Shipping and Returns/Withdrawal policy;
- any product-specific loss of withdrawal right for a genuinely personalised/custom product; and
- a final button/interaction whose wording unambiguously communicates an obligation to pay.

Customers must be able to identify and correct input errors before final submission.

## 6.2 Terms acceptance

Do not use a pre-ticked consent checkbox for optional marketing or non-essential tracking.

For contractual terms, present a clear statement such as:

> By placing this order, you agree to the Terms of Sale and acknowledge the Returns/Withdrawal Policy and Privacy Policy.

The order should store the applicable **Terms/policy version or version date** so that the contract can be reconstructed later.

## 6.3 Order confirmation

After an electronic order, send a confirmation without undue delay. The confirmation must include or provide durable access to the applicable contractual information, including order details and withdrawal information/model form where required.

## 6.4 Online withdrawal function — REQUIRED BEFORE LAUNCH

Implement a public, easy-to-find withdrawal function pursuant to the Swedish Distance Contracts Act rules effective **19 June 2026**.

Minimum behaviour:

1. Customer opens `/withdrawal` or equivalent.
2. Form permits name, order/contract identifier and electronic confirmation destination.
3. Customer explicitly confirms withdrawal.
4. Server records timestamp, submitted data and policy/order reference.
5. System immediately shows confirmation and sends a durable electronic receipt (normally email) with the timestamp/content.
6. Admin can see the withdrawal request linked to the order.
7. Function remains available without requiring the customer to create/log into an account.

Also make the official/model withdrawal form available in durable/downloadable form or provide the legally compliant content required for it.

## 6.5 Product-level withdrawal classification

Do **not** model `made_to_order = no_returns`.

Use a more precise model, e.g.:

```text
withdrawal_classification:
  STANDARD
  GENUINELY_CUSTOM_PERSONALISED
  OTHER_LEGAL_EXCEPTION
```

A standard product remains `STANDARD` even if Macmaer makes it only after the customer orders it or the customer chooses from ordinary pre-set size/colour/fabric options.

For `GENUINELY_CUSTOM_PERSONALISED`, require an admin-entered reason/explanation and display the no-withdrawal notice clearly before order submission.

## 6.6 Sale products

Do not automatically set sale/discounted products to non-returnable. Price reduction and statutory withdrawal rights are separate concepts.

## 6.7 Shipping and risk

Do not encode policy text saying carrier handoff ends Macmaer's responsibility for consumer deliveries. For offered shipping methods, seller risk generally remains until legal delivery/possession under applicable consumer rules.

## 6.8 Failed/unclaimed delivery

Do not implement an automatic arbitrary percentage deduction. Track actual return/re-shipping costs and allow the admin to apply only a documented, legally permitted cost where appropriate.

## 6.9 Pricing/tax

- Canonical product retail price must not be reduced simply because destination VAT = 0%.
- Calculate tax on the server.
- Base tax jurisdiction on the shipping destination where legally applicable, not billing country or selected display currency.
- Keep tax configuration data-driven.
- Persist an order tax/price snapshot.
- Never retroactively recalculate historic order totals from current product/tax settings.

## 6.10 Privacy/security

- Do not expose Stripe secret keys, Supabase service-role/secret keys, `CUSTOMER_IDENTITY_HASH_SECRET`, webhook secrets or other server secrets in client bundles.
- Card information must be handled by the payment provider; do not build storage for full card data/CVC.
- Use least-privilege access/RLS for customer/admin data.
- Keep a documented processor/subprocessor inventory.
- Implement deletion/retention jobs only after the retention categories are defined; accounting records must not be deleted merely because a customer requests account deletion.
- Marketing consent must be separate from checkout consent and recorded with timestamp/source.
- Non-essential analytics/advertising cookies must be consent-gated where required.

## 6.11 Business identity

Before launch, show business identity/contact information in an easily accessible and permanent location. At minimum, verify inclusion of legal name, physical address, email, telephone number, organisation/identification number as applicable, and VAT registration number where applicable.

## 6.12 Policy versioning

Create a simple policy-version mechanism, e.g.:

```text
policy_versions
- id
- policy_type
- version
- effective_at
- content_hash
- published_at
```

Store the relevant version identifiers on each order where practical. Do not silently overwrite the only copy of terms that governed historic orders.

---

# 7. Summary of Changes Compared with the Original Macmaer Text

This section is for the owner/developer and should **not** be displayed as part of the public policies.

## 7.1 Privacy Policy changes

1. **Fixed incomplete/unclear wording.** The original policy contained grammatical gaps and vague statements about legal bases. The new version states what data is collected, why it is processed, and the relevant GDPR basis by purpose.
2. **Identified the controller requirement.** Added placeholders for the actual legal trader name, address and contact details; “Macmaer” alone is not enough if it is only a trading name.
3. **Expanded data categories.** Added order/fulfilment, payment metadata, communications, technical/security data, withdrawal/refund data, marketing preferences and reviews where used.
4. **Clarified payment data.** Added that Stripe/payment providers process full card credentials and Macmaer should not store full card numbers/CVC.
5. **Added named/category recipients.** Added Stripe, Supabase, Vercel, email provider, carriers, accounting providers and authorities as applicable.
6. **Added international-transfer section.** Required because cloud/payment providers or subprocessors may process data outside the EEA; safeguards must be verified before launch.
7. **Replaced the blanket 3-year retention statement.** Swedish accounting information generally needs much longer retention; current rules require relevant accounting information for seven years after the end of the calendar year in which the financial year ended. Other data should be deleted earlier when no longer needed.
8. **Expanded GDPR rights.** Added rectification, erasure, restriction, objection, direct-marketing objection, portability, withdrawal of consent and complaint to IMY, plus lawful exceptions to erasure.
9. **Added cookies/analytics rules.** Non-essential tracking must be consent-gated where required; cookie disclosures must reflect the actual live technologies.
10. **Separated marketing consent from the purchase.** Buying a product must not be conditioned on optional marketing consent.
11. **Added security language without an absolute guarantee.** States reasonable security measures while avoiding an unrealistic promise that no breach can occur.
12. **Added automated fraud/payment check caveat.** Avoids falsely claiming no automated processing while Stripe/fraud tools may use it.

## 7.2 Terms of Use / Terms of Sale changes

1. **Converted generic website Terms into actual e-commerce Terms of Sale.** Added seller identity, order formation, checkout, payment, shipping, tax, returns, complaints and consumer rights.
2. **Removed the statement that inaccurate product descriptions have “return unused” as the sole remedy.** That could unlawfully restrict statutory remedies for non-conforming goods.
3. **Added handmade-product tolerances.** Clarified reasonable colour, measurement and craftsmanship variation without trying to exclude statutory conformity rights.
4. **Reworked ordering/payment.** Distinguished automated acknowledgement, successful payment and legitimate reasons an order may be refused/cancelled.
5. **Added protection for obvious pricing/technical errors** while explicitly preventing arbitrary post-contract price changes.
6. **Replaced overbroad warranty disclaimer.** The original “as is” wording could conflict with mandatory consumer rights for products. The new text limits website-availability warranties without disclaiming mandatory product obligations.
7. **Replaced overbroad limitation of liability.** The original attempted to exclude direct, indirect, punitive and consequential damages categorically. The new clause is limited to the extent legally permitted and explicitly preserves mandatory consumer remedies/liability.
8. **Removed compulsory ICC arbitration in Stockholm for consumer disputes.** Replaced it with negotiation, ARN where applicable, and competent courts, while preserving mandatory forum rights.
9. **Changed unilateral terms-update wording.** New terms apply prospectively and cannot retroactively remove rights from existing orders.
10. **Added currency rules, promotions, intellectual property, submitted reviews and prohibited use.**

## 7.3 Pricing/VAT changes

1. **Reversed the legacy WooCommerce price reduction for 0% VAT destinations.** A listed 500 SEK product stays 500 SEK whether the applicable Macmaer-collected VAT is 25% or 0%.
2. **Clarified that VAT is a component of the fixed retail price where applicable**, rather than a mechanism that automatically changes the customer-facing product price.
3. **Made tax location independent from currency.** Shipping destination governs where relevant; choosing USD/EUR/SEK does not determine tax jurisdiction.
4. **Removed simplistic “EU vs non-EU” tax promises.** Tax treatment must follow Macmaer's actual VAT/OSS/export configuration.
5. **Added immutable order snapshots** for currency, rate, VAT, shipping, discounts and totals.

## 7.4 Returns changes — major legal correction

1. **Changed “contact within 7 days” to the statutory 14-day withdrawal framework** where applicable.
2. **Removed requirement that Macmaer approve a return before withdrawal is effective.** A consumer may exercise statutory withdrawal by clear notice.
3. **Added the customer's 14-day deadline to send goods back after notification.**
4. **Added legally required refund treatment**, including standard outbound shipping for a full withdrawal and the permitted exception for premium shipping.
5. **Added the rule allowing Macmaer to wait for returned goods/evidence of dispatch before refunding where permitted.**
6. **Added lawful deduction for diminished value caused by excessive handling.**
7. **Removed blanket exclusion for sale items.** Discounted items do not lose statutory rights merely because they are on sale.
8. **Narrowed the custom/personalised exception.** This is especially important for Macmaer: selecting standard website options (standard size/colour/fabric/clasp) does not automatically make the item legally personalised/non-returnable. The old text treated these standard selections as personalised.
9. **Separated complaints for defective goods from returns.** Added the current Swedish three-year complaint right and made clear that defects are not governed by the ordinary return policy.
10. **Added mandatory online withdrawal function.** Swedish law requires an easy online withdrawal function for applicable online contracts from 19 June 2026.

## 7.5 Shipping/delivery changes

1. Preserved the current processing/transit estimates but clearly labelled them as estimates rather than guarantees.
2. Preserved tracked shipping and configurable shipping-by-destination/size/weight logic.
3. Preserved the current Swedish free-shipping threshold as a configurable rule rather than hard-coded legal text.
4. **Removed the blanket “package theft is not covered and we cannot replace it” statement.** Seller risk and whether legal delivery occurred depend on consumer law and facts.
5. **Replaced arbitrary deduction for unclaimed packages** with recovery only of actual reasonable additional costs where legally permitted.
6. Clarified that failure to collect is not automatically a valid withdrawal notice.
7. Added seller responsibility during transport until legal delivery, consistent with Swedish consumer rules.

## 7.6 Customs changes

1. Kept the basic rule that destination-country import duties/taxes/fees may be payable by the recipient.
2. Clarified that this applies **unless checkout explicitly says Macmaer collects/includes a particular import charge**.
3. Avoided promising customs clearance times or amounts, which Macmaer cannot control.
4. Clarified that refusing customs charges is not automatically equivalent to exercising a statutory withdrawal right.

## 7.7 New implementation obligations not in the old text

1. Online withdrawal function with immediate durable receipt.
2. Model withdrawal form/information.
3. Clear payment-obligation wording on the final checkout button.
4. Ability to correct checkout errors before order submission.
5. Durable electronic order confirmation.
6. Easily accessible legal business identity/contact details.
7. Policy versioning for historic orders.
8. Server-side price/tax/shipping calculations and snapshots.
9. Correct product classification for withdrawal exceptions.
10. Consent separation for marketing and non-essential cookies.

---

# 8. Pre-Launch Legal/Configuration Checklist

Codex/owner should treat these as blockers for production activation:

- [ ] Replace legal trader name placeholder.
- [ ] Add organisation/identification number as applicable.
- [ ] Add VAT registration number.
- [ ] Add physical business address.
- [ ] Add/verify return address.
- [ ] Add customer-service telephone number.
- [ ] Verify `info@macmaer.com` is monitored and can receive withdrawal/privacy requests.
- [ ] Verify live list of countries and delivery restrictions.
- [ ] Verify live processing and delivery estimates.
- [ ] Verify Swedish free-shipping threshold and all shipping rates.
- [ ] Verify actual tax/OSS/export configuration with accountant/tax adviser.
- [ ] Verify fixed-retail-price VAT behaviour in SEK/EUR/USD with automated tests.
- [ ] Verify Stripe live account/payment methods/refund behaviour.
- [ ] Verify production processors: Stripe, Supabase, Vercel, email provider, analytics, carriers, accounting service.
- [ ] Verify processor DPAs and international-transfer safeguards.
- [ ] Configure actual retention periods and deletion/anonymisation jobs.
- [ ] Implement cookie consent before enabling non-essential analytics/marketing cookies.
- [ ] Implement `/withdrawal` function and immediate receipt email.
- [ ] Provide model withdrawal form/information.
- [ ] Ensure standard colour/size/fabric choices are not automatically marked non-returnable.
- [ ] Ensure personalised/custom exception is clearly disclosed before purchase where genuinely applicable.
- [ ] Ensure sale items retain statutory rights.
- [ ] Add complaint/reklamation workflow separate from withdrawal/return workflow.
- [ ] Ensure final order button clearly communicates obligation to pay.
- [ ] Store policy version/effective date with orders.
- [ ] Test full and partial withdrawals/refunds, premium shipping refunds, failed delivery, lost parcels and defective-product flows.
- [ ] Conduct final Swedish legal review before live activation, especially international sales, product safety, tax/OSS and privacy processor disclosures.

---

# 9. Legal Reference Notes (for owner/developer; not necessarily rendered publicly)

The September 2026 review used the following primary/official guidance as the basis for the major corrections above:

- Swedish Distance Contracts Act (2005:59), including the online withdrawal-function rules effective 19 June 2026:  
  `https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-200559-om-distansavtal-och-avtal-utanfor_sfs-2005-59/`
- Konsumentverket — distance-contract information requirements and withdrawal rights:  
  `https://www.konsumentverket.se/marknadsratt-foretag/informationskrav-vid-distansavtal-regler-for-foretag`
- Konsumentverket — 14-day withdrawal, return costs and refunds:  
  `https://www.konsumentverket.se/konsumentratt-process/angerratt/`
- Konsumentverket — three-year complaint right for goods:  
  `https://www.konsumentverket.se/konsumentratt-process/reklamera-vara/`
- Swedish Consumer Sales Act (2022:260), including delivery/risk and mandatory consumer rights:  
  `https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/konsumentkoplag-2022260_sfs-2022-260/`
- EU Commission guidance on the Consumer Rights Directive — standard pre-set options vs genuinely personalised goods:  
  `https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:52021XC1229(04)`
- Swedish E-Commerce Act (2002:562), including seller identity, price and order-process information requirements:  
  `https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-2002562-om-elektronisk-handel-och-andra_sfs-2002-562/`
- IMY — what a privacy notice should contain:  
  `https://www.imy.se/vanliga-fragor-och-svar/vad-ska-en-integritetspolicy-innehalla/`
- IMY — lawful bases and data-subject rights:  
  `https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/rattslig-grund/`  
  `https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/de-registrerades-rattigheter/`
- IMY — international transfers:  
  `https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/overforing-till-tredje-land/`
- Skatteverket — accounting information retention:  
  `https://www4.skatteverket.se/rattsligvagledning/edition/2026.10/324687.html`
