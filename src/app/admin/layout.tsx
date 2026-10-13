import type { Metadata } from "next";

// The back office must never show up in search results or link previews.
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

/**
 * Wraps every /admin route (login included). The admin is English-only, so
 * pin lang/line-height even when the visitor's store language cookie is Khmer.
 */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div lang="en" className="flex flex-1 flex-col leading-normal">
      {children}
    </div>
  );
}
