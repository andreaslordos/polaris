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
    <div className="flex flex-col h-full min-h-0 w-full">
      <div className="flex-1 min-h-0">
        <HarvardMap />
      </div>
      <a 
        href="sms:+18574458893?body=Hi%20Andreas%2C%20this%20is%20about%20Polaris. "
        className="text-xs transition-colors px-4 py-1 text-center block bg-black text-white"
        style={{ lineHeight: '2rem' }}
      >
        feedback
      </a>
    </div>
  );
} 