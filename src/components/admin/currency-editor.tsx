"use client";
import { useState, useTransition } from "react";
import {
  refreshCurrencyRatesAction,
  saveCurrencySettingsAction,
} from "@/modules/currency/actions";
import type { Currency } from "@/modules/currency/schema";

type Setting = {
  code: Currency;
  enabled: boolean;
  markup_basis_points: number;
  rounding_increment_minor: number;
};
type RateStatus = {
  code: "EUR" | "USD";
  source: string;
  effectiveAt: string;
  fetchedAt: string;
} | null;

export function CurrencyEditor({
  initial,
  rates,
}: {
  initial: Setting[];
  rates: RateStatus[];
}) {
  const [settings, setSettings] = useState(initial);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Currency</h1>
          <p className="section-intro">
            Product prices remain canonical SEK amounts. EUR and USD are display
            estimates derived from stored exchange rates.
          </p>
        </div>
      </div>
      {result && <p role={result.ok ? "status" : "alert"}>{result.message}</p>}
      <section className="admin-card">
        <h2>Exchange-rate status</h2>
        <p className="field-note">
          Rates are stored with their source and effective time. Missing rates
          disable that storefront currency instead of substituting a guessed
          value.
        </p>
        <table>
          <thead>
            <tr>
              <th>Currency</th>
              <th>Status</th>
              <th>Effective</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {(["EUR", "USD"] as const).map((code) => {
              const rate = rates.find((item) => item?.code === code);
              return (
                <tr key={code}>
                  <td>{code}</td>
                  <td>
                    <span
                      className={
                        "status-badge " + (rate ? "active" : "warning")
                      }
                    >
                      {rate ? "Available" : "Missing"}
                    </span>
                  </td>
                  <td>
                    {rate
                      ? new Date(rate.effectiveAt).toLocaleDateString("en-GB")
                      : "—"}
                  </td>
                  <td>{rate?.source ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="admin-actions">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const response = await refreshCurrencyRatesAction();
                setResult(response);
                if (response.ok) window.location.reload();
              })
            }
          >
            Refresh from ECB
          </button>
        </div>
      </section>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            setResult(await saveCurrencySettingsAction(settings));
          });
        }}
      >
        <fieldset disabled={pending}>
          <legend>Storefront currencies</legend>
          <p className="field-note">
            Markup is entered in basis points: 100 basis points equals 1%.
            Rounding increments are minor units: 100 equals one whole currency
            unit.
          </p>
          {settings.map((setting, index) => (
            <div className="admin-grid" key={setting.code}>
              <label>
                <span>{setting.code}</span>
                <span>
                  <input
                    type="checkbox"
                    checked={setting.enabled}
                    disabled={setting.code === "SEK"}
                    onChange={(event) =>
                      setSettings((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, enabled: event.target.checked }
                            : item,
                        ),
                      )
                    }
                  />
                  Enabled
                </span>
              </label>
              <label>
                Markup (basis points)
                <input
                  type="number"
                  min="0"
                  max="10000"
                  step="1"
                  value={setting.markup_basis_points}
                  disabled={setting.code === "SEK"}
                  onChange={(event) =>
                    setSettings((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              markup_basis_points: Number(event.target.value),
                            }
                          : item,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Rounding increment (minor units)
                <input
                  type="number"
                  min="1"
                  max="10000"
                  step="1"
                  value={setting.rounding_increment_minor}
                  disabled={setting.code === "SEK"}
                  onChange={(event) =>
                    setSettings((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              rounding_increment_minor: Number(
                                event.target.value,
                              ),
                            }
                          : item,
                      ),
                    )
                  }
                />
              </label>
            </div>
          ))}
        </fieldset>
        <div className="admin-save">
          <button disabled={pending}>
            {pending ? "Saving…" : "Save currency settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
