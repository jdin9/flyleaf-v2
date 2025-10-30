const STORAGE_KEY = "flyleaf-designer-orders";

export type StoredOrder = {
  id: string;
  reference: string;
  customerName: string;
  pages: number;
  submittedAt: string;
  pdfDataUri: string;
};

const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export function getStoredOrders(): StoredOrder[] {
  if (!isBrowser) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as StoredOrder[];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isStoredOrder);
  } catch {
    return [];
  }
}

export function addStoredOrder(order: StoredOrder) {
  if (!isBrowser) return;

  const current = getStoredOrders();
  current.push(order);
  persistOrders(current);
  dispatchOrdersUpdatedEvent();
}

export type StoredOrdersListener = (orders: StoredOrder[]) => void;

export function subscribeToStoredOrders(listener: StoredOrdersListener) {
  if (!isBrowser) return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key !== STORAGE_KEY) return;
    listener(getStoredOrders());
  };

  const handleCustomEvent = () => {
    listener(getStoredOrders());
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener("flyleaf-orders:updated", handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("flyleaf-orders:updated", handleCustomEvent);
  };
}

function persistOrders(orders: StoredOrder[]) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // Ignore write errors (e.g., quota exceeded)
  }
}

function dispatchOrdersUpdatedEvent() {
  if (!isBrowser) return;
  window.dispatchEvent(new Event("flyleaf-orders:updated"));
}

function isStoredOrder(value: unknown): value is StoredOrder {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<StoredOrder>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.reference === "string" &&
    typeof candidate.customerName === "string" &&
    typeof candidate.pages === "number" &&
    typeof candidate.submittedAt === "string" &&
    typeof candidate.pdfDataUri === "string"
  );
}
