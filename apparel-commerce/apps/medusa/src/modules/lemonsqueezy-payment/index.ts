import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import LemonSqueezyPaymentProviderService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [LemonSqueezyPaymentProviderService],
});
