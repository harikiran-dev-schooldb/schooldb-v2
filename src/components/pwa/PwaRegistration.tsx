"use client";

import { useEffect } from "react";

import { isSchoolDbProductionHost } from "@/lib/production-domain";

export function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (!isSchoolDbProductionHost(window.location.hostname)) {
      void navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      );
      if ("caches" in window) {
        void caches.keys().then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("schooldb-pwa-"))
              .map((key) => caches.delete(key)),
          ),
        );
      }
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Installation support should never interrupt the application UI.
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
