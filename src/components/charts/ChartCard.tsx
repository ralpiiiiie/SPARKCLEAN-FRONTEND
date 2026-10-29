import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { cn } from "../../lib/utils";

interface ChartCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  action?: ReactNode;
  hover?: boolean;
}

export function ChartCard({
  title,
  subtitle,
  children,
  className,
  bodyClassName,
  action,
  hover = false,
}: ChartCardProps) {
  return (
    <Card hover={hover} className={cn("flex flex-col", className)}>
      <CardHeader action={action}>
        <CardTitle subtitle={subtitle}>{title}</CardTitle>
      </CardHeader>
      <CardContent className={cn("flex-1", bodyClassName)}>{children}</CardContent>
    </Card>
  );
}
