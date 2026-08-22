export function refreshTable(name: string) {
  window.dispatchEvent(
    new CustomEvent("schooldb-table-refresh", {
      detail: { name },
    }),
  );
}

export function subscribeTableRefresh(
  name: string,
  callback: () => void,
) {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ name: string }>;

    if (customEvent.detail?.name === name) {
      callback();
    }
  };

  window.addEventListener("schooldb-table-refresh", handler);

  return () => {
    window.removeEventListener("schooldb-table-refresh", handler);
  };
}