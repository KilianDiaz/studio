import React from 'react';
import BreakSession from '@/components/BreakSession';

interface BreakPageProps {
  params: { id: string };
}

export default function BreakPage({ params }: BreakPageProps) {
  const { id } = params;

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <BreakSession breakId={id} />
    </div>
  );
}
