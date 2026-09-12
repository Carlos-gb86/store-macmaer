"use client";

import { useActionState, useState } from "react";
import {
  addOrderNoteAction,
  createRefundAction,
  resendOrderEmailAction,
  setFulfilmentAction,
  type OrderActionState,
} from "@/modules/orders/actions";

const initialState: OrderActionState = null;

function Result({ state }: { state: OrderActionState }) {
  return state ? (
    <p role={state.ok ? "status" : "alert"}>{state.message}</p>
  ) : null;
}

export function FulfilmentForm({
  orderId,
  currentStatus,
  carrier,
  trackingNumber,
  trackingUrl,
}: {
  orderId: string;
  currentStatus: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
}) {
  const [state, action, pending] = useActionState(
    setFulfilmentAction,
    initialState,
  );
  const options: Record<string, string[]> = {
    UNFULFILLED: ["PROCESSING"],
    PROCESSING: ["READY_TO_SHIP"],
    READY_TO_SHIP: ["SHIPPED"],
    SHIPPED: ["DELIVERED"],
  };
  const next = options[currentStatus] ?? [];
  if (!next.length)
    return (
      <p className="muted">No further fulfilment actions are available.</p>
    );
  return (
    <form action={action}>
      <input type="hidden" name="orderId" value={orderId} />
      <label>
        Next status
        <select name="status">
          {next.map((status) => (
            <option value={status} key={status}>
              {status.replaceAll("_", " ").toLowerCase()}
            </option>
          ))}
        </select>
      </label>
      <div className="admin-grid">
        <label>
          Carrier
          <select name="carrier" defaultValue={carrier ?? ""}>
            <option value="">Choose at shipping</option>
            <option value="POSTNORD">PostNord</option>
            <option value="UPS">UPS</option>
          </select>
        </label>
        <label>
          Tracking number
          <input name="trackingNumber" defaultValue={trackingNumber ?? ""} />
        </label>
      </div>
      <label>
        Tracking link (optional)
        <input name="trackingUrl" type="url" defaultValue={trackingUrl ?? ""} />
      </label>
      <p className="field-note">
        Carrier details are required when marking an order shipped. Customers do
        not choose the carrier.
      </p>
      <button disabled={pending}>
        {pending ? "Saving…" : "Update fulfilment"}
      </button>
      <Result state={state} />
    </form>
  );
}

export function OrderNoteForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(
    addOrderNoteAction,
    initialState,
  );
  return (
    <form action={action}>
      <input type="hidden" name="orderId" value={orderId} />
      <label>
        New internal note
        <textarea name="note" maxLength={2000} required />
      </label>
      <button disabled={pending}>{pending ? "Adding…" : "Add note"}</button>
      <Result state={state} />
    </form>
  );
}

export function RefundForm({
  orderId,
  orderNumber,
  requestKey,
  currency,
  remainingAmount,
}: {
  orderId: string;
  orderNumber: string;
  requestKey: string;
  currency: string;
  remainingAmount: string;
}) {
  const [state, action, pending] = useActionState(
    createRefundAction,
    initialState,
  );
  return (
    <form action={action}>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="requestKey" value={requestKey} />
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <div className="admin-grid">
        <label>
          Amount ({currency})
          <input
            name="amount"
            inputMode="decimal"
            defaultValue={remainingAmount}
            required
          />
        </label>
        <label>
          Reason
          <select name="reason" defaultValue="REQUESTED_BY_CUSTOMER">
            <option value="REQUESTED_BY_CUSTOMER">Customer request</option>
            <option value="DUPLICATE">Duplicate payment</option>
            <option value="FRAUDULENT">Fraudulent</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
      </div>
      <label>
        Internal note (optional)
        <textarea name="note" maxLength={1000} />
      </label>
      <label>
        Type {orderNumber} to confirm
        <input name="confirmation" autoComplete="off" required />
      </label>
      <p className="field-note">
        This sends a real refund through the Stripe account configured for this
        environment. Made-to-order products are never restocked.
      </p>
      <button className="secondary danger" disabled={pending}>
        {pending ? "Submitting…" : "Submit refund"}
      </button>
      <Result state={state} />
    </form>
  );
}

export function ResendEmailForm({
  orderId,
  canShip,
  refunds,
}: {
  orderId: string;
  canShip: boolean;
  refunds: { id: string; label: string }[];
}) {
  const [kind, setKind] = useState("ORDER_CONFIRMATION");
  const [state, action, pending] = useActionState(
    resendOrderEmailAction,
    initialState,
  );
  return (
    <form action={action}>
      <input type="hidden" name="orderId" value={orderId} />
      <label>
        Email
        <select
          name="kind"
          value={kind}
          onChange={(event) => setKind(event.target.value)}
        >
          <option value="ORDER_CONFIRMATION">Order confirmation</option>
          {canShip && (
            <option value="SHIPPING_CONFIRMATION">Shipping confirmation</option>
          )}
          {refunds.length > 0 && (
            <option value="REFUND_CONFIRMATION">Refund confirmation</option>
          )}
        </select>
      </label>
      {kind === "REFUND_CONFIRMATION" && (
        <label>
          Refund
          <select name="refundId">
            {refunds.map((refund) => (
              <option value={refund.id} key={refund.id}>
                {refund.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <button disabled={pending}>
        {pending ? "Sending…" : "Send email again"}
      </button>
      <Result state={state} />
    </form>
  );
}
