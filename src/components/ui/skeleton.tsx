import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("afh-shimmer rounded-md bg-afh-bg-warm", className)}
      {...props}
    />
  );
}

export { Skeleton };
