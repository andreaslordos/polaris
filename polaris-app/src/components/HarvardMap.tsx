'use client';

import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom cute marker icon
const createCuteMarker = () => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 30px;
        height: 30px;
        background: #FF6B6B;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 16px;
      ">📍</div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
};

// Harvard Yard coordinates
const HARVARD_YARD = {
  lat: 42.3744,
  lng: -71.1167,
};

// Sample landmarks in Harvard Yard
const LANDMARKS = [
  {
    name: 'John Harvard Statue',
    lat: 42.3744,
    lng: -71.1167,
    description: 'The famous statue of John Harvard, known as the "Statue of Three Lies"',
  },
  {
    name: 'Widener Library',
    lat: 42.3734,
    lng: -71.1147,
    description: 'Harvard\'s flagship library, one of the largest academic libraries in the world',
  },
  {
    name: 'Memorial Church',
    lat: 42.3744,
    lng: -71.1167,
    description: 'The University\'s spiritual center, built in memory of Harvard men who died in World War I',
  },
];

// Debug component to check map initialization
function MapDebug() {
  const map = useMap();
  
  useEffect(() => {
    console.log('Map initialized:', map);
    console.log('Map center:', map.getCenter());
    console.log('Map zoom:', map.getZoom());
    console.log('Map size:', map.getSize());
  }, [map]);

  return null;
}

export default function HarvardMap() {
  const mapRef = useRef(null);

  useEffect(() => {
    // Force a re-render of the map when the component mounts
    const map = document.querySelector('.leaflet-container');
    if (map) {
      console.log('Map container found:', map);
      (map as HTMLElement).style.display = 'none';
      setTimeout(() => {
        (map as HTMLElement).style.display = 'block';
        console.log('Map container re-rendered');
      }, 0);
    } else {
      console.log('Map container not found');
    }
  }, []);

  return (
    <div className="map-container">
      <MapContainer
        ref={mapRef}
        center={[HARVARD_YARD.lat, HARVARD_YARD.lng]}
        zoom={16}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <MapDebug />
        <TileLayer
          url={`https://api.maptiler.com/maps/aquarelle/{z}/{x}/{y}.png?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`}
        />
        {LANDMARKS.map((landmark, index) => (
          <Marker
            key={index}
            position={[landmark.lat, landmark.lng]}
            icon={createCuteMarker()}
          >
            <Popup>
              <div className="p-2 bg-white rounded-lg shadow-lg">
                <h3 className="font-bold text-lg mb-1 text-[#FF6B6B]">{landmark.name}</h3>
                <p className="text-sm text-gray-600">{landmark.description}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
} 