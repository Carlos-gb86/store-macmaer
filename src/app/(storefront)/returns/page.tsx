import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/policies/policy-page";

export const metadata: Metadata = {
  title: "Returns and Withdrawal",
  robots: { index: false },
};

export default function ReturnsPage() {
  return (
    <PolicyPage
      eyebrow="Customer care"
      title="Returns, Withdrawal and Complaints"
    >
      <h2>14-day withdrawal</h2>
      <p>
        Where Swedish or EU distance-selling law applies, you normally have 14
        days after receipt to tell Macmaer clearly that you are withdrawing,
        without giving a reason. You may use the online withdrawal function,
        email <a href="mailto:info@macmaer.com">info@macmaer.com</a>, or use the
        statutory model form. Prior approval is not required.
      </p>
      <p>
        After notifying us, return the goods within 14 days. You normally pay
        direct return shipping for an ordinary withdrawal. A lawful deduction
        may be made for proven loss of value caused by handling beyond what was
        reasonably necessary to inspect the product.
      </p>
      <h2>Refunds</h2>
      <p>
        A valid full withdrawal includes the refundable payments required by law
        and the original least-expensive standard delivery charge. Premium
        delivery supplements need not be refunded where law permits. Refunds
        normally return to the original payment method and may be withheld until
        the goods or evidence of dispatch are received where permitted.
      </p>
      <h2>Personalised and discounted goods</h2>
      <p>
        The withdrawal exception is limited to goods genuinely made to
        individual specifications or clearly personalised. Selecting standard
        size, colour, fabric, knot, or clasp options does not automatically
        qualify. Discounted goods retain statutory rights.
      </p>
      <h2>Defects and complaints</h2>
      <p>
        A complaint about defective or non-conforming goods is separate from
        withdrawal. Swedish law generally provides consumers a three-year
        complaint period, subject to its conditions. Contact us with the order
        number and a description or photo where practical. Macmaer bears costs
        and provides remedies required by law.
      </p>
      <p>
        The public <Link href="/withdrawal">online withdrawal function</Link>{" "}
        will be activated before ordering opens.
      </p>
    </PolicyPage>
  );
}
