import { formatCataloguePrice } from "@/modules/catalog/format";

export type EmailOrderItem = {
  productTitle: string;
  quantity: number;
  grossAmount: number;
  selectedOptions: string[];
};

export type EmailOrder = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  currency: string;
  totalAmount: number;
  taxAmount: number;
  shippingGrossAmount: number;
  discountAmount: number;
  items: EmailOrderItem[];
};

export function escapeEmailHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}

function layout(preview: string, title: string, body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeEmailHtml(preview)}</title></head><body style="margin:0;background:#f5f1eb;color:#2e2925;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapeEmailHtml(preview)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:28px 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:auto;background:#fff;border-radius:18px;overflow:hidden"><tr><td style="padding:30px 34px;background:#2e2925;color:#fff"><div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase">Macmaer</div><h1 style="font-family:Georgia,serif;font-size:30px;font-weight:400;margin:12px 0 0">${escapeEmailHtml(title)}</h1></td></tr><tr><td style="padding:30px 34px;line-height:1.6">${body}<p style="margin:30px 0 0;color:#706861;font-size:13px">Handmade in Sweden · <a style="color:#706861" href="mailto:info@macmaer.com">info@macmaer.com</a></p></td></tr></table></td></tr></table></body></html>`;
}

function items(order: EmailOrder) {
  return order.items
    .map(
      (item) =>
        `<tr><td style="padding:12px 0;border-bottom:1px solid #e8e1d9"><strong>${escapeEmailHtml(item.productTitle)}</strong>${item.selectedOptions.length ? `<div style="font-size:13px;color:#706861">${item.selectedOptions.map(escapeEmailHtml).join(" · ")}</div>` : ""}</td><td style="padding:12px 0;border-bottom:1px solid #e8e1d9;text-align:center">${item.quantity}</td><td style="padding:12px 0;border-bottom:1px solid #e8e1d9;text-align:right">${escapeEmailHtml(formatCataloguePrice(item.grossAmount, order.currency))}</td></tr>`,
    )
    .join("");
}

function orderSummary(order: EmailOrder) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0"><tr><th style="text-align:left;padding-bottom:8px">Piece</th><th style="padding-bottom:8px">Qty</th><th style="text-align:right;padding-bottom:8px">Amount</th></tr>${items(order)}</table><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td>Shipping</td><td style="text-align:right">${escapeEmailHtml(formatCataloguePrice(order.shippingGrossAmount, order.currency))}</td></tr>${order.discountAmount ? `<tr><td>Discount</td><td style="text-align:right">−${escapeEmailHtml(formatCataloguePrice(order.discountAmount, order.currency))}</td></tr>` : ""}<tr><td>VAT / tax included</td><td style="text-align:right">${escapeEmailHtml(formatCataloguePrice(order.taxAmount, order.currency))}</td></tr><tr><td style="padding-top:10px"><strong>Total</strong></td><td style="padding-top:10px;text-align:right"><strong>${escapeEmailHtml(formatCataloguePrice(order.totalAmount, order.currency))}</strong></td></tr></table>`;
}

export function orderConfirmationTemplate(order: EmailOrder) {
  const firstName = order.customerName.trim().split(/\s+/)[0] || "there";
  return {
    subject: `We’ve received your Macmaer order ${order.orderNumber}`,
    text: `Hi ${firstName}, thank you for your order ${order.orderNumber}. We will now begin making your pieces by hand. Total: ${formatCataloguePrice(order.totalAmount, order.currency)}.`,
    html: layout(
      `Order ${order.orderNumber} is confirmed`,
      "Thank you for your order",
      `<p>Hi ${escapeEmailHtml(firstName)},</p><p>We’ve received your payment and will now begin making your pieces by hand. We’ll email you again when your order is on its way.</p><p><strong>Order ${escapeEmailHtml(order.orderNumber)}</strong></p>${orderSummary(order)}`,
    ),
  };
}

