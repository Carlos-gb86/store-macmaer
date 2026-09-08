import { afterEach, describe, expect, it, vi } from "vitest";
import { getDemoCatalogue } from "@/modules/catalog/demo";
import {
  calculateBaseLinePrice,
  calculateProductStartingPrice,
} from "@/modules/pricing/calculate";
import {
  convertMinorAmount,
  decimalRatio,
  formatMoney,
} from "@/modules/currency/money";
import type { FxRate } from "@/modules/currency/schema";
import { canonicalizeSelections } from "@/modules/cart/selections";
import { EcbFxProvider } from "@/modules/currency/provider";

const catalogue = getDemoCatalogue();
function product(slug: string) {
  const item = catalogue.products.find((candidate) => candidate.slug === slug);
  if (!item) throw new Error("Missing fixture.");
  return structuredClone(item);
}
function rate(
  quoteCurrency: "EUR" | "USD",
  numerator: bigint,
  denominator: bigint,
): FxRate {
  return {
    id: crypto.randomUUID(),
    baseCurrency: "SEK",
    quoteCurrency,
    numerator,
    denominator,
    source: "test",
    effectiveAt: "2026-09-08T00:00:00.000Z",
    fetchedAt: "2026-09-08T00:00:00.000Z",
  };
}

describe("server-authoritative configured pricing", () => {
  it("uses variant overrides and adds explicitly price-affecting options", () => {
    const item = product("boucle-ball");
    const size = item.options[0]!;
    expect(
      calculateBaseLinePrice(item, { size: [size.values[1]!.id] }).amount,
    ).toBe(60_000);
    size.affects_price = true;
    size.values[1]!.price_delta = 2_500;
    expect(
      calculateBaseLinePrice(item, { size: [size.values[1]!.id] }).amount,
    ).toBe(62_500);
  });

  it("counts repeated selections once per occurrence", () => {
    const item = product("colour-accessory-pack");
    const colours = item.options[0]!;
    colours.affects_price = true;
    colours.values.forEach((value) => (value.price_delta = 125));
    const id = colours.values[0]!.id;
    expect(
      calculateBaseLinePrice(item, { colours: Array<string>(5).fill(id) })
        .amount,
    ).toBe(30_625);
    expect(calculateProductStartingPrice(item)).toBe(30_625);
  });

  it("rejects unavailable choices and prices below zero", () => {
    const item = product("cotton-knot");
    const option = item.options[0]!;
    expect(() =>
      calculateBaseLinePrice(item, { [option.key]: ["forged"] }),
    ).toThrow(/available/i);
    option.affects_price = true;
    option.values[0]!.price_delta = -70_000;
    expect(() =>
      calculateBaseLinePrice(item, {
        [option.key]: [option.values[0]!.id],
      }),
    ).toThrow(/supported range/i);
  });
});

describe("exact currency conversion", () => {
  it("rounds half up using integer ratios and configurable increments", () => {
    expect(convertMinorAmount(5, "EUR", rate("EUR", 1n, 2n))).toBe(3);
    expect(convertMinorAmount(65_000, "EUR", rate("EUR", 1n, 10n))).toBe(6_500);
    expect(
      convertMinorAmount(65_000, "EUR", rate("EUR", 1n, 10n), 100, 100),
    ).toBe(6_600);
    expect(convertMinorAmount(65_001, "SEK", null)).toBe(65_001);
  });

  it("parses provider decimals without floating point and formats minor units", () => {
    expect(decimalRatio("10.375")).toEqual({
      numerator: 10_375n,
      denominator: 1_000n,
    });
    expect(formatMoney(65_001, "USD")).toBe("650.01 USD");
    expect(() => decimalRatio("1e-3")).toThrow();
  });
});

describe("canonical cart selections", () => {
  it("preserves repeated positions and normalizes custom text", () => {
    const repeated = product("colour-accessory-pack");
    const values = repeated.options[0]!.values;
    const inputs = [
      values[1]!.id,
      values[0]!.id,
      values[1]!.id,
      values[2]!.id,
      values[3]!.id,
    ];
    expect(
      canonicalizeSelections(repeated, { colours: inputs }).selections.colours,
    ).toEqual(inputs);

    const custom = product("cotton-knot");
    const fabric = custom.options[0]!.values[0]!.id;
    expect(
      canonicalizeSelections(custom, {
        fabric: [fabric],
        personalization: ["  Maja  "],
      }).selections.personalization,
    ).toEqual(["Maja"]);
  });
});

describe("ECB provider adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("derives exact SEK-to-EUR and SEK-to-USD cross rates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            `<Cube><Cube time='2026-09-08'><Cube currency='USD' rate='1.2'/><Cube currency='SEK' rate='10'/></Cube></Cube>`,
          ),
      ),
    );
    const rates = await new EcbFxProvider().fetchRates();
    expect(rates[0]).toMatchObject({
      quoteCurrency: "EUR",
      numerator: 1n,
      denominator: 10n,
    });
    expect(rates[1]).toMatchObject({
      quoteCurrency: "USD",
      numerator: 12n,
      denominator: 100n,
    });
  });
});
