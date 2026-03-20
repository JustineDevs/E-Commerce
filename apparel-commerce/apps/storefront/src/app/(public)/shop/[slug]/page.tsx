export default function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <main>
      <h1>Product</h1>
      <p>Product detail page for slug.</p>
    </main>
  );
}
