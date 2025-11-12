"use client";

import { useMemo, useState } from "react";

type PricingTab = "pricing" | "orders";

type PricingState = {
  basePrice: number;
  pagePrice: number;
  packagePrice: number;
};

type OrderStatus = "new" | "downloaded";

type AdminOrder = {
  id: number;
  reference: string;
  customerName: string;
  pages: number;
  submittedAt: string;
  pdfUrl: string;
  status: OrderStatus;
};

const initialPricing: PricingState = {
  basePrice: 49,
  pagePrice: 7,
  packagePrice: 2.3,
};

const initialOrders: AdminOrder[] = [
  {
    id: 101,
    reference: "ORD-2024-041",
    customerName: "Evergreen Publishing",
    pages: 320,
    submittedAt: "2024-06-03T14:20:00Z",
    pdfUrl: "https://example.com/pdfs/ORD-2024-041.pdf",
    status: "new",
  },
  {
    id: 102,
    reference: "ORD-2024-042",
    customerName: "Riverside Books",
    pages: 220,
    submittedAt: "2024-06-04T09:45:00Z",
    pdfUrl: "https://example.com/pdfs/ORD-2024-042.pdf",
    status: "new",
  },
  {
    id: 103,
    reference: "ORD-2024-043",
    customerName: "Nightfall Editions",
    pages: 410,
    submittedAt: "2024-06-04T18:05:00Z",
    pdfUrl: "https://example.com/pdfs/ORD-2024-043.pdf",
    status: "downloaded",
  },
];

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<PricingTab>("pricing");
  const [pricing, setPricing] = useState<PricingState>(initialPricing);
  const [orders, setOrders] = useState<AdminOrder[]>(initialOrders);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  const orderSummary = useMemo(() => {
    const totalOrders = orders.length;
    const newOrders = orders.filter((order) => order.status === "new").length;
    const downloadedOrders = totalOrders - newOrders;

    const totals = orders.map((order) => calculateOrderTotal(order, pricing));
    const revenue = totals.reduce((sum, total) => sum + total, 0);

    return {
      totalOrders,
      newOrders,
      downloadedOrders,
      revenue,
    };
  }, [orders, pricing]);

  const handlePricingChange = (key: "basePrice" | "pagePrice" | "packagePrice", value: string) => {
    const parsed = Number.parseFloat(value);
    setPricing((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const toggleOrderSelection = (orderId: number) => {
    setSelectedOrderIds((current) =>
      current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId],
    );
  };

  const areAllOrdersSelected = orders.length > 0 && selectedOrderIds.length === orders.length;

  const toggleSelectAllOrders = () => {
    setSelectedOrderIds(areAllOrdersSelected ? [] : orders.map((order) => order.id));
  };

  const openPdfFiles = (orderIds: number[]) => {
    if (typeof window === "undefined") return;
    const targets = orders.filter((order) => orderIds.includes(order.id));
    targets.forEach((order) => {
      window.open(order.pdfUrl, "_blank", "noreferrer");
    });
  };

  const markOrdersAsDownloaded = (orderIds: number[]) => {
    if (orderIds.length === 0) return;
    setOrders((current) =>
      current.map((order) =>
        orderIds.includes(order.id) && order.status === "new"
          ? {
              ...order,
              status: "downloaded",
            }
          : order,
      ),
    );
    setSelectedOrderIds((current) => current.filter((id) => !orderIds.includes(id)));
  };

  const handleDownloadOrder = async (orderId: number) => {
    openPdfFiles([orderId]);
    await simulateDownload();
    markOrdersAsDownloaded([orderId]);
  };

  const handleDownloadSelected = async () => {
    if (selectedOrderIds.length === 0) return;
    setIsBulkDownloading(true);
    try {
      openPdfFiles(selectedOrderIds);
      await simulateDownload();
      markOrdersAsDownloaded(selectedOrderIds);
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const handleDownloadAllNew = async () => {
    const newOrderIds = orders.filter((order) => order.status === "new").map((order) => order.id);
    if (newOrderIds.length === 0) return;
    setIsBulkDownloading(true);
    try {
      openPdfFiles(newOrderIds);
      await simulateDownload();
      markOrdersAsDownloaded(newOrderIds);
    } finally {
      setIsBulkDownloading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="space-y-6">
          <p className="text-sm uppercase tracking-[0.35em] text-muted">Flyleaf Frames</p>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold md:text-5xl">Production Dashboard</h1>
            <p className="max-w-2xl text-lg text-muted">
              Manage price rules and keep track of production-ready orders. Update pricing inputs, verify totals, and
              download design packages as they arrive.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("pricing")}
              className={`rounded-full px-6 py-2 text-sm font-semibold transition ${
                activeTab === "pricing" ? "bg-foreground text-background" : "border border-border text-foreground hover:border-foreground/40"
              }`}
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("orders")}
              className={`rounded-full px-6 py-2 text-sm font-semibold transition ${
                activeTab === "orders" ? "bg-foreground text-background" : "border border-border text-foreground hover:border-foreground/40"
              }`}
            >
              Orders
            </button>
          </div>
        </header>

        {activeTab === "pricing" ? (
          <section className="space-y-8 rounded-3xl border border-border bg-card/40 p-8">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold">Price inputs</h2>
              <p className="text-sm text-muted">
                The order total is calculated as Base Price + Package Price + (Page Price × Number of Pages).
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <label className="space-y-2 text-sm font-medium">
                <span className="text-muted">Base price</span>
                <input
                  type="number"
                  min={0}
                  value={pricing.basePrice}
                  onChange={(event) => handlePricingChange("basePrice", event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-foreground/50 focus:outline-none"
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span className="text-muted">Page price</span>
                <input
                  type="number"
                  min={0}
                  value={pricing.pagePrice}
                  onChange={(event) => handlePricingChange("pagePrice", event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-foreground/50 focus:outline-none"
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span className="text-muted">Package price (packaging)</span>
                <input
                  type="number"
                  min={0}
                  value={pricing.packagePrice}
                  onChange={(event) => handlePricingChange("packagePrice", event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-foreground/50 focus:outline-none"
                />
              </label>
            </div>
          </section>
        ) : (
          <section className="space-y-8 rounded-3xl border border-border bg-card/40 p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Orders</h2>
                <p className="text-sm text-muted">Keep an eye on every submission and download print-ready PDFs in batches.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDownloadAllNew}
                  disabled={isBulkDownloading || orderSummary.newOrders === 0}
                  className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold uppercase tracking-widest text-background transition disabled:cursor-not-allowed disabled:bg-foreground/30"
                >
                  {isBulkDownloading ? "Downloading…" : `Download all new (${orderSummary.newOrders})`}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSelected}
                  disabled={isBulkDownloading || selectedOrderIds.length === 0}
                  className="rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-widest text-foreground transition hover:border-foreground/40 disabled:cursor-not-allowed disabled:border-border disabled:text-muted"
                >
                  Download selected ({selectedOrderIds.length})
                </button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
              <SummaryCard label="Total orders" value={orderSummary.totalOrders.toString()} />
              <SummaryCard label="New" value={orderSummary.newOrders.toString()} tone="accent" />
              <SummaryCard label="Downloaded" value={orderSummary.downloadedOrders.toString()} tone="muted" />
              <SummaryCard label="Projected revenue" value={`$${orderSummary.revenue.toFixed(2)}`} />
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/80">
              <table className="min-w-full divide-y divide-border/80 text-left text-sm">
                <thead className="bg-background/80 text-xs uppercase tracking-widest text-muted">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select all orders"
                        checked={areAllOrdersSelected}
                        onChange={toggleSelectAllOrders}
                        className="h-4 w-4 rounded border-border text-foreground focus:ring-foreground"
                      />
                    </th>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Pages</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/80 bg-background/40">
                  {orders.map((order) => {
                    const total = calculateOrderTotal(order, pricing);
                    const isSelected = selectedOrderIds.includes(order.id);

                    return (
                      <tr key={order.id} className="align-top">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            aria-label={`Select order ${order.reference}`}
                            checked={isSelected}
                            onChange={() => toggleOrderSelection(order.id)}
                            className="h-4 w-4 rounded border-border text-foreground focus:ring-foreground"
                          />
                        </td>
                        <td className="px-4 py-4 font-semibold">{order.reference}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium">{order.customerName}</span>
                            <span className="text-xs text-muted">{order.id}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">{order.pages}</td>
                        <td className="px-4 py-4 font-semibold">${total.toFixed(2)}</td>
                        <td className="px-4 py-4 text-sm text-muted">{formatDate(order.submittedAt)}</td>
                        <td className="px-4 py-4">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => handleDownloadOrder(order.id)}
                            className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-widest text-foreground transition hover:border-foreground/40"
                          >
                            Download PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted">
                        No orders yet. They will appear here once customers submit their designs.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function calculateOrderTotal(order: AdminOrder, pricing: PricingState) {
  return pricing.basePrice + pricing.packagePrice + pricing.pagePrice * order.pages;
}

function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const tone =
    status === "new"
      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
      : "bg-slate-200 text-slate-800 border border-slate-300";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${tone}`}>
      {status}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "accent" | "muted";
}) {
  const toneStyles = {
    default: "bg-background/60 border-border/60",
    accent: "bg-emerald-500/10 border-emerald-500/30",
    muted: "bg-slate-500/10 border-slate-500/30",
  } as const;

  return (
    <div className={`rounded-2xl border ${toneStyles[tone]} px-5 py-6`}>
      <p className="text-xs uppercase tracking-[0.35em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

async function simulateDownload() {
  return new Promise((resolve) => setTimeout(resolve, 600));
}
