"use client";
import { useState, useTransition } from "react";
import type { MutationResult } from "@/modules/admin/result";
import type { DiscountsAdminInput } from "@/modules/discount/admin-schema";
import { saveDiscountsAction } from "@/modules/discount/admin-actions";

type Discount = DiscountsAdminInput[number];

function newDiscount(): Discount {
  return {
    id: crypto.randomUUID(),
    code: "NEWCODE",
    name: "New discount",
    kind: "PERCENTAGE",
    percentage_basis_points: 1000,
    fixed_amount: "",
    minimum_subtotal: "0.00",
    starts_at: null,
    ends_at: null,
    active: false,
    total_usage_limit: null,
    per_customer_limit: 1,
    product_ids: [],
    collection_ids: [],
  };
}

export function DiscountEditor({
  initial,
  products,
  collections,
  redemptionCounts,
}: {
  initial: DiscountsAdminInput;
  products: { id: string; title: string }[];
  collections: { id: string; name: string }[];
  redemptionCounts: Record<string, number>;
}) {
  const [value, setValue] = useState(initial);
  const [result, setResult] = useState<MutationResult | null>(null);
  const [pending, startTransition] = useTransition();
  const update = (index: number, change: (discount: Discount) => Discount) =>
    setValue((current) =>
      current.map((discount, itemIndex) =>
        itemIndex === index ? change(discount) : discount,
      ),
    );
  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Discounts</h1>
          <p className="section-intro">
            Codes are evaluated against live cart prices on the server. Final
            one-per-customer checks use both normalized email and phone during
            Phase 5 checkout.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setValue((current) => [...current, newDiscount()])}
        >
          Add discount
        </button>
      </div>
      {result && <p role={result.ok ? "status" : "alert"}>{result.message}</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () =>
            setResult(await saveDiscountsAction(value)),
          );
        }}
      >
        <fieldset disabled={pending} className="admin-config-list">
          <legend>Promotion codes</legend>
          {value.map((discount, index) => (
            <details
              className="admin-card admin-config-card"
              open
              key={discount.id}
            >
              <summary>
                {discount.code} · {discount.active ? "Active" : "Inactive"}
              </summary>
              <div className="admin-grid">
                <label>
                  Code
                  <input
                    value={discount.code}
                    onChange={(event) =>
                      update(index, (item) => ({
                        ...item,
                        code: event.target.value.toUpperCase(),
                      }))
                    }
                  />
                </label>
                <label>
                  Internal name
                  <input
                    value={discount.name}
                    onChange={(event) =>
                      update(index, (item) => ({
                        ...item,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Type
                  <select
                    value={discount.kind}
                    onChange={(event) =>
                      update(index, (item) => ({
                        ...item,
                        kind: event.target.value as Discount["kind"],
                      }))
                    }
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED_AMOUNT">Fixed SEK amount</option>
                  </select>
                </label>
                {discount.kind === "PERCENTAGE" ? (
                  <label>
                    Discount (%)
                    <input
                      type="number"
                      min="0.01"
                      max="100"
                      step="0.01"
                      value={(discount.percentage_basis_points ?? 0) / 100}
                      onChange={(event) =>
                        update(index, (item) => ({
                          ...item,
                          percentage_basis_points: Math.round(
                            Number(event.target.value) * 100,
                          ),
                        }))
                      }
                    />
                  </label>
                ) : (
                  <label>
                    Fixed discount (SEK)
                    <input
                      inputMode="decimal"
                      value={discount.fixed_amount}
                      onChange={(event) =>
                        update(index, (item) => ({
                          ...item,
                          fixed_amount: event.target.value,
                        }))
                      }
                    />
                  </label>
                )}
                <label>
                  Minimum cart subtotal (SEK)
                  <input
                    inputMode="decimal"
                    value={discount.minimum_subtotal}
                    onChange={(event) =>
                      update(index, (item) => ({
                        ...item,
                        minimum_subtotal: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Starts (optional)
                  <input
                    type="datetime-local"
                    value={discount.starts_at ?? ""}
                    onChange={(event) =>
                      update(index, (item) => ({
                        ...item,
                        starts_at: event.target.value || null,
                      }))
                    }
                  />
                </label>
                <label>
                  Ends (optional)
                  <input
                    type="datetime-local"
                    value={discount.ends_at ?? ""}
                    onChange={(event) =>
                      update(index, (item) => ({
                        ...item,
                        ends_at: event.target.value || null,
                      }))
                    }
                  />
                </label>
                <label>
                  Total usage limit (optional)
                  <input
                    type="number"
                    min="1"
                    value={discount.total_usage_limit ?? ""}
                    onChange={(event) =>
                      update(index, (item) => ({
                        ...item,
                        total_usage_limit: event.target.value
                          ? Number(event.target.value)
                          : null,
                      }))
                    }
                  />
                </label>
                <label>
                  Uses per email or phone (optional)
                  <input
                    type="number"
                    min="1"
                    value={discount.per_customer_limit ?? ""}
                    onChange={(event) =>
                      update(index, (item) => ({
                        ...item,
                        per_customer_limit: event.target.value
                          ? Number(event.target.value)
                          : null,
                      }))
                    }
                  />
                </label>
                <label className="admin-check-inline">
                  <input
                    type="checkbox"
                    checked={discount.active}
                    onChange={(event) =>
                      update(index, (item) => ({
                        ...item,
                        active: event.target.checked,
                      }))
                    }
                  />
                  Active
                </label>
              </div>
              <p className="field-note">
                Completed redemptions: {redemptionCounts[discount.id] ?? 0}
              </p>
              <div className="admin-grid">
                <details>
                  <summary>Restrict to products</summary>
                  <p className="field-note">
                    No selections means all products.
                  </p>
                  {products.map((product) => (
                    <label className="admin-check-inline" key={product.id}>
                      <input
                        type="checkbox"
                        checked={discount.product_ids.includes(product.id)}
                        onChange={(event) =>
                          update(index, (item) => ({
                            ...item,
                            product_ids: event.target.checked
                              ? [...item.product_ids, product.id]
                              : item.product_ids.filter(
                                  (id) => id !== product.id,
                                ),
                          }))
                        }
                      />
                      {product.title}
                    </label>
                  ))}
                </details>
                <details>
                  <summary>Restrict to collections</summary>
                  <p className="field-note">
                    No selections means all collections.
                  </p>
                  {collections.map((collection) => (
                    <label className="admin-check-inline" key={collection.id}>
                      <input
                        type="checkbox"
                        checked={discount.collection_ids.includes(
                          collection.id,
                        )}
                        onChange={(event) =>
                          update(index, (item) => ({
                            ...item,
                            collection_ids: event.target.checked
                              ? [...item.collection_ids, collection.id]
                              : item.collection_ids.filter(
                                  (id) => id !== collection.id,
                                ),
                          }))
                        }
                      />
                      {collection.name}
                    </label>
                  ))}
                </details>
              </div>
            </details>
          ))}
        </fieldset>
        <div className="admin-save">
          <button disabled={pending}>
            {pending ? "Saving…" : "Save discounts"}
          </button>
        </div>
      </form>
    </div>
  );
}
