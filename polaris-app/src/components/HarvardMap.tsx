'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ChatView from './ChatView';

// Gamification Constants
const DISCOVERY_RADIUS = 25; // meters
const INTERACTION_RADIUS = 5; // meters
const MIN_OPACITY = 0.2;
const MAX_BLUR_PX = 8; // pixels

// Custom image marker icon
const createImageMarker = (
  imageName: string, 
  isClicked: boolean = false,
  opacity: number = 1,
  blurPx: number = 0
) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        position: relative;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: ${opacity};
        filter: blur(${blurPx}px);
        transition: opacity 0.3s ease, filter 0.3s ease; /* Smooth transitions */
      ">
        <img 
          src="/images/thumbnails/${imageName}_thumb.png" 
          alt="${imageName}"
          style="
            width: 100%;
            height: 100%;
            object-fit: cover;
          "
        />
        ${isClicked ? `<div style="
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(144,238,144,0.7); /* Greenish tint for clicked/discovered */
          border-radius: 50%;
        "></div>` : ''}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -25]
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
  lat: 42.373911,
  lng: -71.117727,
};

// Harvard Square bounding box
const HARVARD_BOUNDS = L.latLngBounds(
  [42.346177, -71.135884], // NW corner
  [42.392885, -71.109761]  // SE corner
);

// Custom tile layer with caching
const TILE_LAYER_URL = '/map-tiles/{z}/{x}/{y}.png';

// Handler to add cache-control headers
const tileLayerOptions = {
  maxZoom: 19,
  minZoom: 14,
  tileSize: 256,
  zoomOffset: 0,
  crossOrigin: true,
  bounds: HARVARD_BOUNDS,
  attributionControl: false,
  detectRetina: true,
  updateWhenIdle: true,
  updateWhenZooming: false,
  keepBuffer: 4,
  // Add loading priority
  loadingPriority: 1,
  // Add error handling
  errorTileUrl: '/images/error-tile.png',
  // Add loading indicator
  loading: true,
};

