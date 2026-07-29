"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

function PasswordInput({ className, ...props }: React.ComponentProps<"input">) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className={cn("pr-8", className)} {...props} />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-0.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  )
}

export { PasswordInput }
