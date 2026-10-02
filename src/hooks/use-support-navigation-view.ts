"use client";

import { useCallback, useSyncExternalStore } from "react";

import { usesSupportNavigation } from "@/lib/support-workspace";

const STORAGE_PREFIX = "schooldb-navigation-view";
const CHANGE_EVENT = "schooldb-navigation-view-change";

export function useSupportNavigationView(schoolSlug: string, role: string) {
  const supportNavigationAvailable = usesSupportNavigation(schoolSlug, role);
  const storageKey = `${STORAGE_PREFIX}:${schoolSlug}`;

  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener("storage", onStoreChange);
    window.addEventListener(CHANGE_EVENT, onStoreChange);

    return () => {
      window.removeEventListener("storage", onStoreChange);
      window.removeEventListener(CHANGE_EVENT, onStoreChange);
    };
  }, []);

  const getSnapshot = useCallback(
    () => window.localStorage.getItem(storageKey) === "all",
    [storageKey],
  );
  const getServerSnapshot = useCallback(() => false, []);
  const storedShowAll = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setShowAll = useCallback(
    (showAll: boolean) => {
      window.localStorage.setItem(storageKey, showAll ? "all" : "support");
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [storageKey],
  );

  return {
    showAll: !supportNavigationAvailable || storedShowAll,
    setShowAll,
    supportNavigationAvailable,
  };
}
