"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menu = [
  { href: "/", label: "Home" },
  { href: "/assets", label: "자산 현황" },
  { href: "/chat", label: "시장 인사이트" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={sidebarStyles.aside}>
      <div style={sidebarStyles.logo}>Quant Trader</div>
      <nav style={sidebarStyles.nav}>
        {menu.map(({ href, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                ...sidebarStyles.link,
                ...(isActive ? sidebarStyles.linkActive : {}),
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

const sidebarStyles: Record<string, React.CSSProperties> = {
  aside: {
    width: 220,
    minHeight: "100vh",
    background: "var(--surface)",
    borderRight: "1px solid var(--border)",
    padding: "1.25rem 0",
    flexShrink: 0,
  },
  logo: {
    padding: "0 1.25rem 1.25rem",
    fontSize: "1.1rem",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    borderBottom: "1px solid var(--border)",
    marginBottom: "1rem",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  link: {
    display: "block",
    padding: "0.6rem 1.25rem",
    fontSize: "0.95rem",
    color: "var(--muted)",
    transition: "color 0.15s, background 0.15s",
  },
  linkActive: {
    color: "var(--text)",
    background: "rgba(255,255,255,0.06)",
    borderRight: "3px solid var(--upbit)",
  },
};
