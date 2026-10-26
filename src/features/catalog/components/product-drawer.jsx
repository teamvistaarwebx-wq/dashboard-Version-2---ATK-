"use client";

import { Drawer } from "@/components/ui/drawer";
import { useDrawerClose } from "@/features/catalog/hooks/use-drawer-close";

/**
 * The add / edit panel, opened by `?new=1` or `?edit=<id>`.
 *
 * Which one is open lives in the URL, exactly as the filters above the table
 * do. That buys three things a `useState` boolean would not: the browser Back
 * button closes it, an in-progress edit is a link somebody can send, and the
 * form's initial values are server-rendered rather than fetched from here.
 *
 * Deliberately holds no data — only the title, which the page already knows
 * from the URL. That is what lets the panel mount with the page shell, roughly
 * a JWT verify after the click, while `children` is still a server component
 * waiting on Mongo behind a Suspense boundary. Rendering the two together, as
 * this file used to, meant the whole panel waited on the slowest read on the
 * screen and the click looked like it had done nothing at all.
 */
export function ProductDrawer({ title, children }) {
  const { close } = useDrawerClose();

  return (
    <Drawer title={title} onClose={close}>
      {children}
    </Drawer>
  );
}
