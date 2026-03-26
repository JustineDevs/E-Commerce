"use client";

import { useEffect } from "react";
import { readAdminPreferences } from "@apparel-commerce/user-preferences";

/**
 * Applies saved admin UI preferences to the document root (density, motion).
 */
export function AdminPreferenceSync() {
  useEffect(() => {
    const apply = () => {
      const p = readAdminPreferences();
      document.documentElement.dataset.adminDensity = p.uiDensity;
    };
    apply();
    window.addEventListener("admin-prefs-updated", apply);
    window.addEventListener("storage", apply);
    return () => {
      window.removeEventListener("admin-prefs-updated", apply);
      window.removeEventListener("storage", apply);
    };
  }, []);

  return null;
}
