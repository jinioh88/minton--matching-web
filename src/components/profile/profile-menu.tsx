"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

type MenuItem = {
  label: string;
  href: string;
};

const MENU_ITEMS: MenuItem[] = [
  { label: "매칭 내역", href: "/matching/history" },
  { label: "후기 관리", href: "/reviews" },
  { label: "공지사항 및 고객센터", href: "/notice" },
  { label: "계정 관리", href: "/account" },
];

export const ProfileMenu = () => {
  return (
    <nav className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">메뉴</h2>
      <ul className="divide-y rounded-lg border bg-card">
        {MENU_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-muted/50"
            >
              {item.label}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};
