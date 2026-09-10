import type { Metadata } from "next";
import { PolicyPage } from "@/components/policies/policy-page";

export const metadata: Metadata = {
  title: "Withdraw from an order",
  robots: { index: false },
};

export default function WithdrawalPage() {
  return (
    <PolicyPage eyebrow="Returns" title="Withdraw from an order">
      <p>
        The online withdrawal submission and immediate electronic receipt are
        being completed with the order email system. Ordering remains disabled
        until this legally required function is operational.
      </p>
      <p>
        In the meantime, a clear withdrawal notice can be sent to{" "}
        <a href="mailto:info@macmaer.com">info@macmaer.com</a>. Include your
        name, order number, the email address for confirmation, and a clear
        statement that you are withdrawing.
      </p>
    </PolicyPage>
  );
}
