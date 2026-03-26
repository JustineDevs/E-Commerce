import type { PrinterAdapterCapabilities } from "@apparel-commerce/printer-core";

/**
 * Declares hardware paths implemented in this agent build.
 */
export function listAdapterCapabilities(): PrinterAdapterCapabilities[] {
  const devOnlyMock: PrinterAdapterCapabilities[] =
    process.env.NODE_ENV === "production"
      ? []
      : [{ id: "mock", label: "Mock (stdout / dev file)", available: true }];

  return [
    { id: "escpos-tcp", label: "ESC/POS over TCP (port 9100)", available: true },
    ...devOnlyMock,
    {
      id: "http-relay",
      label: "HTTP relay (POST application/octet-stream)",
      available: true,
    },
    {
      id: "qz-tray",
      label: "QZ Tray relay (HTTP POST to local bridge)",
      available: true,
    },
    {
      id: "star-cloudprnt",
      label: "Star CloudPRNT (poll GET /cloudprnt)",
      available: true,
    },
    {
      id: "epson-epos",
      label: "Epson raw print (HTTP POST octet-stream)",
      available: true,
    },
  ];
}
