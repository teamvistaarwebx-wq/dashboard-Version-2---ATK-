import { redirect } from "next/navigation";
import { MOCK_MODE } from "@/lib/mock-mode";
import { ProductEditor } from "@/features/catalog/components/product-editor";

export const metadata = { title: "Add product | ATK Gifting Admin" };

/**
 * The full-page product editor (mock mode). Against the real database the
 * catalogue still edits in its drawer, so this forwards there.
 */
export default async function NewProductPage({ searchParams }) {
  if (!MOCK_MODE) redirect("/products?new=1");

  const params = await searchParams;
  return <ProductEditor defaults={{ fulfillment: params?.fulfillment === "made_to_order" ? "made_to_order" : "in_stock" }} />;
}
