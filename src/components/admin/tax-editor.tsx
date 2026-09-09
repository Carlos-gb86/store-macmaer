"use client";
import { useState, useTransition } from "react";
import type { MutationResult } from "@/modules/admin/result";
import type { TaxAdminInput } from "@/modules/tax/admin-schema";
import { saveTaxSettingsAction } from "@/modules/tax/actions";

export function TaxEditor({
  initial,
  countries,
}: {
  initial: TaxAdminInput;
  countries: { code: string; name: string }[];
}) {
  const [value, setValue] = useState(initial);
  const [result, setResult] = useState<MutationResult | null>(null);
  const [pending, startTransition] = useTransition();
  const markReviewed = () => {
    const now = new Date().toISOString();
    setValue((current) => ({
      ...current,
      reviewed_at: now,
      rules: current.rules.map((rule) => ({ ...rule, reviewed_at: now })),
    }));
  };
  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Tax and VAT</h1>
          <p className="section-intro">
            Catalogue prices are customer-facing amounts. Destination VAT is
            extracted from that amount; non-EU exports retain the same selling
            price with zero EU VAT.
          </p>
        </div>
      </div>
      <div className="admin-warning" role="note">
        Tax configuration is legally sensitive. The imported standard rates are
        sourced from the European Commission but remain marked for owner or
        accountant review.
      </div>
      {result && <p role={result.ok ? "status" : "alert"}>{result.message}</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            setResult(await saveTaxSettingsAction(value));
          });
        }}
      >
        <fieldset disabled={pending}>
          <legend>Tax strategy</legend>
          <div className="admin-grid">
            <label>
              EU VAT mode
              <select
                value={value.eu_mode}
                onChange={(event) =>
                  setValue((current) => ({
                    ...current,
                    eu_mode: event.target.value as TaxAdminInput["eu_mode"],
                  }))
                }
              >
                <option value="DESTINATION">Destination VAT / OSS</option>
                <option value="SWEDISH_ORIGIN">Swedish-origin VAT</option>
              </select>
            </label>
            <label className="admin-check-inline">
              <input
                type="checkbox"
                checked={value.catalogue_prices_include_vat}
                onChange={(event) =>
                  setValue((current) => ({
                    ...current,
                    catalogue_prices_include_vat: event.target.checked,
                  }))
                }
              />
              Catalogue prices include VAT
            </label>
            <label>
              Export VAT (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={value.export_rate_basis_points / 100}
                onChange={(event) =>
                  setValue((current) => ({
                    ...current,
                    export_rate_basis_points: Math.round(
                      Number(event.target.value) * 100,
                    ),
                  }))
                }
              />
            </label>
          </div>
          <label>
            Non-EU customer message
            <textarea
              value={value.export_message}
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  export_message: event.target.value,
                }))
              }
            />
          </label>
          <button type="button" className="secondary" onClick={markReviewed}>
            Mark current settings and rates reviewed
          </button>
          <p className="field-note">
            Review status: {value.reviewed_at ? "reviewed" : "review required"}
          </p>
        </fieldset>

        <fieldset disabled={pending}>
          <legend>Tax categories</legend>
          {value.categories.map((category, index) => (
            <div className="admin-grid" key={`${category.key}-${index}`}>
              <label>
                Key
                <input
                  value={category.key}
                  onChange={(event) =>
                    setValue((current) => ({
                      ...current,
                      categories: current.categories.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, key: event.target.value }
                          : item,
                      ),
                    }))
                  }
                />
              </label>
              <label>
                Name
                <input
                  value={category.name}
                  onChange={(event) =>
                    setValue((current) => ({
                      ...current,
                      categories: current.categories.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, name: event.target.value }
                          : item,
                      ),
                    }))
                  }
                />
              </label>
              <label className="admin-check-inline">
                <input
                  type="checkbox"
                  checked={category.active}
                  onChange={(event) =>
                    setValue((current) => ({
                      ...current,
                      categories: current.categories.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, active: event.target.checked }
                          : item,
                      ),
                    }))
                  }
                />
                Active
              </label>
            </div>
          ))}
          <button
            type="button"
            className="secondary"
            onClick={() =>
              setValue((current) => ({
                ...current,
                categories: [
                  ...current.categories,
                  {
                    key: `category_${current.categories.length + 1}`,
                    name: "New category",
                    active: false,
                  },
                ],
              }))
            }
          >
            Add category
          </button>
        </fieldset>

        <fieldset disabled={pending}>
          <legend>Destination VAT rates</legend>
          <div className="admin-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Destination</th>
                  <th>Category</th>
                  <th>Rate</th>
                  <th>Valid from</th>
                  <th>Valid to</th>
                  <th>Source</th>
                  <th>Reviewed</th>
                  <th>Enabled</th>
                </tr>
              </thead>
              <tbody>
                {value.rules.map((rule, index) => (
                  <tr key={rule.id}>
                    <td>
                      <select
                        aria-label={`Tax destination ${index + 1}`}
                        value={rule.country_code}
                        onChange={(event) =>
                          setValue((current) => ({
                            ...current,
                            rules: current.rules.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, country_code: event.target.value }
                                : item,
                            ),
                          }))
                        }
                      >
                        {countries.map((country) => (
                          <option value={country.code} key={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        aria-label={`Tax category ${index + 1}`}
                        value={rule.tax_category_key}
                        onChange={(event) =>
                          setValue((current) => ({
                            ...current,
                            rules: current.rules.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    tax_category_key: event.target.value,
                                  }
                                : item,
                            ),
                          }))
                        }
                      >
                        {value.categories.map((category) => (
                          <option value={category.key} key={category.key}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <label
                        className="sr-only"
                        htmlFor={`tax-rate-${rule.id}`}
                      >
                        VAT rate percent
                      </label>
                      <input
                        id={`tax-rate-${rule.id}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={rule.rate_basis_points / 100}
                        onChange={(event) =>
                          setValue((current) => ({
                            ...current,
                            rules: current.rules.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    rate_basis_points: Math.round(
                                      Number(event.target.value) * 100,
                                    ),
                                  }
                                : item,
                            ),
                          }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Valid from ${index + 1}`}
                        type="date"
                        value={rule.valid_from}
                        onChange={(event) =>
                          setValue((current) => ({
                            ...current,
                            rules: current.rules.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, valid_from: event.target.value }
                                : item,
                            ),
                          }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Valid to ${index + 1}`}
                        type="date"
                        value={rule.valid_to ?? ""}
                        onChange={(event) =>
                          setValue((current) => ({
                            ...current,
                            rules: current.rules.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    valid_to: event.target.value || null,
                                  }
                                : item,
                            ),
                          }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Tax source ${index + 1}`}
                        value={rule.source}
                        onChange={(event) =>
                          setValue((current) => ({
                            ...current,
                            rules: current.rules.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, source: event.target.value }
                                : item,
                            ),
                          }))
                        }
                      />
                    </td>
                    <td>{rule.reviewed_at ? "Yes" : "Required"}</td>
                    <td>
                      <input
                        aria-label={`Enable tax rule ${index + 1}`}
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(event) =>
                          setValue((current) => ({
                            ...current,
                            rules: current.rules.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, enabled: event.target.checked }
                                : item,
                            ),
                          }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              setValue((current) => ({
                ...current,
                rules: [
                  ...current.rules,
                  {
                    id: crypto.randomUUID(),
                    country_code: "SE",
                    tax_category_key:
                      current.categories[0]?.key ?? "standard_goods",
                    rate_basis_points: 2500,
                    valid_from: new Date().toISOString().slice(0, 10),
                    valid_to: null,
                    enabled: false,
                    source: "",
                    reviewed_at: null,
                  },
                ],
              }))
            }
          >
            Add tax rule
          </button>
        </fieldset>
        <div className="admin-save">
          <button disabled={pending}>
            {pending ? "Saving…" : "Save tax settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
