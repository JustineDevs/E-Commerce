import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  createApiKeysWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresStep,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { ApiKey } from "../../.medusa/types/query-entry-points";

const SALES_CHANNEL_NAME = "Web PH";
const REGION_NAME = "Philippines";
const STOCK_LOCATION_NAME = "Warehouse PH";
const FULFILLMENT_SET_NAME = "PH Warehouse delivery";
const SHIPPING_OPTION_STANDARD = "Standard PH";
const LEGACY_LOC_META_KEY = "legacy_inventory_location_code";

/** Aligns with `medusa-config.ts` provider registration (pp_{id}_{id}). */
function buildPaymentProviderIdsForSeed(): string[] {
  const ids: string[] = ["pp_system_default", "pp_cod_cod"];
  if (
    process.env.LEMONSQUEEZY_API_KEY?.trim() &&
    process.env.LEMONSQUEEZY_STORE_ID?.trim() &&
    process.env.LEMONSQUEEZY_CHECKOUT_VARIANT_ID?.trim() &&
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim()
  ) {
    ids.push("pp_lemonsqueezy_lemonsqueezy");
  }
  if (process.env.STRIPE_API_KEY?.trim()) {
    ids.push("pp_stripe_stripe");
  }
  if (
    process.env.PAYPAL_CLIENT_ID?.trim() &&
    process.env.PAYPAL_CLIENT_SECRET?.trim()
  ) {
    ids.push("pp_paypal_paypal");
  }
  if (
    process.env.PAYMONGO_SECRET_KEY?.trim() &&
    process.env.PAYMONGO_WEBHOOK_SECRET?.trim()
  ) {
    ids.push("pp_paymongo_paymongo");
  }
  if (
    process.env.MAYA_SECRET_KEY?.trim() &&
    process.env.MAYA_WEBHOOK_SECRET?.trim()
  ) {
    ids.push("pp_maya_maya");
  }
  return [...new Set(ids)];
}

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies-ph",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => ({
      selector: { id: data.input.store_id },
      update: {
        supported_currencies: data.input.supported_currencies.map(
          (currency) => ({
            currency_code: currency.currency_code,
            is_default: currency.is_default ?? false,
          }),
        ),
      },
    }));
    const stores = updateStoresStep(normalizedInput);
    return new WorkflowResponse(stores);
  },
);

export default async function seedPhilippines(args: ExecArgs) {
  const logger = args.container.resolve(ContainerRegistrationKeys.LOGGER);
  try {
    await runPhilippinesSeed(args);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    logger.error(`PH seed FAILED: ${err.message}`);
    if (err.stack) {
      logger.error(err.stack);
    }
    throw err;
  }
}