// Sample landmarks in Harvard Yard
const LANDMARKS = [
  {
    name: 'Harvard Yard',
    lat: 42.373911,
    lng: -71.117727,
    description: 'Welcome to Harvard Yard, the historic heart and oldest part of Harvard University!',
    image: 'harvard_yard_overall'
  },
  {
    name: 'Tercentenary Theatre',
    lat: 42.374291,
    lng: -71.116306,
    description: 'The central grassy area in Harvard Yard',
    image: 'tercentenary_theatre'
  },
  {
    name: 'Johnston Gate',
    lat: 42.374692,
    lng: -71.11857,
    description: 'The main entrance to Harvard Yard',
    image: 'johnston_gate'
  },
  {
    name: 'Massachusetts Hall',
    lat: 42.374442,
    lng: -71.118316,
    description: 'Harvard\`s oldest standing building',
    image: 'massachusetts_hall'
  },
  {
    name: 'Harvard Hall',
    lat: 42.374834,
    lng: -71.118231,
    description: 'A historic classroom building',
    image: 'harvard_hall'
  },
  {
    name: 'University Hall',
    lat: 42.374461,
    lng: -71.117083,
    description: 'A major administrative hub',
    image: 'university_hall'
  },
  {
    name: 'John Harvard Statue',
    lat: 42.374461,
    lng: -71.117218,
    description: 'The famous statue of John Harvard',
    image: 'john_harvard_statue'
  },
  {
    name: 'Widener Library',
    lat: 42.373637,
    lng: -71.116430,
    description: 'Harvard\'s flagship library',
    image: 'widener_library'
  },
  {
    name: 'Memorial Church',
    lat: 42.374905,
    lng: -71.116043,
    description: 'The spiritual center of Harvard',
    image: 'memorial_church'
  },
  {
    name: 'Sever Hall',
    lat: 42.374366,
    lng: -71.115507,
    description: 'A classroom building with unique architecture',
    image: 'sever_hall'
  },
  {
    name: 'Wadsworth House',
    lat: 42.373391,
    lng: -71.118127,
    description: 'One of the oldest structures on campus',
    image: 'wadsworth_house'
  },
  {
    name: 'Holden Chapel',
    lat: 42.375271,
    lng: -71.118123,
    description: 'The third oldest building at Harvard',
    image: 'holden_chapel'
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

type MapMode = 'explorer' | 'seeAll';

// Define a more specific type for Landmark if possible
interface Landmark {
  name: string;
  lat: number;
  lng: number;
  description: string;
  image: string;
}

// User location component
interface UserLocationProps {
  onLocationUpdate: (location: L.LatLng) => void;
}

function UserLocation({ onLocationUpdate }: UserLocationProps) {
  const map = useMap();

  useEffect(() => {
    if (!navigator.geolocation) {
      console.log('Geolocation is not supported by your browser');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = L.latLng(pos.coords.latitude, pos.coords.longitude);
        onLocationUpdate(newPos);
      },
      (err) => {
        console.error('Error getting location:', err);
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [map, onLocationUpdate]);

  return null;
}

// Memoized Landmark Marker Component
interface LandmarkMarkerProps {
  landmark: Landmark;
  isClicked: boolean;
  userLocation: L.LatLng | null;
  mapMode: MapMode;
  onMarkerClick: (landmark: Landmark, distance: number | null) => void;
}

const MemoizedLandmarkMarker: React.FC<LandmarkMarkerProps> = React.memo(({
  landmark,
  isClicked,
  userLocation,
  mapMode,
  onMarkerClick
}) => {
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [currentOpacity, setCurrentOpacity] = useState<number>(1);
  const [currentBlurPx, setCurrentBlurPx] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(true);

  useEffect(() => {
    let newDistance: number | null = null;
    let newOpacity = 1;
    let newBlurPx = 0;
    let newIsVisible = true;

    if (mapMode === 'explorer' && userLocation) {
      const landmarkLatLng = L.latLng(landmark.lat, landmark.lng);
      newDistance = userLocation.distanceTo(landmarkLatLng);
      
      console.log(`[Debug ${landmark.name}] UserLoc: ${userLocation.lat},${userLocation.lng} | LandmarkLoc: ${landmark.lat},${landmark.lng} | Distance: ${newDistance?.toFixed(1)}m`);

      if (newDistance > DISCOVERY_RADIUS) {
        newIsVisible = false;
        console.log(`[Debug ${landmark.name}] Too far. IsVisible: false (Distance ${newDistance.toFixed(1)}m > ${DISCOVERY_RADIUS}m)`);
      } else {
        newOpacity = MIN_OPACITY + (1 - MIN_OPACITY) * Math.max(0, (DISCOVERY_RADIUS - newDistance) / (DISCOVERY_RADIUS - INTERACTION_RADIUS));
        newOpacity = Math.min(1, Math.max(MIN_OPACITY, newOpacity));
        
        newBlurPx = MAX_BLUR_PX * Math.max(0, (newDistance - INTERACTION_RADIUS) / (DISCOVERY_RADIUS - INTERACTION_RADIUS));
        newBlurPx = Math.min(MAX_BLUR_PX, Math.max(0, newBlurPx));
        console.log(`[Debug ${landmark.name}] In range. Opacity: ${newOpacity.toFixed(2)}, Blur: ${newBlurPx.toFixed(1)}px. IsVisible: true`);
      }
    } else if (mapMode === 'seeAll') {
      console.log(`[Debug ${landmark.name}] SeeAll mode. Opacity: 1, Blur: 0, IsVisible: true`);
    } else if (!userLocation && mapMode === 'explorer'){
      newIsVisible = false; // Hide if explorer mode and no user location yet
      console.log(`[Debug ${landmark.name}] Explorer mode, no user location yet. IsVisible: false`);
    }
    
    setCurrentDistance(newDistance);
    const finalOpacity = mapMode === 'seeAll' ? 1 : newOpacity;
    const finalBlurPx = mapMode === 'seeAll' ? 0 : newBlurPx;
    const finalIsVisible = mapMode === 'seeAll' ? true : newIsVisible;

    setCurrentOpacity(finalOpacity);
    setCurrentBlurPx(finalBlurPx);
    setIsVisible(finalIsVisible);

    console.log(`[Debug ${landmark.name}] Final States - Visible: ${finalIsVisible}, Opacity: ${finalOpacity.toFixed(2)}, Blur: ${finalBlurPx.toFixed(1)}px, Distance: ${newDistance?.toFixed(1)}m`);

  }, [landmark, userLocation, mapMode, isClicked]);

  const icon = useMemo(() => {
    return createImageMarker(
      landmark.image,
      isClicked,
      currentOpacity,
      currentBlurPx
    );
  }, [landmark.image, isClicked, currentOpacity, currentBlurPx]);

  const handleInteraction = () => {
    if (mapMode === 'explorer' && userLocation && currentDistance !== null) {
      if (currentDistance > INTERACTION_RADIUS) {
        console.log(`Too far to interact with ${landmark.name}. Needs to be within ${INTERACTION_RADIUS}m, currently ${currentDistance.toFixed(1)}m`);
        // Optionally, provide feedback like a subtle shake or a toast message
        return;
      }
    }
    onMarkerClick(landmark, currentDistance);
  };
  
  if (!isVisible) {
    return null; // Don't render if too far in explorer mode and not in seeAll mode
  }

  return (
    <Marker
      position={[landmark.lat, landmark.lng]}
      icon={icon}
      eventHandlers={{ click: handleInteraction }}
    >
      <Popup>
        <div className="p-2 bg-white rounded-lg shadow-lg">
          <h3 className="font-bold text-lg mb-1 text-[#FF6B6B]">{landmark.name}</h3>
          <p className="text-sm text-gray-600">{landmark.description}</p>
          {mapMode === 'explorer' && userLocation && currentDistance !== null && (
             <p className="text-xs text-gray-500 mt-1">
               Distance: {currentDistance.toFixed(1)}m. 
               {currentDistance > INTERACTION_RADIUS ? ` Get closer to interact (within ${INTERACTION_RADIUS}m).` : ' Click to explore!'}
             </p>
          )}
        </div>
      </Popup>
    </Marker>
  );
});
MemoizedLandmarkMarker.displayName = 'MemoizedLandmarkMarker';

export default function HarvardMap() {
  const mapRef = useRef(null);
  const [isOffline, setIsOffline] = useState(false);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [selectedLandmark, setSelectedLandmark] = useState<any | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [clickedMarkers, setClickedMarkers] = useState<Set<string>>(new Set());
  const [userLocation, setUserLocation] = useState<L.LatLng | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>('explorer');

  // Typed LANDMARKS constant
  const typedLandmarks: Landmark[] = LANDMARKS;

  // Load clicked markers from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem('clickedMarkers');
      if (raw) {
        try {
          const arr: string[] = JSON.parse(raw);
          setClickedMarkers(new Set(arr));
        } catch (e) {
          console.error('Failed to parse clickedMarkers from localStorage', e);
        }
      }
    }
  }, []);

  // Persist clicked markers to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const arr = Array.from(clickedMarkers);
      window.localStorage.setItem('clickedMarkers', JSON.stringify(arr));
    }
  }, [clickedMarkers]);

  useEffect(() => {
    // Check if we're offline
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Preload tiles
    const preloadTiles = async () => {
      try {
        const response = await fetch('/map-tiles/14/0/0.png');
        if (response.ok) {
          setTilesLoaded(true);
        }
      } catch (error) {
        console.error('Failed to preload tiles:', error);
      }
    };

    preloadTiles();

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

  const handleMarkerClick = (landmark: Landmark, distance: number | null) => {
    if (mapMode === 'explorer' && userLocation && distance !== null) {
      if (distance > INTERACTION_RADIUS) {
        console.log(`Too far to interact with ${landmark.name}. Distance: ${distance.toFixed(1)}m`);
        return;
      }
    }
    // Mark this landmark as clicked
    setClickedMarkers(prev => new Set(prev).add(landmark.name));
    setSelectedLandmark(landmark);
    setShowChat(true); // Switch to chat view
    console.log("Selected landmark:", landmark);
  };

  const toggleMapMode = () => {
    setMapMode(prevMode => prevMode === 'explorer' ? 'seeAll' : 'explorer');
  };

  // If showing chat, don't render the map
  if (showChat && selectedLandmark) {
    return (
      <ChatView 
        landmark={selectedLandmark} 
        onBack={() => setShowChat(false)} 
      />
    );
  }
  return (
    <div className="map-container relative h-full w-full flex flex-col">
      {isOffline && !tilesLoaded && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-yellow-500 text-white p-2 text-center">
          You're offline. Map tiles may not load properly if not previously cached.
        </div>
      )}
      {isOffline && tilesLoaded && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-green-500 text-white p-2 text-center">
          Using cached map tiles in offline mode.
        </div>
      )}
      <div className="bg-black text-white h-16 flex items-center justify-between px-4">
        <h1 className="text-2xl font-extrabold tracking-wide">POLARIS</h1>
        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleMapMode}
            className="text-xs bg-blue-500 hover:bg-blue-700 text-white py-1 px-2 rounded"
          >
            Mode: {mapMode === 'explorer' ? 'Explorer' : 'See All'}
          </button>
          {mapMode === 'explorer' && (
            <div className="text-xs">
              Unlocked: {clickedMarkers.size} / {LANDMARKS.length}
            </div>
          )}
        </div>
      </div>
      {mapMode === 'explorer' && (
        <div className="w-full bg-gray-200 h-1">
          <div 
            className="bg-green-500 h-1" 
            style={{ width: `${(clickedMarkers.size / LANDMARKS.length) * 100}%` }}
          ></div>
        </div>
      )}
      <div className="flex-1 relative">
        <MapContainer
          ref={mapRef}
          center={[HARVARD_YARD.lat, HARVARD_YARD.lng]}
          zoom={16}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
          maxBounds={HARVARD_BOUNDS}
          maxBoundsViscosity={1.0}
          zoomControl={false}
        >
          <MapDebug />
          <ZoomControl position="bottomright" />
          <TileLayer
            url={TILE_LAYER_URL}
            {...tileLayerOptions}
          />
          <UserLocation onLocationUpdate={setUserLocation} />
          {userLocation && (
            <Marker position={userLocation} icon={createUserLocationMarker()}>
              <Popup>You are here</Popup>
            </Marker>
          )}
          {typedLandmarks.map((landmark) => (
            <MemoizedLandmarkMarker
              key={landmark.name} // Assuming landmark.name is unique and stable
              landmark={landmark}
              isClicked={clickedMarkers.has(landmark.name)}
              userLocation={userLocation}
              mapMode={mapMode}
              onMarkerClick={handleMarkerClick}
            />
          ))}
        </MapContainer>
        <a 
          href="sms:+18574458893?body=Hi%20Andreas%2C%20this%20is%20about%20Polaris. "
          className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 hover:text-white transition-colors bg-black/50 px-2 py-1 rounded"
        >
          feedback
        </a>
      </div>
    </div>
  );
}
