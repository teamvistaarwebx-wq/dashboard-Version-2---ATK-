import { redirect } from "next/navigation";
import { MOCK_MODE } from "@/lib/mock-mode";
import { ProductEditor } from "@/features/catalog/components/product-editor";

export const metadata = { title: "Product | ATK Gifting Admin" };

/** Edit one product (mock mode); the real catalogue forwards to its drawer. */
export default async function ProductPage({ params }) {
  const { id } = await params;
  if (!MOCK_MODE) redirect(`/products?edit=${encodeURIComponent(id)}`);

  return <ProductEditor productId={id} />;
}
