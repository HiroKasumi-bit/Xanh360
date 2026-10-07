"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-(--scrim) backdrop-blur-[3px] duration-(--dur-base) ease-(--ease-out) data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

// Where focus goes when a dialog closes. Radix returns it to a <DialogTrigger>, but most dialogs here are opened from
// state (open={...}), and without a trigger focus fell to <body>. Each dialog remembers the element that had focus when
// it opened, then the opener of the dialog that one sat in (for a dialog opened from a dialog that has since closed).
const returnTargets = new WeakMap<Element, HTMLElement[]>()

// How far the sticky header (the close strip with its 44px button, and the sticky title under it) reaches into the
// scroller, kept in --dialog-sticky-h. The scroller's scroll-padding-top reads it, so a control that takes focus is
// scrolled clear of the header instead of sitting underneath it. Measured again when the title or the layout changes.
function trackStickyHeader(content: HTMLDivElement | null) {
  if (!content) return
  const measure = () => {
    let bottom = 0
    for (const child of Array.from(content.children)) {
      if (!(child instanceof HTMLElement) || getComputedStyle(child).position !== "sticky") continue
      const top = parseFloat(getComputedStyle(child).top) || 0
      bottom = Math.max(bottom, top + child.offsetHeight)
      for (const inner of Array.from(child.children)) {
        if (inner instanceof HTMLElement) bottom = Math.max(bottom, top + inner.offsetTop + inner.offsetHeight)
      }
    }
    content.style.setProperty("--dialog-sticky-h", `${Math.ceil(bottom)}px`)
  }
  measure()
  if (typeof ResizeObserver !== "function") return
  const observer = new ResizeObserver(measure)
  observer.observe(content)
  for (const child of Array.from(content.children)) observer.observe(child)
  return () => observer.disconnect()
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  const returnTo = React.useRef<HTMLElement[]>([])
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        ref={trackStickyHeader}
        // Radix moves focus without scrolling when Tab wraps around the dialog, and keyboard scrolling alone can leave a
        // control under the sticky header. Every control that takes focus from inside the dialog is brought fully into
        // view, clear of the header (scroll-padding-top); the close button lives in the header and is always visible.
        // Focus arriving from outside (the dialog opening, a select list closing) leaves the scroll alone, so a dialog
        // whose first control sits at its end still opens at its title.
        onFocus={(event) => {
          const target = event.target
          if (target === event.currentTarget || !(target instanceof HTMLElement)) return
          if (target.closest("[data-slot=dialog-close-bar]")) return
          const from = event.relatedTarget
          if (!(from instanceof Node) || !event.currentTarget.contains(from)) return
          target.scrollIntoView({ block: "nearest", inline: "nearest" })
        }}
        // Once content scrolls under the sticky header, the header draws a hairline and a soft shadow (globals.css).
        onScroll={(event) => event.currentTarget.toggleAttribute("data-scrolled", event.currentTarget.scrollTop > 2)}
        onOpenAutoFocus={(event) => {
          const opener = document.activeElement
          const chain = opener instanceof HTMLElement && opener !== document.body ? [opener] : []
          const outer = opener?.closest("[data-slot=dialog-content]")
          if (outer) chain.push(...(returnTargets.get(outer) ?? []))
          returnTo.current = chain
          if (event.currentTarget instanceof Element) returnTargets.set(event.currentTarget, chain)
          onOpenAutoFocus?.(event)
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event)
          if (event.defaultPrevented) return
          event.preventDefault()
          // Focus already moved on purpose while the dialog was closing (to a result, say): leave it there.
          const active = document.activeElement
          const content = event.currentTarget instanceof Element ? event.currentTarget : null
          if (active && active !== document.body && !content?.contains(active)) return
          returnTo.current.find((element) => element.isConnected)?.focus()
        }}
        className={cn(
          "fixed top-[50%] left-[50%] z-50 flex max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] flex-col gap-4 overflow-y-auto overscroll-contain scroll-pt-[calc(var(--dialog-sticky-h,3.5rem)_+_8px)] scroll-pb-4 rounded-(--r-xl) border border-(--line-soft) bg-(--paper-raised) p-(--dialog-pad) pt-0 text-(--ink) shadow-(--elev-3) duration-(--dur-slow) ease-(--ease-out) outline-none [--dialog-pad:1.5rem] *:shrink-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-98 data-[state=closed]:duration-(--dur-base) data-[state=closed]:ease-(--ease-in) data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-97 data-[state=open]:slide-in-from-bottom-2 sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        {/* The content box is the only scroller. Its top edge is a sticky paper strip, drawn first (order-first) but
            last in focus order, that holds the 44px close button (and the grab handle on phone sheets, see globals.css).
            The title below it is sticky too, so the header stays put while content scrolls under it. */}
        {showCloseButton && (
          <div
            data-slot="dialog-close-bar"
            className="sticky top-0 z-10 order-first -mx-(--dialog-pad) -mb-4 flex h-6 justify-end bg-(--paper-raised) px-3"
          >
            <DialogPrimitive.Close
              data-slot="dialog-close"
              className="mt-3 grid size-11 place-items-center rounded-full bg-(--paper) text-(--ink-2) ring-1 ring-(--line-soft) transition-colors hover:bg-(--green-100) hover:text-(--ink) disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5"
            >
              <XIcon />
              <span className="sr-only">Đóng</span>
            </DialogPrimitive.Close>
          </div>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Đóng</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
