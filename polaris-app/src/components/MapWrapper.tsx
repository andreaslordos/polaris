'use client';

import dynamic from 'next/dynamic';

const HarvardMap = dynamic(() => import('./HarvardMap'), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="text-lg text-gray-600">Loading map...</div>
    </div>
  ),
});

export default function MapWrapper() {
  return (
    <div className="h-screen w-full">
      <HarvardMap />
    </div>
  );
} 