async function runPhilippinesSeed({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const storeModuleService = container.resolve(Modules.STORE);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const regionModuleService = container.resolve(Modules.REGION);
  const taxModuleService = container.resolve(Modules.TAX);
  const stockLocationModuleService = container.resolve(Modules.STOCK_LOCATION);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);

  const legacyLocationCode =
    process.env.MEDUSA_SEED_LEGACY_LOCATION_CODE ?? "WH1";
  const flatShippingMinorUnits = Number(
    process.env.MEDUSA_PH_FLAT_SHIPPING_MINOR ?? 15000,
  );

  const [store] = await storeModuleService.listStores();
  if (!store) {
    throw new Error("No store record found. Run migrations first.");
  }

  logger.info("PH seed: store currencies → PHP");
  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [{ currency_code: "php", is_default: true }],
    },
  });

  let webPhChannels = await salesChannelModuleService.listSalesChannels({
    name: SALES_CHANNEL_NAME,
  });
  if (!webPhChannels.length) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [{ name: SALES_CHANNEL_NAME }],
      },
    });
    webPhChannels = result;
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_sales_channel_id: webPhChannels[0].id,
      },
    },
  });

  logger.info("PH seed: region");
  let regions = await regionModuleService.listRegions({ name: REGION_NAME });
  let region = regions[0];
  if (!region) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: REGION_NAME,
            currency_code: "php",
            countries: ["ph"],
            payment_providers: buildPaymentProviderIdsForSeed(),
          },
        ],
      },
    });
    region = result[0];
  }

  // UpdateRegionDTO does not include payment_providers; use Admin → Settings → Regions to configure.
  const desired = buildPaymentProviderIdsForSeed();
  const regionWithProviders = region as unknown as {
    payment_providers?: { id: string }[];
  };
  const current =
    regionWithProviders.payment_providers?.map((p) => p.id) ?? [];
  const merged = [...new Set([...current, ...desired])];
  if (merged.length > current.length) {
    logger.info(
      `PH seed: configure payment providers in Admin → Regions (suggested: ${merged.join(", ")})`,
    );
  }

  logger.info("PH seed: tax region — listing (country ph)");
  const existingTax = await taxModuleService.listTaxRegions({
    country_code: "ph",
  });
  logger.info(
    `PH seed: tax region — existing count=${existingTax.length} (skip create if >0)`,
  );
  if (!existingTax.length) {
    logger.info("PH seed: tax region — running createTaxRegionsWorkflow");
    await createTaxRegionsWorkflow(container).run({
      input: [
        {
          country_code: "ph",
          provider_id: "tp_system",
        },
      ],
    });
    logger.info("PH seed: tax region — workflow finished");
  }

  logger.info("PH seed: stock location");
  let stockLocs = await stockLocationModuleService.listStockLocations({
    name: STOCK_LOCATION_NAME,
  });
  let stockLocation = stockLocs[0];
  if (!stockLocation) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: STOCK_LOCATION_NAME,
            metadata: { [LEGACY_LOC_META_KEY]: legacyLocationCode },
            address: {
              city: "Metro Manila",
              country_code: "ph",
              address_1: "",
            },
          },
        ],
      },
    });
    stockLocation = result[0];
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_location_id: stockLocation.id,
      },
    },
  });

  try {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "manual_manual",
      },
    });
  } catch {
    // link may already exist
  }

  let shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  let shippingProfile = shippingProfiles[0] ?? null;
  if (!shippingProfile) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: {
        data: [
          {
            name: "Default Shipping Profile",
            type: "default",
          },
        ],
      },
    });
    shippingProfile = result[0];
  }

  let fulfillmentSets = await fulfillmentModuleService.listFulfillmentSets({
    name: FULFILLMENT_SET_NAME,
  });
  let fulfillmentSet = fulfillmentSets[0];
  if (!fulfillmentSet) {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: FULFILLMENT_SET_NAME,
      type: "shipping",
      service_zones: [
        {
          name: "Philippines",
          geo_zones: [
            {
              country_code: "ph",
              type: "country",
            },
          ],
        },
      ],
    });
  }

  try {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSet.id,
      },
    });
  } catch {
    // link may already exist
  }

  // listFulfillmentSets often omits relations; load zones when missing.
  let serviceZoneId = fulfillmentSet.service_zones?.[0]?.id;
  if (!serviceZoneId) {
    fulfillmentSet = await fulfillmentModuleService.retrieveFulfillmentSet(
      fulfillmentSet.id,
      { relations: ["service_zones"] },
    );
    serviceZoneId = fulfillmentSet.service_zones?.[0]?.id;
  }
  if (!serviceZoneId) {
    const zones = await fulfillmentModuleService.listServiceZones(
      { fulfillment_set: { id: fulfillmentSet.id } },
      { take: 20 },
    );
    serviceZoneId = zones[0]?.id;
  }
  if (!serviceZoneId) {
    logger.warn(
      "PH seed: fulfillment set has no service zones; creating Philippines zone",
    );
    const created = await fulfillmentModuleService.createServiceZones([
      {
        name: "Philippines",
        fulfillment_set_id: fulfillmentSet.id,
        geo_zones: [
          {
            country_code: "ph",
            type: "country",
          },
        ],
      },
    ]);
    serviceZoneId = created[0]?.id;
  }
  if (!serviceZoneId) {
    throw new Error(
      "Fulfillment set has no service zone (retrieve, list, and create all failed).",
    );
  }

  const existingOptions = await fulfillmentModuleService.listShippingOptions({
    name: SHIPPING_OPTION_STANDARD,
  });
  if (!existingOptions.length) {
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: SHIPPING_OPTION_STANDARD,
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: serviceZoneId,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Standard",
            description: "Flat rate Philippines.",
            code: "standard-ph",
          },
          prices: [
            { currency_code: "php", amount: flatShippingMinorUnits },
            { region_id: region.id, amount: flatShippingMinorUnits },
          ],
          rules: [
            {
              attribute: "enabled_in_store",
              value: "true",
              operator: "eq",
            },
            {
              attribute: "is_return",
              value: "false",
              operator: "eq",
            },
          ],
        },
      ],
    });
  }

  try {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: {
        id: stockLocation.id,
        add: [webPhChannels[0].id],
      },
    });
  } catch (e) {
    logger.warn(
      `linkSalesChannelsToStockLocation (may already be linked): ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  let { data: publishableKeys } = await query.graph({
    entity: "api_key",
    fields: ["id", "title"],
    filters: { type: "publishable" },
  });

  if (!publishableKeys?.length) {
    await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Web PH Storefront",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });
    const again = await query.graph({
      entity: "api_key",
      fields: ["id", "title"],
      filters: { type: "publishable" },
    });
    publishableKeys = again.data ?? [];
  }

  const salesChannelId = webPhChannels[0].id;
  for (const row of publishableKeys ?? []) {
    const key = row as ApiKey;
    try {
      await linkSalesChannelsToApiKeyWorkflow(container).run({
        input: {
          id: key.id,
          add: [salesChannelId],
        },
      });
      logger.info(
        `PH seed: linked sales channel ${salesChannelId} to publishable API key ${key.id}${key.title ? ` (${key.title})` : ""}`,
      );
    } catch (e) {
      logger.warn(
        `linkSalesChannelsToApiKey key=${key.id} (may already be linked): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  logger.info(
    `PH seed done: sales_channel=${webPhChannels[0].id} region=${region.id} stock_location=${stockLocation.id} legacy_loc=${legacyLocationCode}`,
  );
}
