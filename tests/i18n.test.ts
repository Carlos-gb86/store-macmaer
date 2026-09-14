import { describe, expect, it } from "vitest";
import { getDemoCatalogue } from "@/modules/catalog/demo";
import { validateSelections } from "@/modules/catalog/selection";
import { localizedCountries } from "@/modules/country/countries";
import { countryFlag } from "@/modules/country/flag";
import {
  localizeCatalogue,
  localizeCollection,
  localizeProduct,
} from "@/modules/i18n/localize";
import { localizeCommerceMessage } from "@/modules/i18n/commerce";

const catalogue = getDemoCatalogue();

describe("storefront localization", () => {
  it("uses Swedish product copy recursively and falls back to English", () => {
    const source = catalogue.products.find(
      (product) => product.slug === "velvet-knot",
    )!;
    const translated = localizeProduct(
      {
        ...source,
        title_sv: "Svensk titel",
        description_sv: null,
        options: source.options.map((option, optionIndex) => ({
          ...option,
          label_sv: optionIndex === 0 ? "Svenskt alternativ" : null,
          values: option.values.map((value, valueIndex) => ({
            ...value,
            label_sv: valueIndex === 0 ? "Svenskt värde" : null,
          })),
        })),
        images: source.images.map((image, index) => ({
          ...image,
          alt_sv: index === 0 ? "Svensk bildtext" : null,
        })),
      },
      "sv",
    );

    expect(translated.title).toBe("Svensk titel");
    expect(translated.description).toBe(source.description);
    expect(translated.options[0]?.label).toBe("Svenskt alternativ");
    expect(translated.options[0]?.values[0]?.label).toBe("Svenskt värde");
    expect(translated.images[0]?.alt).toBe("Svensk bildtext");
    expect(source.title).not.toBe("Svensk titel");
  });

  it("localizes collection and tag display names without changing stable slugs", () => {
    const sourceCollection = catalogue.collections[0]!;
    const collection = localizeCollection(
      { ...sourceCollection, name_sv: "Svensk kollektion" },
      "sv",
    );
    const localized = localizeCatalogue(
      {
        ...catalogue,
        tagDefinitions: [
          {
            id: "c7930013-1aca-4ee2-86d7-a3ea8813b6c1",
            slug: "handmade",
            name: "Handmade",
            name_sv: "Handgjord",
          },
        ],
      },
      "sv",
    );

    expect(collection.name).toBe("Svensk kollektion");
    expect(collection.slug).toBe(sourceCollection.slug);
    expect(localized.tagDefinitions[0]).toMatchObject({
      slug: "handmade",
      name: "Handgjord",
    });
  });

  it("uses localized country and commerce labels", () => {
    expect(
      localizedCountries("sv").find(({ code }) => code === "SE")?.name,
    ).toBe("Sverige");
    expect(
      localizeCommerceMessage(
        "That discount code has reached its usage limit.",
        "sv",
      ),
    ).toBe("Rabattkodens användningsgräns har nåtts.");
    expect(countryFlag("SE")).toBe("🇸🇪");
    expect(countryFlag("not-a-country")).toBe("");
  });

  it("returns Swedish product-configuration validation", () => {
    const source = catalogue.products.find(
      (product) => product.slug === "velvet-knot",
    )!;
    const localized = localizeProduct(
      {
        ...source,
        options: source.options.map((option) => ({
          ...option,
          label_sv: option.key === "colour" ? "Färg" : "Storlek",
        })),
      },
      "sv",
    );

    expect(validateSelections(localized, {}, "sv")).toContain("Välj färg.");
  });
});