export function adminOrderTemplate(order: EmailOrder) {
  return {
    subject: `New paid order ${order.orderNumber}`,
    text: `New paid order ${order.orderNumber} from ${order.customerName} (${order.customerEmail}), total ${formatCataloguePrice(order.totalAmount, order.currency)}.`,
    html: layout(
      `New order ${order.orderNumber}`,
      "A new order is ready",
      `<p><strong>${escapeEmailHtml(order.customerName)}</strong> placed and paid for order ${escapeEmailHtml(order.orderNumber)}.</p><p>${escapeEmailHtml(order.customerEmail)}</p>${orderSummary(order)}`,
    ),
  };
}

export function shippingTemplate(
  order: EmailOrder,
  fulfilment: {
    carrier: string;
    trackingNumber: string;
    trackingUrl: string | null;
  },
) {
  const trackingUrl =
    fulfilment.trackingUrl && /^https?:\/\//i.test(fulfilment.trackingUrl)
      ? fulfilment.trackingUrl
      : null;
  const tracking = trackingUrl
    ? `<p><a href="${escapeEmailHtml(trackingUrl)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#2e2925;color:#fff;text-decoration:none">Track your parcel</a></p>`
    : "";
  return {
    subject: `Your Macmaer order ${order.orderNumber} is on its way`,
    text: `Your order ${order.orderNumber} has shipped with ${fulfilment.carrier}. Tracking number: ${fulfilment.trackingNumber}.`,
    html: layout(
      `Order ${order.orderNumber} has shipped`,
      "Your handmade pieces are on their way",
      `<p>Your order has left us with <strong>${escapeEmailHtml(fulfilment.carrier)}</strong>.</p><p>Tracking number: <strong>${escapeEmailHtml(fulfilment.trackingNumber)}</strong></p>${tracking}<p>Thank you for choosing something made slowly and by hand.</p>`,
    ),
  };
}

export function refundTemplate(order: EmailOrder, amount: number) {
  return {
    subject: `Refund confirmed for ${order.orderNumber}`,
    text: `A refund of ${formatCataloguePrice(amount, order.currency)} has been confirmed for order ${order.orderNumber}. Your bank may take several days to show it.`,
    html: layout(
      `Refund for ${order.orderNumber}`,
      "Your refund is confirmed",
      `<p>We’ve confirmed a refund of <strong>${escapeEmailHtml(formatCataloguePrice(amount, order.currency))}</strong> for order ${escapeEmailHtml(order.orderNumber)}.</p><p>Your bank or card issuer may take several business days to show the funds.</p>`,
    ),
  };
}

export function contactNotificationTemplate(message: {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
}) {
  const name = `${message.firstName} ${message.lastName}`.trim();
  return {
    subject: message.subject
      ? `Contact: ${message.subject}`
      : `New message from ${name}`,
    text: `From: ${name} <${message.email}>\n\n${message.message}`,
    html: layout(
      `New message from ${name}`,
      "A customer sent a message",
      `<p><strong>${escapeEmailHtml(name)}</strong><br><a href="mailto:${escapeEmailHtml(message.email)}">${escapeEmailHtml(message.email)}</a></p>${message.subject ? `<p><strong>Subject:</strong> ${escapeEmailHtml(message.subject)}</p>` : ""}<p style="white-space:pre-wrap">${escapeEmailHtml(message.message)}</p>`,
    ),
  };
}

export function contactAcknowledgementTemplate(firstName: string) {
  return {
    subject: "We received your message",
    text: `Hi ${firstName}, thank you for contacting Macmaer. We have received your message and will reply as soon as we can.`,
    html: layout(
      "We received your message",
      "Thank you for getting in touch",
      `<p>Hi ${escapeEmailHtml(firstName)},</p><p>Your message has reached Macmaer. We’ll read it carefully and reply as soon as we can.</p>`,
    ),
  };
}
