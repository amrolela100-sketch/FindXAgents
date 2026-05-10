import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  const IconAny = Loader2Icon as any
  return (
    <IconAny
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
