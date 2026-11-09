import { Suspense } from "react";
import { CartCountSource } from "@/components/cart/cart-count-source";
import { CartProvider } from "@/components/cart/cart-provider";
import { CategoryNav } from "@/components/shell/category-nav";
import { Footer } from "@/components/shell/footer";
import { Header } from "@/components/shell/header";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <CartProvider>
      <div className="flex min-h-full flex-1 flex-col">
        <Suspense fallback={null}>
          <CartCountSource />
        </Suspense>
        <Header />
        <CategoryNav />
        <div className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-12 md:px-6 lg:px-8">
          {children}
        </div>
        <Footer />
      </div>
    </CartProvider>
  );
}
