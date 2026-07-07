import React from 'react';
import { OrderDetailsDataFetcher } from './_components/OrderDetailsDataFetcher';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <OrderDetailsDataFetcher id={id} />;
}
