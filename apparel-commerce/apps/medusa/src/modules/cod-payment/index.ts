import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import CodPaymentProviderService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  // AbstractPaymentProvider uses protected constructor; cast satisfies ModuleProvider's public-constructor expectation
  services: [CodPaymentProviderService] as any,
});
