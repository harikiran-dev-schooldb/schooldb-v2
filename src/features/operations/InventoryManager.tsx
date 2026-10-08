"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  CircleDollarSign,
  PackagePlus,
  Search,
  Warehouse,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedSwitch } from "@/components/ui/segmented-switch";
import { cn } from "@/lib/utils";
import {
  EmptyPanel,
  EntityCombobox,
  Field,
  formatCurrency,
  formatDate,
  MetricCard,
  OperationsData,
  Row,
  SelectField,
  StatusBadge,
  titleCase,
  useOperationMutation,
} from "./shared";

const categories = [
  "STATIONERY",
  "IT_EQUIPMENT",
  "LAB_EQUIPMENT",
  "FURNITURE",
  "SPORTS",
  "ELECTRICAL",
  "CLEANING",
  "TEACHING_AIDS",
  "UNIFORM",
  "OTHER",
].map((value) => ({ value, label: titleCase(value) }));

const conditions = ["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"].map((value) => ({
  value,
  label: titleCase(value),
}));

export function InventoryManager({ data }: { data: OperationsData }) {
  const { pending, submit } = useOperationMutation();
  const items = useMemo(() => data.items ?? [], [data.items]);
  const [movementItem, setMovementItem] = useState("");
  const [view, setView] = useState<"items" | "create" | "movement">("items");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const itemOptions = items.map((item) => ({
    value: String(item.id),
    label: String(item.name),
    description: `${item.assetCode} · ${item.quantity} available`,
  }));
  const totalUnits = items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
  const totalValue = items.reduce(
    (sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unitCost ?? 0),
    0,
  );
  const lowStock = items.filter((item) => Number(item.quantity) <= Number(item.reorderLevel));
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery = !needle || `${item.assetCode} ${item.name} ${item.category} ${item.location ?? ""} ${item.custodian ?? ""}`.toLowerCase().includes(needle);
      return matchesQuery && (category === "ALL" || item.category === category);
    });
  }, [category, items, query]);
  const recentMovements = useMemo(() => items
    .flatMap((item) => ((item.movements as Row[] | undefined) ?? []).map((movement) => ({ ...movement, itemName: item.name, assetCode: item.assetCode }) as Row))
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
    .slice(0, 12), [items]);

  return (
    <div className="space-y-5 pb-10">
      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">School stock</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">Know what is available before you buy again.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Use this register for supplies and equipment. Receive stock when it arrives, issue it when someone takes it, and keep the balance visible.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-72">
            <MetricCard label="Items" value={items.length} icon={Boxes} />
            <MetricCard label="Units" value={totalUnits} icon={Warehouse} tone="emerald" />
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Low stock" value={lowStock.length} detail="At or below reorder level" icon={AlertTriangle} tone={lowStock.length ? "rose" : "emerald"} />
        <MetricCard label="Stock value" value={formatCurrency(totalValue)} detail="Quantity × unit cost" icon={CircleDollarSign} tone="amber" />
        <MetricCard label="Locations" value={new Set(items.map((item) => item.location).filter(Boolean)).size} detail="Locations in use" icon={Warehouse} />
      </div>

      <SegmentedSwitch
        value={view}
        onChange={setView}
        label="Inventory workspace view"
        className="w-full lg:w-[620px]"
        options={[
          { value: "items", label: "Items", icon: Boxes },
          { value: "create", label: "Create", icon: PackagePlus },
          { value: "movement", label: "Stock movement", icon: ArrowDownToLine },
        ]}
      />

      <Card className={cn(view !== "items" && "hidden")}>
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Items in school</CardTitle>
            <CardDescription>{filtered.length} of {items.length} items shown. Low-stock items are marked clearly.</CardDescription>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(220px,1fr)_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search item or location" aria-label="Search inventory" />
            </div>
            <SelectField name="inventoryCategoryFilter" placeholder="All categories" value={category} onValueChange={setCategory} options={[{ value: "ALL", label: "All categories" }, ...categories]} />
          </div>
        </CardHeader>
        <CardContent>
          {!filtered.length ? <EmptyPanel title="No matching items" description="Add an item or clear the search and category filter." /> : <>
            <div className="grid gap-3 md:hidden">
              {filtered.map((row) => <InventoryCard key={String(row.id)} row={row} />)}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="border-y bg-muted/30"><tr>{["Item", "Category", "Where", "Stock", "Value", "Condition"].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs uppercase tracking-wide text-muted-foreground">{heading}</th>)}</tr></thead>
                <tbody>{filtered.map((row) => <InventoryRow key={String(row.id)} row={row} />)}</tbody>
              </table>
            </div>
          </>}
        </CardContent>
      </Card>

      <div className={cn("grid gap-4", view === "items" && "hidden")}>
        <Card className={cn(view !== "create" && "hidden")}>
          <CardHeader>
            <CardTitle>Add an item</CardTitle>
            <CardDescription>Create the item once. You can receive more stock later without editing its identity.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => submit("CREATE_INVENTORY_ITEM", event, undefined, "Inventory item added.")}>
              <Field label="Item code" required><Input name="assetCode" required maxLength={40} placeholder="STATIONERY-001" /></Field>
              <Field label="Item name" required><Input name="name" required maxLength={160} placeholder="A4 notebooks" /></Field>
              <Field label="Category" required><SelectField name="category" placeholder="Choose category" options={categories} /></Field>
              <Field label="Condition" required><SelectField name="condition" placeholder="Choose condition" defaultValue="GOOD" options={conditions} /></Field>
              <Field label="Opening quantity" required><Input name="quantity" type="number" min="0" defaultValue="0" required inputMode="numeric" /></Field>
              <Field label="Reorder at" required hint="Show a low-stock warning at this quantity."><Input name="reorderLevel" type="number" min="0" defaultValue="0" required inputMode="numeric" /></Field>
              <Field label="Unit cost (₹)" hint="Optional; used only for the stock value summary."><Input name="unitCost" type="number" min="0" step="0.01" inputMode="decimal" /></Field>
              <Field label="Location"><Input name="location" maxLength={120} placeholder="Main store" /></Field>
              <Field label="Custodian"><Input name="custodian" maxLength={160} placeholder="Department or staff name" /></Field>
              <Field label="Purchase date"><Input name="purchaseDate" type="date" /></Field>
              <Field label="Warranty until"><Input name="warrantyUntil" type="date" /></Field>
              <Button className="sm:col-span-2" disabled={pending}><PackagePlus className="size-4" />Add item</Button>
            </form>
          </CardContent>
        </Card>

        <Card className={cn(view !== "movement" && "hidden")}>
          <CardHeader>
            <CardTitle>Receive or issue stock</CardTitle>
            <CardDescription>Choose the item, then enter the quantity that moved. The balance cannot go below zero.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(event) => submit("ADJUST_INVENTORY", event, { itemId: movementItem }, "Stock balance updated.")}>
              <Field label="Item" required><EntityCombobox value={movementItem} onChange={setMovementItem} options={itemOptions} placeholder="Search item code or name" searchPlaceholder="Search stock…" /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Action" required><SelectField name="type" placeholder="Choose action" options={[{ value: "IN", label: "Receive stock (+)" }, { value: "OUT", label: "Issue stock (−)" }, { value: "ADJUSTMENT", label: "Correction (+)" }]} /></Field>
                <Field label="Quantity" required><Input name="quantity" type="number" min="1" required inputMode="numeric" /></Field>
              </div>
              <Field label="Reference"><Input name="reference" maxLength={120} placeholder="Invoice or issue slip" /></Field>
              <Field label="Notes"><Textarea name="notes" maxLength={500} placeholder="Supplier, recipient or reason for correction" /></Field>
              <Button className="w-full" disabled={pending || !movementItem}><ArrowDownToLine className="size-4" />Save stock movement</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className={cn(view !== "movement" && "hidden")}>
        <CardHeader><CardTitle>Recent movements</CardTitle><CardDescription>The latest stock changes are kept for a quick audit trail.</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {!recentMovements.length ? <EmptyPanel title="No movements yet" description="Receiving or issuing stock will appear here." /> : recentMovements.map((row) => <MovementRow key={String(row.id)} row={row} />)}
        </CardContent>
      </Card>
    </div>
  );
}

