import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { Json } from "@/lib/supabase/database.types";
import { getServerEnv } from "@/lib/env/server";
import { productSchema, type Product } from "@/modules/catalog/schema";
import { isAvailable } from "@/modules/catalog/selection";
import { currencySchema, type PricingContext } from "@/modules/currency/schema";
import {
  getStorefrontContext,
  type StorefrontContext,
} from "@/modules/currency/repository";
import { calculateUnitWeight } from "@/modules/shipping/weight";
import {
  calculateBaseLinePrice,
  displayAmount,
} from "@/modules/pricing/calculate";
import {
  addCartItemSchema,
  cartOptionsSnapshotSchema,
  CartValidationError,
  type CartLine,
  type CartView,
  type MiniCartView,
} from "./schema";
import { canonicalizeSelections, selectionsFromSnapshot } from "./selections";

export const CART_COOKIE = "macmaer_cart";
const MAX_AGE = 60 * 60 * 24 * 90;

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function cartCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
    priority: "high" as const,
  };
}

async function cartToken() {
  return (await cookies()).get(CART_COOKIE)?.value;
}

async function requireProduct(productId: string) {
  const client = createServiceSupabaseClient();
  const { data, error } = await client
    .from("catalogue_products")
    .select("document")
    .eq("id", productId)
    .maybeSingle();
  if (error) throw error;
  const parsed = productSchema.safeParse(data?.document);
  if (!parsed.success)
    throw new CartValidationError("This product is no longer available.");
  const product = parsed.data;
  if (product.status !== "active" || !isAvailable(product))
    throw new CartValidationError("This product is no longer available.");
  return product;
}

