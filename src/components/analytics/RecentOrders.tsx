import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ArrowRight, Inbox } from "lucide-react";
import type { Customer, Order, Service } from "../../types";
import { peso } from "../../lib/metrics";
import { Badge } from "../ui/Badge";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { cn } from "../../lib/utils";

const STATUS_VARIANTS: Record<
  Order["status"],
  "success" | "info" | "warning" | "danger" | "secondary"
> = {
  Delivered: "success",
  Received: "secondary",
  Washing: "info",
  Ready: "warning",
  Cancelled: "danger",
};

export function RecentOrders({
  orders,
  customers,
  services,
  rangeLabel,
  limit = 6,
  className,
}: {
  orders: Order[];
  customers: Customer[];
  services: Service[];
  rangeLabel: string;
  limit?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const customerNames = new Map(customers.map((c) => [c.id, c.name]));
  const serviceNames = new Map(services.map((s) => [s.id, s.name]));

  const latest = [...orders]
    .sort((a, b) => (a.orderDate < b.orderDate ? 1 : a.orderDate > b.orderDate ? -1 : 0))
    .slice(0, limit);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader
        action={
          <Link
            to="/data"
            className="focus-ring inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
          >
            View all orders <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        }
      >
        <CardTitle subtitle={`Most recent records · ${rangeLabel}`}>
          Recent orders
        </CardTitle>
      </CardHeader>

      {latest.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6 pt-4 pb-10 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <Inbox className="h-5 w-5" aria-hidden />
          </span>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No orders were recorded in this period.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <caption className="sr-only">
              Most recent laundry orders for the selected period
            </caption>
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-500">
                <th scope="col" className="px-6 py-2.5">Order</th>
                <th scope="col" className="px-3 py-2.5">Customer</th>
                <th scope="col" className="px-3 py-2.5">Service</th>
                <th scope="col" className="px-3 py-2.5">Date</th>
                <th scope="col" className="px-3 py-2.5 text-right">Amount</th>
                <th scope="col" className="px-6 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {latest.map((order, i) => (
                <motion.tr
                  key={order.id}
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.03 }}
                  className="border-b border-slate-100/80 transition-colors last:border-0 hover:bg-slate-50/80 dark:border-slate-800/70 dark:hover:bg-slate-800/40"
                >
                  <th scope="row" className="px-6 py-3 text-left font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                    {order.id}
                  </th>
                  <td className="px-3 py-3">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {customerNames.get(order.customerId) ?? "Unknown customer"}
                    </span>
                    <span className="block text-xs text-slate-400 dark:text-slate-500">
                      {order.branch}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                    {serviceNames.get(order.serviceId) ?? order.serviceId}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                    {format(parseISO(order.orderDate), "MMM d, yyyy")}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-3 text-right font-medium tabular-nums",
                      order.status === "Cancelled"
                        ? "text-slate-400 line-through dark:text-slate-500"
                        : "text-slate-800 dark:text-slate-200",
                    )}
                  >
                    {peso(order.amount)}
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={STATUS_VARIANTS[order.status]} dot>
                      {order.status}
                    </Badge>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
