"use client";
import { useState, useTransition } from "react";
import type { MutationResult } from "@/modules/admin/result";
import type { ShippingAdminInput } from "@/modules/shipping/admin-schema";
import { saveShippingSettingsAction } from "@/modules/shipping/actions";

type Zone = ShippingAdminInput["zones"][number];
type Method = Zone["methods"][number];
type Rule = Method["rules"][number];

function newRule(): Rule {
  return {
    id: crypto.randomUUID(),
    calculation_type: "BASE_PLUS_ADDITIONAL",
    base_amount: "0.00",
    additional_item_amount: "0.00",
    min_weight_grams: 0,
    max_weight_grams: null,
    min_subtotal: "0.00",
    max_subtotal: "",
    package_class_key: null,
    free_shipping_threshold: "",
    threshold_basis: "AFTER_DISCOUNT",
    price_includes_vat: false,
    shipping_tax_category_key: "standard_goods",
    active: true,
    priority: 0,
  };
}

function newMethod(): Method {
  return {
    id: crypto.randomUUID(),
    name: "Tracked delivery",
    carrier: null,
    tracked: true,
    estimated_delivery: "",
    active: true,
    sort_order: 0,
    rules: [newRule()],
  };
}

function MoneyInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <input
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function ShippingEditor({
  initial,
  availableCountries,
  taxCategories,
}: {
  initial: ShippingAdminInput;
  availableCountries: { code: string; name: string }[];
  taxCategories: { key: string; name: string }[];
}) {
  const [value, setValue] = useState(initial);
  const [countryToAdd, setCountryToAdd] = useState("");
  const [result, setResult] = useState<MutationResult | null>(null);
  const [pending, startTransition] = useTransition();
  const updateZone = (zoneIndex: number, update: (zone: Zone) => Zone) =>
    setValue((current) => ({
      ...current,
      zones: current.zones.map((zone, index) =>
        index === zoneIndex ? update(zone) : zone,
      ),
    }));
  const updateMethod = (
    zoneIndex: number,
    methodIndex: number,
    update: (method: Method) => Method,
  ) =>
    updateZone(zoneIndex, (zone) => ({
      ...zone,
      methods: zone.methods.map((method, index) =>
        index === methodIndex ? update(method) : method,
      ),
    }));
  const updateRule = (
    zoneIndex: number,
    methodIndex: number,
    ruleIndex: number,
    update: (rule: Rule) => Rule,
  ) =>
    updateMethod(zoneIndex, methodIndex, (method) => ({
      ...method,
      rules: method.rules.map((rule, index) =>
        index === ruleIndex ? update(rule) : rule,
      ),
    }));
  const unsupportedCountries = availableCountries.filter(
    (country) =>
      !value.countries.some((item) => item.country_code === country.code),
  );
  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Shipping</h1>
          <p className="section-intro">
            Configure supported countries, delivery zones and server-calculated
            rate formulas. All amounts are entered in SEK.
          </p>
        </div>
      </div>
      {result && <p role={result.ok ? "status" : "alert"}>{result.message}</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const response = await saveShippingSettingsAction(value);
            setResult(response);
          });
        }}
      >
        <fieldset disabled={pending}>
          <legend>Package defaults</legend>
          <label>
            Packaging allowance (grams)
            <input
              type="number"
              min="0"
              step="1"
              value={value.packaging_weight_grams}
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  packaging_weight_grams: Number(event.target.value),
                }))
              }
            />
          </label>
          <div className="admin-repeat-list">
            {value.package_classes.map((item, index) => (
              <div className="admin-grid" key={item.key}>
                <label>
                  Key
                  <input
                    value={item.key}
                    onChange={(event) =>
                      setValue((current) => ({
                        ...current,
                        package_classes: current.package_classes.map(
                          (candidate, itemIndex) =>
                            itemIndex === index
                              ? { ...candidate, key: event.target.value }
                              : candidate,
                        ),
                      }))
                    }
                  />
                </label>
                <label>
                  Name
                  <input
                    value={item.name}
                    onChange={(event) =>
                      setValue((current) => ({
                        ...current,
                        package_classes: current.package_classes.map(
                          (candidate, itemIndex) =>
                            itemIndex === index
                              ? { ...candidate, name: event.target.value }
                              : candidate,
                        ),
                      }))
                    }
                  />
                </label>
                <label className="admin-check-inline">
                  <input
                    type="checkbox"
                    checked={item.active}
                    onChange={(event) =>
                      setValue((current) => ({
                        ...current,
                        package_classes: current.package_classes.map(
                          (candidate, itemIndex) =>
                            itemIndex === index
                              ? { ...candidate, active: event.target.checked }
                              : candidate,
                        ),
                      }))
                    }
                  />
                  Active
                </label>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              setValue((current) => ({
                ...current,
                package_classes: [
                  ...current.package_classes,
                  {
                    key: `class_${current.package_classes.length + 1}`,
                    name: "New class",
                    active: true,
                  },
                ],
              }))
            }
          >
            Add package class
          </button>
        </fieldset>

        <fieldset disabled={pending}>
          <legend>Supported destinations</legend>
          <div className="admin-add-row">
            <select
              aria-label="Country to add"
              value={countryToAdd}
              onChange={(event) => setCountryToAdd(event.target.value)}
            >
              <option value="">Choose country…</option>
              {unsupportedCountries.map((country) => (
                <option value={country.code} key={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!countryToAdd}
              onClick={() => {
                const firstZone = value.zones[0];
                if (!firstZone || !countryToAdd) return;
                setValue((current) => ({
                  ...current,
                  countries: [
                    ...current.countries,
                    { country_code: countryToAdd, zone_id: firstZone.id },
                  ],
                }));
                setCountryToAdd("");
              }}
            >
              Add destination
            </button>
          </div>
          <div className="admin-country-grid">
            {value.countries
              .map((country) => ({
                ...country,
                name:
                  availableCountries.find(
                    (item) => item.code === country.country_code,
                  )?.name ?? country.country_code,
              }))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((country) => (
                <div key={country.country_code}>
                  <span>{country.name}</span>
                  <select
                    aria-label={`${country.name} shipping zone`}
                    value={country.zone_id}
                    onChange={(event) =>
                      setValue((current) => ({
                        ...current,
                        countries: current.countries.map((item) =>
                          item.country_code === country.country_code
                            ? { ...item, zone_id: event.target.value }
                            : item,
                        ),
                      }))
                    }
                  >
                    {value.zones.map((zone) => (
                      <option value={zone.id} key={zone.id}>
                        {zone.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() =>
                      setValue((current) => ({
                        ...current,
                        countries: current.countries.filter(
                          (item) => item.country_code !== country.country_code,
                        ),
                      }))
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
          </div>
        </fieldset>

        <fieldset disabled={pending}>
          <legend>Zones, services and formulas</legend>
          <p className="field-note">
            Base plus additional calculates base + (quantity − 1) × additional.
            Weight and subtotal limits are inclusive. Leave maximums blank for
            no upper limit.
          </p>
          {value.zones.map((zone, zoneIndex) => (
            <details
              className="admin-card admin-config-card"
              open
              key={zone.id}
            >
              <summary>{zone.name}</summary>
              <div className="admin-grid">
                <label>
                  Zone name
                  <input
                    value={zone.name}
                    onChange={(event) =>
                      updateZone(zoneIndex, (item) => ({
                        ...item,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Zone key
                  <input
                    value={zone.key}
                    onChange={(event) =>
                      updateZone(zoneIndex, (item) => ({
                        ...item,
                        key: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="admin-check-inline">
                  <input
                    type="checkbox"
                    checked={zone.active}
                    onChange={(event) =>
                      updateZone(zoneIndex, (item) => ({
                        ...item,
                        active: event.target.checked,
                      }))
                    }
                  />
                  Active zone
                </label>
              </div>
              {zone.methods.map((method, methodIndex) => (
                <section className="admin-nested-card" key={method.id}>
                  <div className="admin-grid">
                    <label>
                      Service name
                      <input
                        value={method.name}
                        onChange={(event) =>
                          updateMethod(zoneIndex, methodIndex, (item) => ({
                            ...item,
                            name: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Carrier (optional)
                      <input
                        value={method.carrier ?? ""}
                        onChange={(event) =>
                          updateMethod(zoneIndex, methodIndex, (item) => ({
                            ...item,
                            carrier: event.target.value || null,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Delivery estimate
                      <input
                        value={method.estimated_delivery}
                        onChange={(event) =>
                          updateMethod(zoneIndex, methodIndex, (item) => ({
                            ...item,
                            estimated_delivery: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="admin-check-inline">
                      <input
                        type="checkbox"
                        checked={method.tracked}
                        onChange={(event) =>
                          updateMethod(zoneIndex, methodIndex, (item) => ({
                            ...item,
                            tracked: event.target.checked,
                          }))
                        }
                      />
                      Tracked
                    </label>
                    <label className="admin-check-inline">
                      <input
                        type="checkbox"
                        checked={method.active}
                        onChange={(event) =>
                          updateMethod(zoneIndex, methodIndex, (item) => ({
                            ...item,
                            active: event.target.checked,
                          }))
                        }
                      />
                      Active service
                    </label>
                  </div>
                  {method.rules.map((rule, ruleIndex) => (
                    <div className="admin-rate-rule" key={rule.id}>
                      <div className="admin-grid">
                        <label>
                          Formula
                          <select
                            value={rule.calculation_type}
                            onChange={(event) =>
                              updateRule(
                                zoneIndex,
                                methodIndex,
                                ruleIndex,
                                (item) => ({
                                  ...item,
                                  calculation_type: event.target
                                    .value as Rule["calculation_type"],
                                }),
                              )
                            }
                          >
                            <option value="FLAT">Flat fee</option>
                            <option value="BASE_PLUS_ADDITIONAL">
                              Base + additional items
                            </option>
                            <option value="PER_ITEM">Price per item</option>
                          </select>
                        </label>
                        <MoneyInput
                          label="Base / per-item fee (SEK)"
                          value={rule.base_amount}
                          onChange={(base_amount) =>
                            updateRule(
                              zoneIndex,
                              methodIndex,
                              ruleIndex,
                              (item) => ({ ...item, base_amount }),
                            )
                          }
                        />
                        <MoneyInput
                          label="Additional-item fee (SEK)"
                          value={rule.additional_item_amount}
                          onChange={(additional_item_amount) =>
                            updateRule(
                              zoneIndex,
                              methodIndex,
                              ruleIndex,
                              (item) => ({ ...item, additional_item_amount }),
                            )
                          }
                        />
                        <MoneyInput
                          label="Free over (SEK, optional)"
                          value={rule.free_shipping_threshold}
                          onChange={(free_shipping_threshold) =>
                            updateRule(
                              zoneIndex,
                              methodIndex,
                              ruleIndex,
                              (item) => ({ ...item, free_shipping_threshold }),
                            )
                          }
                        />
                        <MoneyInput
                          label="Minimum subtotal (SEK)"
                          value={rule.min_subtotal}
                          onChange={(min_subtotal) =>
                            updateRule(
                              zoneIndex,
                              methodIndex,
                              ruleIndex,
                              (item) => ({ ...item, min_subtotal }),
                            )
                          }
                        />
                        <MoneyInput
                          label="Maximum subtotal (SEK, optional)"
                          value={rule.max_subtotal}
                          onChange={(max_subtotal) =>
                            updateRule(
                              zoneIndex,
                              methodIndex,
                              ruleIndex,
                              (item) => ({ ...item, max_subtotal }),
                            )
                          }
                        />
                        <label>
                          Minimum weight (g)
                          <input
                            type="number"
                            min="0"
                            value={rule.min_weight_grams}
                            onChange={(event) =>
                              updateRule(
                                zoneIndex,
                                methodIndex,
                                ruleIndex,
                                (item) => ({
                                  ...item,
                                  min_weight_grams: Number(event.target.value),
                                }),
                              )
                            }
                          />
                        </label>
                        <label>
                          Maximum weight (g, optional)
                          <input
                            type="number"
                            min="0"
                            value={rule.max_weight_grams ?? ""}
                            onChange={(event) =>
                              updateRule(
                                zoneIndex,
                                methodIndex,
                                ruleIndex,
                                (item) => ({
                                  ...item,
                                  max_weight_grams: event.target.value
                                    ? Number(event.target.value)
                                    : null,
                                }),
                              )
                            }
                          />
                        </label>
                        <label>
                          Package class
                          <select
                            value={rule.package_class_key ?? ""}
                            onChange={(event) =>
                              updateRule(
                                zoneIndex,
                                methodIndex,
                                ruleIndex,
                                (item) => ({
                                  ...item,
                                  package_class_key: event.target.value || null,
                                }),
                              )
                            }
                          >
                            <option value="">Any class</option>
                            {value.package_classes
                              .filter((item) => item.active)
                              .map((item) => (
                                <option key={item.key} value={item.key}>
                                  {item.name}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label>
                          Free-shipping threshold uses
                          <select
                            value={rule.threshold_basis}
                            onChange={(event) =>
                              updateRule(
                                zoneIndex,
                                methodIndex,
                                ruleIndex,
                                (item) => ({
                                  ...item,
                                  threshold_basis: event.target
                                    .value as Rule["threshold_basis"],
                                }),
                              )
                            }
                          >
                            <option value="AFTER_DISCOUNT">
                              Subtotal after discount
                            </option>
                            <option value="BEFORE_DISCOUNT">
                              Subtotal before discount
                            </option>
                          </select>
                        </label>
                        <label>
                          Shipping tax category
                          <select
                            value={rule.shipping_tax_category_key}
                            onChange={(event) =>
                              updateRule(
                                zoneIndex,
                                methodIndex,
                                ruleIndex,
                                (item) => ({
                                  ...item,
                                  shipping_tax_category_key: event.target.value,
                                }),
                              )
                            }
                          >
                            {taxCategories.map((item) => (
                              <option value={item.key} key={item.key}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Rule priority
                          <input
                            type="number"
                            step="1"
                            value={rule.priority}
                            onChange={(event) =>
                              updateRule(
                                zoneIndex,
                                methodIndex,
                                ruleIndex,
                                (item) => ({
                                  ...item,
                                  priority: Number(event.target.value),
                                }),
                              )
                            }
                          />
                        </label>
                        <label className="admin-check-inline">
                          <input
                            type="checkbox"
                            checked={rule.price_includes_vat}
                            onChange={(event) =>
                              updateRule(
                                zoneIndex,
                                methodIndex,
                                ruleIndex,
                                (item) => ({
                                  ...item,
                                  price_includes_vat: event.target.checked,
                                }),
                              )
                            }
                          />
                          Entered fee includes VAT
                        </label>
                        <label className="admin-check-inline">
                          <input
                            type="checkbox"
                            checked={rule.active}
                            onChange={(event) =>
                              updateRule(
                                zoneIndex,
                                methodIndex,
                                ruleIndex,
                                (item) => ({
                                  ...item,
                                  active: event.target.checked,
                                }),
                              )
                            }
                          />
                          Active rule
                        </label>
                      </div>
                      <button
                        type="button"
                        className="text-link cart-remove"
                        disabled={method.rules.length === 1}
                        onClick={() =>
                          updateMethod(zoneIndex, methodIndex, (item) => ({
                            ...item,
                            rules: item.rules.filter(
                              (_, index) => index !== ruleIndex,
                            ),
                          }))
                        }
                      >
                        Remove rate rule
                      </button>
                    </div>
                  ))}
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        updateMethod(zoneIndex, methodIndex, (item) => ({
                          ...item,
                          rules: [
                            ...item.rules,
                            { ...newRule(), priority: item.rules.length },
                          ],
                        }))
                      }
                    >
                      Add rate rule
                    </button>
                    <button
                      type="button"
                      className="text-link cart-remove"
                      disabled={zone.methods.length === 1}
                      onClick={() =>
                        updateZone(zoneIndex, (item) => ({
                          ...item,
                          methods: item.methods.filter(
                            (_, index) => index !== methodIndex,
                          ),
                        }))
                      }
                    >
                      Remove service
                    </button>
                  </div>
                </section>
              ))}
              <div className="admin-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    updateZone(zoneIndex, (item) => ({
                      ...item,
                      methods: [
                        ...item.methods,
                        { ...newMethod(), sort_order: item.methods.length },
                      ],
                    }))
                  }
                >
                  Add service
                </button>
                <button
                  type="button"
                  className="text-link cart-remove"
                  disabled={value.zones.length === 1}
                  onClick={() =>
                    setValue((current) => ({
                      ...current,
                      zones: current.zones.filter(
                        (_, index) => index !== zoneIndex,
                      ),
                      countries: current.countries.filter(
                        (country) => country.zone_id !== zone.id,
                      ),
                    }))
                  }
                >
                  Remove zone
                </button>
              </div>
            </details>
          ))}
          <button
            type="button"
            className="secondary"
            onClick={() =>
              setValue((current) => ({
                ...current,
                zones: [
                  ...current.zones,
                  {
                    id: crypto.randomUUID(),
                    key: `zone_${current.zones.length + 1}`,
                    name: "New zone",
                    active: false,
                    sort_order: current.zones.length,
                    methods: [newMethod()],
                  },
                ],
              }))
            }
          >
            Add zone
          </button>
        </fieldset>
        <div className="admin-save">
          <button disabled={pending}>
            {pending ? "Saving…" : "Save shipping settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
