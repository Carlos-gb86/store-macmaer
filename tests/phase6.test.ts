import { describe, expect, it } from "vitest";
import { csvCell, csvDocument, decimalAmount } from "@/modules/orders/csv";
import {
  contactNotificationTemplate,
  orderConfirmationTemplate,
} from "@/modules/email/templates";

describe("Phase 6 support output", () => {
  it("protects accounting CSV files from formulas and preserves decimals", () => {
    expect(csvCell("=IMPORTDATA('bad')")).toBe("\"'=IMPORTDATA('bad')\"");
    expect(decimalAmount(58001)).toBe("580.01");
    expect(
      csvDocument([
        ["order", "amount"],
        ["MAC-1", "580.00"],
      ]),
    ).toContain('"MAC-1","580.00"');
  });

  it("escapes customer content in transactional HTML", () => {
    const contact = contactNotificationTemplate({
      firstName: "<Maria>",
      lastName: "Botyan",
      email: "customer@example.com",
      subject: "A <custom> piece",
      message: "Hello <script>alert(1)</script>",
    });
    expect(contact.html).not.toContain("<script>");
    expect(contact.html).toContain("&lt;script&gt;");

    const order = orderConfirmationTemplate({
      orderNumber: "MAC-2026-000001",
      customerName: "A & B",
      customerEmail: "buyer@example.com",
      currency: "SEK",
      totalAmount: 50000,
      taxAmount: 10000,
      shippingGrossAmount: 0,
      discountAmount: 0,
      items: [
        {
          productTitle: "Knot <Pillow>",
          quantity: 1,
          grossAmount: 50000,
          selectedOptions: [],
        },
      ],
    });
    expect(order.html).toContain("Knot &lt;Pillow&gt;");
  });
});
