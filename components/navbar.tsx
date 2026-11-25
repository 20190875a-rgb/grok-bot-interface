"use client";

import { Tabs } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Key } from "react";

const ITEMS = [
  { id: "gym", href: "/", label: "Gym" },
  { id: "predictions", href: "/predictions", label: "Predictions" },
] as const;

const grokIconSrc = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/grok-bot-icon.webp`;

function selectedId(pathname: string): string {
  if (pathname.startsWith("/predictions")) return "predictions";
  return "gym";
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const selected = selectedId(pathname);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          className="flex items-center gap-2 text-sm font-semibold tracking-tight text-accent no-underline"
          href="/"
        >
          <Image
            src={grokIconSrc}
            alt=""
            width={28}
            height={28}
            className="size-7 shrink-0 rounded-md"
            priority
          />
          Grok Bot
        </Link>
        <Tabs
          className="w-auto"
          selectedKey={selected}
          variant="secondary"
          onSelectionChange={(key: Key) => {
            const item = ITEMS.find((entry) => entry.id === String(key));
            if (item) router.push(item.href);
          }}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="Primary">
              {ITEMS.map((item) => (
                <Tabs.Tab key={item.id} id={item.id}>
                  {item.label}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>
    </header>
  );
}
