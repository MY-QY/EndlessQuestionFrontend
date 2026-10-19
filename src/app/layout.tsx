import { AntdRegistry } from "@ant-design/nextjs-registry";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Shell } from "@/components/shell";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: {
    default: "题海无涯 · 保持好奇，持续进步",
    template: "%s · 题海无涯",
  },
  description: "浏览题库，深入思考，在题海无涯持续积累知识。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdRegistry>
          <Providers>
            <Shell>{children}</Shell>
          </Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
