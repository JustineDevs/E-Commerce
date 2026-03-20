export default function TrackPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  return (
    <main>
      <h1>Track Order</h1>
      <p>Order tracking page.</p>
    </main>
  );
}
