'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Force the browser to cache tiles
const cacheOptions = {
  crossOrigin: true,
  maxAge: 60 * 60 * 24 * 7, // Cache for one week
};

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

// Custom blue dot marker for user location
const createUserLocationMarker = () => {
  return L.divIcon({
    className: 'user-location-marker',
    html: `
      <div style="
        width: 15px;
        height: 15px;
        background: #2196F3;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// Harvard Yard coordinates
const HARVARD_YARD = {
  lat: 42.3744,
  lng: -71.1167,
};

// Harvard Square bounding box
const HARVARD_BOUNDS = L.latLngBounds(
  [42.346177, -71.135884], // NW corner
  [42.392885, -71.109761]  // SE corner
);

// Custom tile layer with caching
const TILE_LAYER_URL = `https://api.maptiler.com/maps/aquarelle/{z}/{x}/{y}.png?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`;

// Handler to add cache-control headers
const tileLayerOptions = {
  maxZoom: 19,
  minZoom: 14,
  tileSize: 256,
  zoomOffset: 0,
  crossOrigin: true,
  bounds: HARVARD_BOUNDS,
  subdomains: '1234',
  attributionControl: false,
  detectRetina: true,
  updateWhenIdle: true,
  updateWhenZooming: false,
  keepBuffer: 2,
};

// Sample landmarks in Harvard Yard
const LANDMARKS = [
  {
    name: 'Harvard Yard (Overall)',
    lat: 42.373475,
    lng: -71.118210,
    description: 'Welcome to Harvard Yard, the historic heart and oldest part of Harvard University!'
  },
  {
    name: 'Old Yard',
    lat: 42.374581,
    lng: -71.117554,
    description: 'The westernmost and most historic section of Harvard Yard'
  },
  {
    name: 'Tercentenary Theatre',
    lat: 42.374291,
    lng: -71.116306,
    description: 'The central grassy area in Harvard Yard'
  },
  {
    name: 'Johnston Gate',
    lat: 42.374692,
    lng: -71.11857,
    description: 'The main entrance to Harvard Yard'
  },
  {
    name: 'Massachusetts Hall',
    lat: 42.374442,
    lng: -71.118316,
    description: 'Harvard\'s oldest standing building'
  },
  {
    name: 'Harvard Hall',
    lat: 42.374834,
    lng: -71.118231,
    description: 'A historic classroom building'
  },
  {
    name: 'University Hall',
    lat: 42.374461,
    lng: -71.117083,
    description: 'A major administrative hub'
  },
  {
    name: 'John Harvard Statue',
    lat: 42.374461,
    lng: -71.117218,
    description: 'The famous statue of John Harvard'
  },
  {
    name: 'Widener Library',
    lat: 42.373637,
    lng: -71.116430,
    description: 'Harvard\'s flagship library'
  },
  {
    name: 'Memorial Church',
    lat: 42.374905,
    lng: -71.116043,
    description: 'The spiritual center of Harvard'
  },
  {
    name: 'Sever Hall',
    lat: 42.374366,
    lng: -71.115507,
    description: 'A classroom building with unique architecture'
  },
  {
    name: 'Wadsworth House',
    lat: 42.373391,
    lng: -71.118127,
    description: 'One of the oldest structures on campus'
  },
  {
    name: 'Weld Hall',
    lat: 42.373930,
    lng: -71.117125,
    description: 'A historic freshman dormitory'
  },
  {
    name: 'Matthews Hall',
    lat: 42.374097,
    lng: -71.118166,
    description: 'Another freshman dormitory in the Old Yard'
  },
  {
    name: 'Straus Hall',
    lat: 42.374172,
    lng: -71.118608,
    description: 'A dormitory in Harvard Yard'
  },
  {
    name: 'Grays Hall',
    lat: 42.373646,
    lng: -71.117822,
    description: 'A historic freshman dormitory'
  },
  {
    name: 'Holworthy Hall',
    lat: 42.375523,
    lng: -71.117219,
    description: 'The northernmost of the old dormitories'
  },
  {
    name: 'Holden Chapel',
    lat: 42.375271,
    lng: -71.118123,
    description: 'The third oldest building at Harvard'
  },
  {
    name: 'Phillips Brooks House',
    lat: 42.375653,
    lng: -71.117943,
    description: 'Home to student community service programs'
  }
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

// User location component
function UserLocation() {
  const map = useMap();
  const [position, setPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by your browser');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setPosition([latitude, longitude]);
        
        // Smoothly pan to user location when first acquired
        if (!position) {
          map.flyTo([latitude, longitude], map.getZoom(), {
            duration: 1.5,
          });
        }
      },
      (error) => {
        console.error('Error getting location:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [map, position]);

  if (!position) return null;

  return (
    <Marker
      position={position}
      icon={createUserLocationMarker()}
    >
    </Marker>
  );
}

export default function HarvardMap() {
  const mapRef = useRef(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isTileCached, setIsTileCached] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check if any tiles are cached
    if ('caches' in window) {
      caches.open('polaris-map-tiles-v1').then(cache => {
        cache.keys().then(keys => {
          setIsTileCached(keys.length > 0);
        });
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
    <div className="map-container relative">
      {isOffline && !isTileCached && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-yellow-500 text-white p-2 text-center">
          You're offline. Map tiles may not load properly if not previously cached.
        </div>
      )}
      {isOffline && isTileCached && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-green-500 text-white p-2 text-center">
          Using cached map tiles in offline mode.
        </div>
      )}
      <MapContainer
        ref={mapRef}
        center={[HARVARD_YARD.lat, HARVARD_YARD.lng]}
        zoom={16}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        maxBounds={HARVARD_BOUNDS}
        maxBoundsViscosity={1.0}
      >
        <MapDebug />
        <TileLayer
          url={TILE_LAYER_URL}
          {...tileLayerOptions}
        />
        <UserLocation />
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