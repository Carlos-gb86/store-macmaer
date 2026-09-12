import { describe, expect, it } from "vitest";
import { contactFormSchema } from "@/modules/contact/schema";

describe("contact form validation", () => {
  it("normalizes a valid enquiry", () => {
    expect(
      contactFormSchema.parse({
        firstName: " Maria ",
        lastName: " Botyan ",
        email: " INFO@MACMAER.COM ",
        subject: " A custom piece ",
        message: " Could you make this in a warmer colour? ",
        company: "",
      }),
    ).toMatchObject({
      firstName: "Maria",
      lastName: "Botyan",
      email: "info@macmaer.com",
      subject: "A custom piece",
      message: "Could you make this in a warmer colour?",
    });
  });

  it("rejects malformed email and unhelpfully short messages", () => {
    const result = contactFormSchema.safeParse({
      firstName: "Maria",
      lastName: "Botyan",
      email: "not-an-email",
      subject: "",
      message: "Hi",
      company: "",
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(["email", "message"]),
      );
  });
});