function isLow(row: Row) {
  return Number(row.quantity ?? 0) <= Number(row.reorderLevel ?? 0);
}

function InventoryCard({ row }: { row: Row }) {
  const low = isLow(row);
  return <div className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{String(row.name)}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{String(row.assetCode)}</p></div><StatusBadge value={row.condition} /></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-muted-foreground">In stock</p><p className="mt-1 font-semibold">{String(row.quantity)} units</p></div><div><p className="text-xs text-muted-foreground">Value</p><p className="mt-1 font-semibold">{formatCurrency(Number(row.quantity ?? 0) * Number(row.unitCost ?? 0))}</p></div><div><p className="text-xs text-muted-foreground">Category</p><p className="mt-1">{titleCase(row.category)}</p></div><div><p className="text-xs text-muted-foreground">Where</p><p className="mt-1">{String(row.location ?? "Not set")}</p></div></div>{low ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Low stock · reorder at {String(row.reorderLevel)}</p> : null}</div>;
}

function InventoryRow({ row }: { row: Row }) {
  const low = isLow(row);
  return <tr className="border-b last:border-0"><td className="px-4 py-4"><p className="font-semibold">{String(row.name)}</p><p className="font-mono text-xs text-muted-foreground">{String(row.assetCode)}</p></td><td className="px-4 py-4"><Badge variant="outline">{titleCase(row.category)}</Badge></td><td className="px-4 py-4"><p>{String(row.location ?? "Not set")}</p><p className="text-xs text-muted-foreground">{String(row.custodian ?? "No custodian")}</p></td><td className="px-4 py-4"><Badge variant={low ? "destructive" : "success"}>{String(row.quantity)} units</Badge>{low ? <p className="mt-1 text-xs text-destructive">Reorder at {String(row.reorderLevel)}</p> : null}</td><td className="px-4 py-4 font-semibold">{formatCurrency(Number(row.quantity ?? 0) * Number(row.unitCost ?? 0))}</td><td className="px-4 py-4"><StatusBadge value={row.condition} /></td></tr>;
}

function MovementRow({ row }: { row: Row }) {
  const outgoing = row.type === "OUT";
  return <div className="flex items-center justify-between gap-3 rounded-xl border p-3"><div className="flex min-w-0 items-center gap-3"><div className={`rounded-lg p-2 ${outgoing ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{outgoing ? <ArrowUpFromLine className="size-4" /> : <ArrowDownToLine className="size-4" />}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{String(row.itemName)}</p><p className="truncate text-xs text-muted-foreground">{String(row.assetCode)} · {formatDate(row.createdAt)}</p></div></div><div className="shrink-0 text-right"><p className={`font-bold ${outgoing ? "text-rose-700" : "text-emerald-700"}`}>{outgoing ? "−" : "+"}{String(row.quantity)}</p><p className="text-xs text-muted-foreground">{titleCase(row.type)}</p></div></div>;
}
