import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("afh-shimmer rounded-afh-base bg-afh-bg-warm", className)}
      {...props}
    />
  );
}

export { Skeleton };
