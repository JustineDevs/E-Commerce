import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import PaymongoPaymentProviderService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [PaymongoPaymentProviderService],
});
