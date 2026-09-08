import "server-only";
import { decimalRatio } from "./money";

export type FetchedRate = {
  quoteCurrency: "EUR" | "USD";
  numerator: bigint;
  denominator: bigint;
  effectiveAt: string;
  source: string;
};

export interface FxProvider {
  fetchRates(): Promise<FetchedRate[]>;
}

function cubeRate(xml: string, currency: "SEK" | "USD") {
  const match = xml.match(
    new RegExp(
      `<Cube\\s+currency=['"]${currency}['"]\\s+rate=['"]([^'"]+)['"]\\s*/?>`,
    ),
  );
  if (!match?.[1]) throw new Error(`ECB did not return a ${currency} rate.`);
  return decimalRatio(match[1]);
}

export class EcbFxProvider implements FxProvider {
  async fetchRates(): Promise<FetchedRate[]> {
    const response = await fetch(
      "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml",
      { cache: "no-store", signal: AbortSignal.timeout(10_000) },
    );
    if (!response.ok)
      throw new Error("ECB exchange rates could not be fetched.");
    const xml = await response.text();
    const date = xml.match(/<Cube\s+time=['"](\d{4}-\d{2}-\d{2})['"]>/)?.[1];
    if (!date) throw new Error("ECB exchange-rate date is missing.");
    const sek = cubeRate(xml, "SEK");
    const usd = cubeRate(xml, "USD");
    const effectiveAt = date + "T16:00:00.000Z";
    return [
      {
        quoteCurrency: "EUR",
        numerator: sek.denominator,
        denominator: sek.numerator,
        effectiveAt,
        source: "ECB reference rates",
      },
      {
        quoteCurrency: "USD",
        numerator: usd.numerator * sek.denominator,
        denominator: usd.denominator * sek.numerator,
        effectiveAt,
        source: "ECB reference rates",
      },
    ];
  }
}
