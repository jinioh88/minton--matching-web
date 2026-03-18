"use client";

import { Home, MessageCircle, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/matching", label: "홈", icon: Home },
  { href: "/chat", label: "채팅", icon: MessageCircle },
  { href: "/profile/me", label: "마이페이지", icon: User },
];

function shouldShowNav(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/matching") return true;
  if (pathname.startsWith("/chat")) return true;
  if (pathname === "/profile/me") return true;
  return false;
}

export function BottomNav() {
  const pathname = usePathname();

  if (!shouldShowNav(pathname ?? "")) {
    return null;
  }

  const isActive = (href: string) => {
    if (href === "/matching") return pathname === "/" || pathname === "/matching";
    return pathname?.startsWith(href) ?? false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center justify-around px-4 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-6 py-2 text-xs transition-colors ${
                active
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
