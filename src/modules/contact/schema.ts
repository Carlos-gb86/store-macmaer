import { z } from "zod";

export const contactFormSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(80),
  lastName: z.string().trim().min(1, "Enter your last name.").max(80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address.")
    .max(320),
  subject: z.string().trim().max(160).default(""),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a little more so we can help.")
    .max(5000, "Keep your message under 5,000 characters."),
  company: z.string().max(200).default(""),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
export type ContactField = keyof ContactFormInput;
export type ContactFormState = {
  ok: boolean;
  message: string;
  submissionId: number;
  fieldErrors?: Partial<Record<ContactField, string>>;
};

export const initialContactFormState: ContactFormState = {
  ok: false,
  message: "",
  submissionId: 0,
};