async function existingCart(token: string) {
  const client = createServiceSupabaseClient();
  const { data, error } = await client
    .from("carts")
    .select()
    .eq("token_hash", hash(token))
    .is("converted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function ensureCart(pricing: PricingContext, destinationCountry: string) {
  const cookieStore = await cookies();
  let token = cookieStore.get(CART_COOKIE)?.value;
  let cart = token ? await existingCart(token) : null;
  if (!cart) {
    token = randomBytes(32).toString("base64url");
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("carts")
      .insert({
        token_hash: hash(token),
        currency: pricing.currency,
        destination_country: destinationCountry,
      })
      .select()
      .single();
    if (error) throw error;
    cart = data;
    cookieStore.set(CART_COOKIE, token, cartCookieOptions());
  } else if (
    cart.currency !== pricing.currency ||
    cart.destination_country !== destinationCountry
  ) {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("carts")
      .update({
        currency: pricing.currency,
        destination_country: destinationCountry,
        expires_at: new Date(Date.now() + MAX_AGE * 1000).toISOString(),
      })
      .eq("id", cart.id)
      .select()
      .single();
    if (error) throw error;
    cart = data;
  }
  return cart;
}

function lineKey(productId: string, snapshot: unknown) {
  return hash(JSON.stringify({ productId, options: snapshot }));
}

function productImage(product: Product, variantId: string | null) {
  return (
    product.images.find((image) => image.variant_id === variantId) ??
    product.images.find((image) => image.is_primary) ??
    product.images[0]
  )?.path;
}

function priceFields(
  product: Product,
  selections: Record<string, string[]>,
  pricing: PricingContext,
) {
  let calculated: ReturnType<typeof calculateBaseLinePrice>;
  try {
    calculated = calculateBaseLinePrice(product, selections);
  } catch (error) {
    throw new CartValidationError(
      error instanceof Error
        ? error.message
        : "This configuration could not be priced.",
    );
  }
  if (calculated.variant && !isAvailable(calculated.variant))
    throw new CartValidationError(
      "This configuration is currently unavailable.",
    );
  return {
    baseAmount: calculated.amount,
    displayAmount: displayAmount(calculated.amount, pricing),
    variant: calculated.variant ?? null,
  };
}

async function assertInventory(
  cartId: string,
  product: Product,
  variantId: string | null,
  requestedQuantity: number,
  excludedLineId?: string,
) {
  const stockItem = variantId
    ? product.variants.find((variant) => variant.id === variantId)
    : product;
  if (!stockItem || stockItem.inventory_strategy !== "TRACKED") return;
  const client = createServiceSupabaseClient();
  let query = client
    .from("cart_items")
    .select("id,quantity")
    .eq("cart_id", cartId)
    .eq("product_id", product.id);
  query = variantId
    ? query.eq("variant_id", variantId)
    : query.is("variant_id", null);
  const { data, error } = await query;
  if (error) throw error;
  const inCart = data
    .filter((line) => line.id !== excludedLineId)
    .reduce((sum, line) => sum + line.quantity, 0);
  if (inCart + requestedQuantity > (stockItem.stock_quantity ?? 0))
    throw new CartValidationError("The requested quantity is not available.");
}

export async function addCartItem(input: unknown) {
  if (getServerEnv().CATALOG_SOURCE === "demo")
    throw new CartValidationError(
      "Cart ordering requires the connected shop database.",
    );
  const value = addCartItemSchema.parse(input);
  const { pricing, destinationCountry } = await getStorefrontContext();
  const cart = await ensureCart(pricing, destinationCountry);
  const product = await requireProduct(value.productId);
  const canonical = canonicalizeSelections(product, value.selections);
  const priced = priceFields(product, canonical.selections, pricing);
  const key = lineKey(product.id, canonical.snapshot);
  const client = createServiceSupabaseClient();
  const { data: current, error: currentError } = await client
    .from("cart_items")
    .select("id,quantity")
    .eq("cart_id", cart.id)
    .eq("line_key", key)
    .maybeSingle();
  if (currentError) throw currentError;
  const quantity = (current?.quantity ?? 0) + value.quantity;
  if (quantity > 99)
    throw new CartValidationError("The maximum line quantity is 99.");
  await assertInventory(
    cart.id,
    product,
    priced.variant?.id ?? null,
    quantity,
    current?.id,
  );
  const document = {
    cart_id: cart.id,
    product_id: product.id,
    variant_id: priced.variant?.id ?? null,
    line_key: key,
    selected_options: canonical.snapshot as unknown as Json,
    product_title: product.title,
    product_slug: product.slug,
    sku: priced.variant?.sku ?? product.sku,
    image_path: productImage(product, priced.variant?.id ?? null) ?? null,
    quantity,
    base_unit_amount: priced.baseAmount,
    display_unit_amount: priced.displayAmount,
    display_currency: pricing.currency,
    fx_rate_id: pricing.rate?.id ?? null,
    priced_at: new Date().toISOString(),
    is_valid: true,
    validation_message: null,
  };
  const result = current
    ? await client.from("cart_items").update(document).eq("id", current.id)
    : await client.from("cart_items").insert(document);
  if (result.error) throw result.error;
  return cartItemCount(cart.id);
}

async function rowsForCart(cartId: string) {
  const client = createServiceSupabaseClient();
  const { data, error } = await client
    .from("cart_items")
    .select()
    .eq("cart_id", cartId)
    .order("created_at")
    .order("id");
  if (error) throw error;
  return data;
}

async function cartItemCount(cartId: string) {
  return (await rowsForCart(cartId)).reduce(
    (sum, line) => sum + line.quantity,
    0,
  );
}

export async function updateCartItemQuantity(lineId: string, quantity: number) {
  const token = await cartToken();
  if (!token) throw new CartValidationError("Your cart could not be found.");
  const cart = await existingCart(token);
  if (!cart) throw new CartValidationError("Your cart has expired.");
  const client = createServiceSupabaseClient();
  const { data: row, error } = await client
    .from("cart_items")
    .select()
    .eq("id", lineId)
    .eq("cart_id", cart.id)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw new CartValidationError("That cart item could not be found.");
  const product = await requireProduct(row.product_id);
  const selections = selectionsFromSnapshot(product, row.selected_options);
  const canonical = canonicalizeSelections(product, selections);
  const priced = priceFields(
    product,
    canonical.selections,
    (await getStorefrontContext()).pricing,
  );
  await assertInventory(
    cart.id,
    product,
    priced.variant?.id ?? null,
    quantity,
    row.id,
  );
  const { error: updateError } = await client
    .from("cart_items")
    .update({ quantity })
    .eq("id", row.id)
    .eq("cart_id", cart.id);
  if (updateError) throw updateError;
  return cartItemCount(cart.id);
}

export async function removeCartItem(lineId: string) {
  const token = await cartToken();
  if (!token) return 0;
  const cart = await existingCart(token);
  if (!cart) return 0;
  const client = createServiceSupabaseClient();
  const { error } = await client
    .from("cart_items")
    .delete()
    .eq("id", lineId)
    .eq("cart_id", cart.id);
  if (error) throw error;
  return cartItemCount(cart.id);
}

export async function updateCartContext(
  currency: string,
  destinationCountry: string,
) {
  const token = await cartToken();
  if (!token || getServerEnv().CATALOG_SOURCE === "demo") return;
  const cart = await existingCart(token);
  if (!cart) return;
  const client = createServiceSupabaseClient();
  const { error } = await client
    .from("carts")
    .update({ currency, destination_country: destinationCountry })
    .eq("id", cart.id);
  if (error) throw error;
}

function rowToLine(
  row: Awaited<ReturnType<typeof rowsForCart>>[number],
  product: Product | null,
  selections: Record<string, string[]> | null,
): CartLine {
  return {
    id: row.id,
    productId: row.product_id,
    variantId: row.variant_id,
    productTitle: row.product_title,
    productSlug: row.product_slug,
    sku: row.sku,
    imagePath: row.image_path,
    options: cartOptionsSnapshotSchema.parse(row.selected_options),
    quantity: row.quantity,
    baseUnitAmount: row.base_unit_amount,
    displayUnitAmount: row.display_unit_amount,
    displayCurrency: currencySchema.parse(row.display_currency),
    taxCategoryKey: product?.tax_category_key ?? "standard_goods",
    shippingClassKey: product?.shipping_class_key ?? "standard",
    collectionIds: product?.collections ?? [],
    unitWeightGrams:
      product && selections ? calculateUnitWeight(product, selections) : null,
    valid: row.is_valid,
    message: row.validation_message,
  };
}

export async function getCart(
  storefrontContext?: StorefrontContext,
): Promise<CartView> {
  const { pricing, destinationCountry } =
    storefrontContext ?? (await getStorefrontContext());
  const empty: CartView = {
    id: null,
    lines: [],
    itemCount: 0,
    subtotal: 0,
    currency: pricing.currency,
    destinationCountry,
    discountCode: null,
  };
  if (getServerEnv().CATALOG_SOURCE === "demo") return empty;
  const token = await cartToken();
  if (!token) return empty;
  const cart = await existingCart(token);
  if (!cart) return empty;
  const rows = await rowsForCart(cart.id);
  const client = createServiceSupabaseClient();
  const refreshed: {
    row: (typeof rows)[number];
    product: Product | null;
    selections: Record<string, string[]> | null;
  }[] = [];
  for (const row of rows) {
    try {
      const product = await requireProduct(row.product_id);
      const selections = selectionsFromSnapshot(product, row.selected_options);
      const canonical = canonicalizeSelections(product, selections);
      const priced = priceFields(product, canonical.selections, pricing);
      await assertInventory(
        cart.id,
        product,
        priced.variant?.id ?? null,
        row.quantity,
        row.id,
      );
      const update = {
        variant_id: priced.variant?.id ?? null,
        selected_options: canonical.snapshot as unknown as Json,
        product_title: product.title,
        product_slug: product.slug,
        sku: priced.variant?.sku ?? product.sku,
        image_path: productImage(product, priced.variant?.id ?? null) ?? null,
        base_unit_amount: priced.baseAmount,
        display_unit_amount: priced.displayAmount,
        display_currency: pricing.currency,
        fx_rate_id: pricing.rate?.id ?? null,
        priced_at: new Date().toISOString(),
        is_valid: true,
        validation_message: null,
      };
      const { data, error } = await client
        .from("cart_items")
        .update(update)
        .eq("id", row.id)
        .select()
        .single();
      if (error) throw error;
      refreshed.push({
        row: data,
        product,
        selections: canonical.selections,
      });
    } catch (error) {
      const message =
        error instanceof CartValidationError
          ? error.message
          : "This item could not be validated right now.";
      const { data } = await client
        .from("cart_items")
        .update({ is_valid: false, validation_message: message })
        .eq("id", row.id)
        .select()
        .single();
      refreshed.push({
        row: data ?? {
          ...row,
          is_valid: false,
          validation_message: message,
        },
        product: null,
        selections: null,
      });
    }
  }
  const lines = refreshed.map((item) =>
    rowToLine(item.row, item.product, item.selections),
  );
  return {
    id: cart.id,
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: lines
      .filter((line) => line.valid)
      .reduce((sum, line) => sum + line.displayUnitAmount * line.quantity, 0),
    currency: pricing.currency,
    destinationCountry,
    discountCode: cart.discount_code,
  };
}

export async function setCartDiscountCode(code: string | null) {
  const token = await cartToken();
  if (!token) throw new CartValidationError("Your cart could not be found.");
  const cart = await existingCart(token);
  if (!cart) throw new CartValidationError("Your cart has expired.");
  const client = createServiceSupabaseClient();
  const { error } = await client
    .from("carts")
    .update({ discount_code: code })
    .eq("id", cart.id);
  if (error) throw error;
}

export async function getCartCount() {
  if (getServerEnv().CATALOG_SOURCE === "demo") return 0;
  const token = await cartToken();
  if (!token) return 0;
  const cart = await existingCart(token);
  return cart ? cartItemCount(cart.id) : 0;
}

export async function getMiniCart(): Promise<MiniCartView> {
  const empty: MiniCartView = {
    lines: [],
    lineCount: 0,
    itemCount: 0,
    subtotal: 0,
    currency: "SEK",
  };
  if (getServerEnv().CATALOG_SOURCE === "demo") return empty;

  try {
    const token = await cartToken();
    if (!token) return empty;
    const cart = await existingCart(token);
    if (!cart) return empty;
    const rows = await rowsForCart(cart.id);
    const currency = currencySchema.safeParse(cart.currency);
    if (!currency.success) return empty;
    const validRows = rows.filter((row) => row.is_valid);

    return {
      lines: validRows.slice(0, 4).map((row) => ({
        id: row.id,
        productTitle: row.product_title,
        productSlug: row.product_slug,
        imagePath: row.image_path,
        quantity: row.quantity,
        displayUnitAmount: row.display_unit_amount,
      })),
      lineCount: validRows.length,
      itemCount: validRows.reduce((sum, row) => sum + row.quantity, 0),
      subtotal: validRows.reduce(
        (sum, row) => sum + row.display_unit_amount * row.quantity,
        0,
      ),
      currency: currency.data,
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Mini cart could not be loaded.", error);
    return empty;
  }
}
