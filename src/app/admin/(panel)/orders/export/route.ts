import { CSV_BOM } from "@/lib/admin/csv";
import { parseOrderFilters } from "@/lib/admin/order-filters";
import { EXPORT_MAX_ROWS, listOrdersForExport, ordersToCsv } from "@/lib/admin/orders";
import { storeDateKey } from "@/lib/admin/time";
import { requireAdminApi } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /admin/orders/export?<same filters as the orders page> → CSV download.
 * Cells are formula-guarded (see src/lib/admin/csv.ts) because customer-typed
 * values end up in Excel / Google Sheets.
 */
export async function GET(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const filters = parseOrderFilters(new URL(request.url).searchParams);
  // Fetch one extra row to know whether the export was truncated.
  const rows = await listOrdersForExport(filters, EXPORT_MAX_ROWS + 1);
  const truncated = rows.length > EXPORT_MAX_ROWS;
  const csv = CSV_BOM + ordersToCsv(truncated ? rows.slice(0, EXPORT_MAX_ROWS) : rows);
  const filename = `sakai-orders-${storeDateKey(new Date()).replaceAll("-", "")}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Export-Rows": String(Math.min(rows.length, EXPORT_MAX_ROWS)),
      ...(truncated ? { "X-Export-Truncated": "true" } : {}),
    },
  });
}
