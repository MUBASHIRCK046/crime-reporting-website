"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Search, Locate } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue in Leaflet with Next.js/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Original three markers clustered around Mukkam, Kozhikode, Kerala, India
const locations = [
  {
    id: 1,
    name: "Police Station - North",
    lng: 75.9912,
    lat: 11.3208,
  },
  {
    id: 2,
    name: "Safe Zone - Central",
    lng: 75.9960,
    lat: 11.3235,
  },
  {
    id: 3,
    name: "Hospital",
    lng: 75.9940,
    lat: 11.3175,
  },
];

// Helper to calculate Haversine distance
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function formatDistance(distInKm: number): string {
  if (distInKm < 1) {
    return `${Math.round(distInKm * 1000)} m`;
  }
  return `${distInKm.toFixed(1)} km`;
}

function formatDuration(durationInSecs: number): string {
  const mins = Math.round(durationInSecs / 60);
  if (mins < 60) {
    return `${mins} min`;
  }
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hrs} hr ${remainingMins} min`;
}

function MapRefSetter({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    return () => {
      mapRef.current = null;
    };
  }, [map, mapRef]);
  return null;
}

function MapClickHandler({ onClick }: { onClick: () => void }) {
  useMapEvents({
    click: () => {
      onClick();
    },
  });
  return null;
}

interface SafetyMapProps {
  externalMapRef?: React.MutableRefObject<L.Map | null>;
  sosAlerts?: any[];
  selectedAlertId?: string | null;
  onAlertMarkerClick?: (alert: any) => void;
  hideDetails?: boolean;
}

export function SafetyMap({
  externalMapRef,
  sosAlerts = [],
  selectedAlertId = null,
  onAlertMarkerClick,
  hideDetails = false
}: SafetyMapProps = {}) {
  const internalMapRef = useRef<L.Map | null>(null);
  const mapRef = externalMapRef || internalMapRef;

  const defaultCenter: [number, number] = [11.3204, 75.9922];
  const defaultZoom = 14;

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [searchMarker, setSearchMarker] = useState<{ lat: number; lng: number; name: string } | null>(null);

  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [nearestStation, setNearestStation] = useState<typeof locations[0] | null>(null);
  const [nearestDistance, setNearestDistance] = useState<number | null>(null);

  const [selectedStation, setSelectedStation] = useState<typeof locations[0] | null>(null);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<{
    geometry: [number, number][];
    distance: number;
    duration: number;
    steps: { instruction: string; distance: number }[];
  } | null>(null);

  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [pulseRadius, setPulseRadius] = useState(80);

  // Custom standalone popup state for programmatic popups
  const [programmaticPopup, setProgrammaticPopup] = useState<{
    lat: number;
    lng: number;
    content: string;
    distance?: number;
  } | null>(null);

  // Expanding ring sonar pulse animation for nearest station
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (nearestStation) {
      interval = setInterval(() => {
        setPulseRadius((prev) => {
          if (prev >= 250) return 80;
          return prev + 8;
        });
      }, 50);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [nearestStation]);

  // Memoize custom icons
  const customIcons = useMemo(() => {
    if (typeof window === "undefined") return null;

    return {
      user: L.divIcon({
        className: "custom-user-icon",
        html: `<div class="relative flex items-center justify-center w-6 h-6">
                 <div class="absolute w-6 h-6 bg-blue-500 rounded-full opacity-40 animate-ping"></div>
                 <div class="relative w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
               </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
      search: L.divIcon({
        className: "custom-search-icon",
        html: `<div class="w-8 h-8 bg-amber-500 rounded-full border border-white/50 shadow-[0_0_12px_rgba(245,158,11,0.4)] flex items-center justify-center text-white animate-bounce">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
               </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      }),
    };
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setNearestStation(null);
    setNearestDistance(null);
    setProgrammaticPopup(null);
    setSelectedStation(null);
    setRouteInfo(null);
    setRoutingError(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lon = parseFloat(first.lon);
        
        if (mapRef.current) {
          mapRef.current.flyTo([lat, lon], 14, { duration: 1.5 });
        }
        
        setSearchMarker({
          lat,
          lng: lon,
          name: first.display_name,
        });
        setShowSearchInput(false);
      } else {
        showAlert("Location not found.");
      }
    } catch (err) {
      console.error("Search error:", err);
      showAlert("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleLocateUser = () => {
    if (locating) return; // Prevent multiple requests

    if (typeof window !== "undefined" && navigator.geolocation) {
      setLocating(true);
      setSearchMarker(null);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLoc([lat, lng]);
          
          if (mapRef.current) {
            mapRef.current.flyTo([lat, lng], 14, { duration: 1.5 });
          }

          // Find nearest police station from available locations (name contains police)
          let minDistance = Infinity;
          let closest: typeof locations[0] | null = null;

          for (const loc of locations) {
            if (loc.name.toLowerCase().includes("police")) {
              const dist = getDistance(lat, lng, loc.lat, loc.lng);
              if (dist < minDistance) {
                minDistance = dist;
                closest = loc;
              }
            }
          }

          if (closest) {
            setNearestStation(closest);
            setNearestDistance(minDistance);
            setSelectedStation(closest);
            
            // Set programmatic popup to automatically open on the nearest station
            setProgrammaticPopup({
              lat: closest.lat,
              lng: closest.lng,
              content: closest.name,
              distance: minDistance,
            });
          }
          setLocating(false);
        },
        (error) => {
          console.warn("Geolocation error:", error);
          setLocating(false);
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              showAlert("Location permission was denied. Please enable location access and try again.");
              break;
            case error.POSITION_UNAVAILABLE:
              showAlert("Your current location could not be determined. Please try again.");
              break;
            case error.TIMEOUT:
              showAlert("Location request timed out. Please try again.");
              break;
            default:
              showAlert("Unable to determine your current location.");
              break;
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      showAlert("Geolocation is not supported by your browser.");
      setLocating(false);
    }
  };

  const handleShowNearestStation = () => {
    if (userLoc) {
      let minDistance = Infinity;
      let closest: typeof locations[0] | null = null;

      for (const loc of locations) {
        if (loc.name.toLowerCase().includes("police")) {
          const dist = getDistance(userLoc[0], userLoc[1], loc.lat, loc.lng);
          if (dist < minDistance) {
            minDistance = dist;
            closest = loc;
          }
        }
      }

      if (closest) {
        setNearestStation(closest);
        setNearestDistance(minDistance);
        setSelectedStation(closest);
        
        if (mapRef.current) {
          const bounds = L.latLngBounds([userLoc, [closest.lat, closest.lng]]);
          mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
        
        setProgrammaticPopup({
          lat: closest.lat,
          lng: closest.lng,
          content: closest.name,
          distance: minDistance,
        });
      }
    } else {
      // If user position is not known, run locating flow first
      handleLocateUser();
    }
  };

  const calculateRoute = async () => {
    if (!userLoc || !selectedStation) return;
    setRoutingLoading(true);
    setRoutingError(null);
    setRouteInfo(null);

    const startLng = userLoc[1];
    const startLat = userLoc[0];
    const destLng = selectedStation.lng;
    const destLat = selectedStation.lat;

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("OSRM routing server failure");
      const data = await res.json();

      if (data && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const routeCoords = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
        
        const steps = route.legs[0].steps.map((s: any) => ({
          instruction: s.maneuver.instruction,
          distance: s.distance,
        }));

        setRouteInfo({
          geometry: routeCoords,
          distance: route.distance,
          duration: route.duration,
          steps,
        });

        if (mapRef.current) {
          const bounds = L.latLngBounds(routeCoords);
          mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
      } else {
        setRoutingError("Unable to calculate a route right now. Please try again.");
      }
    } catch (err) {
      console.error("OSRM error:", err);
      setRoutingError("Unable to calculate a route right now. Please try again.");
    } finally {
      setRoutingLoading(false);
    }
  };

  const showAlert = (msg: string) => {
    setAlertMessage(msg);
    setTimeout(() => {
      setAlertMessage(null);
    }, 5000);
  };

  const handleResetMapState = () => {
    setNearestStation(null);
    setNearestDistance(null);
    setProgrammaticPopup(null);
    setSelectedStation(null);
    setRouteInfo(null);
    setRoutingError(null);
  };

  const getLocateButtonContent = () => {
    if (locating) {
      return (
        <>
          <span className="mr-1">⏳</span>
          <span className="truncate">Locating...</span>
        </>
      );
    }
    if (userLoc) {
      return (
        <>
          <span className="mr-1">📍</span>
          <span className="truncate">My Location</span>
        </>
      );
    }
    return (
      <>
        <span className="mr-1">📍</span>
        <span className="truncate">Current Location</span>
      </>
    );
  };

  // Center on selected SOS alert when it changes
  useEffect(() => {
    if (selectedAlertId && sosAlerts.length > 0) {
      const selected = sosAlerts.find(a => a.id === selectedAlertId);
      if (selected && selected.latitude && selected.longitude && mapRef.current) {
        mapRef.current.flyTo([selected.latitude, selected.longitude], 16, { duration: 1.5 });
      }
    }
  }, [selectedAlertId, sosAlerts, mapRef]);

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-4 p-1">
      
      {/* Left Pane - Leaflet Map Box */}
      <div className={`relative h-[260px] lg:h-full rounded-xl overflow-hidden border border-slate-800 shadow-lg ${hideDetails ? 'flex-1 w-full' : 'flex-1 lg:flex-[2]'}`}>
        {/* Alert Overlay */}
        {alertMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-slate-950/95 border border-rose-500/50 rounded-xl px-4 py-2.5 shadow-2xl text-xs text-rose-200 backdrop-blur-md animate-fade-in text-center max-w-[90%] md:max-w-md">
            {alertMessage}
          </div>
        )}

        {/* Floating Vertical Controls Panel (Top-Right) */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 items-end">
          <div className="flex flex-col bg-slate-950/90 border border-slate-800 rounded-xl p-1.5 shadow-xl backdrop-blur-md gap-2 w-32 sm:w-36">
            
            {/* 1. Current Location Button */}
            <button
              onClick={handleLocateUser}
              disabled={locating}
              className="bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white font-semibold text-[10px] sm:text-xs py-2 px-2 rounded-lg flex items-center justify-start gap-2 transition-all disabled:opacity-50 w-full shadow-md"
            >
              {getLocateButtonContent()}
            </button>

            {/* 2. Search Toggle Button */}
            <div className="relative w-full">
              <button
                onClick={() => setShowSearchInput(!showSearchInput)}
                className={`bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[10px] sm:text-xs py-2 px-2 rounded-lg flex items-center justify-start gap-2 transition-all w-full shadow-md ${showSearchInput ? "bg-rose-700" : ""}`}
              >
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span>Search</span>
              </button>
              
              {showSearchInput && (
                <div className="absolute top-0 right-[105%] flex items-center gap-1 bg-slate-950/95 border border-slate-800 rounded-xl p-1 shadow-2xl backdrop-blur-md animate-fade-in w-36 sm:w-44 md:w-48">
                  <input
                    type="text"
                    placeholder="Search location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                    autoFocus
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching}
                    className="bg-rose-600 hover:bg-rose-500 text-white rounded-lg p-1 text-xs font-semibold flex items-center justify-center transition-all disabled:opacity-50 h-6 w-6 shrink-0"
                    title="Run Search"
                  >
                    {searching ? "..." : <Search className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>

            {/* 3. Nearest Police Station Button */}
            <button
              onClick={handleShowNearestStation}
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[10px] sm:text-xs py-2 px-2 rounded-lg flex items-center justify-start gap-2 transition-all w-full shadow-md"
            >
              <span className="text-xs leading-none w-3.5 text-center shrink-0">🚔</span>
              <span className="truncate">Nearest Station</span>
            </button>

          </div>
        </div>

        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          scrollWheelZoom={true}
          style={{ width: "100%", height: "100%" }}
        >
          <MapRefSetter mapRef={mapRef} />
          
          {/* Reset nearest station highlights when user clicks on map */}
          <MapClickHandler onClick={handleResetMapState} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* User Location Indicator */}
          {userLoc && customIcons?.user && (
            <Marker position={userLoc} icon={customIcons.user}>
              <Popup>
                <div className="text-xs font-semibold text-slate-900 font-sans p-1">
                  📍 You are here
                </div>
              </Popup>
            </Marker>
          )}

          {/* Search marker */}
          {searchMarker && customIcons?.search && (
            <Marker position={[searchMarker.lat, searchMarker.lng]} icon={customIcons.search}>
              <Popup>
                <div className="text-xs font-sans text-slate-900 max-w-[200px]">
                  <span className="font-bold block mb-1">🔍 Searched Location</span>
                  {searchMarker.name}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Sonar Radar pulse animation ring around nearest police station */}
          {nearestStation && (
            <Circle
              center={[nearestStation.lat, nearestStation.lng]}
              radius={pulseRadius}
              pathOptions={{
                color: "#f43f5e",
                fillColor: "#f43f5e",
                fillOpacity: 0.2 * (1 - (pulseRadius - 80) / 170),
                weight: 2,
              }}
            />
          )}

          {/* Polyline Route Overlay */}
          {routeInfo?.geometry && (
            <Polyline
              positions={routeInfo.geometry}
              pathOptions={{ color: "#3b82f6", weight: 5, opacity: 0.8 }}
            />
          )}

          {/* Programmatic Popup for Nearest Station */}
          {programmaticPopup ? (
            <Popup
              position={[programmaticPopup.lat, programmaticPopup.lng]}
              eventHandlers={{
                remove: () => setProgrammaticPopup(null)
              }}
            >
              <div style={{ color: "#0f172a", padding: "6px", fontFamily: "system-ui, -apple-system, sans-serif", minWidth: "160px" }}>
                <h4 style={{ margin: "0 0 4px 0", fontWeight: 700, fontSize: "14px" }}>{programmaticPopup.content}</h4>
                {programmaticPopup.distance !== undefined ? (
                  <p style={{ margin: "0", fontSize: "11px", color: "#e11d48", fontWeight: 600 }}>
                    Nearest Police Station — {formatDistance(programmaticPopup.distance)} away
                  </p>
                ) : null}
                <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#64748b" }}>
                  Coords: {programmaticPopup.lat.toFixed(4)}, {programmaticPopup.lng.toFixed(4)}
                </p>
                <div style={{ marginTop: "8px", borderTop: "1px solid #e2e8f0", paddingTop: "6px" }}>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${programmaticPopup.lat},${programmaticPopup.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "12px", fontWeight: 600, color: "#10b981", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    Get Directions {"→"}
                  </a>
                </div>
              </div>
            </Popup>
          ) : null}

          {/* 3 Permanent Markers */}
          {locations.map((loc) => (
            <Marker
              key={loc.id}
              position={[loc.lat, loc.lng]}
              eventHandlers={{
                click: () => {
                  handleResetMapState();
                  setSelectedStation(loc);
                  if (userLoc) {
                    const dist = getDistance(userLoc[0], userLoc[1], loc.lat, loc.lng);
                    setNearestDistance(dist);
                  }
                },
              }}
            >
              <Popup>
                <div style={{ color: "#0f172a", padding: "6px", fontFamily: "system-ui, -apple-system, sans-serif", minWidth: "150px" }}>
                  <h4 style={{ margin: "0 0 4px 0", fontWeight: 700, fontSize: "14px" }}>{loc.name}</h4>
                  <p style={{ margin: "0", fontSize: "11px", color: "#64748b" }}>
                    Coords: {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                  </p>
                  <div style={{ marginTop: "8px", borderTop: "1px solid #e2e8f0", paddingTop: "6px" }}>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "12px", fontWeight: 600, color: "#10b981", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      Get Directions {"→"}
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Active/All SOS Markers */}
          {sosAlerts.map((alert) => {
            const isSelected = alert.id === selectedAlertId;
            const sosIcon = typeof window !== "undefined" ? L.divIcon({
              className: "custom-sos-marker-icon",
              html: `<div class="relative flex items-center justify-center ${isSelected ? 'w-10 h-10' : 'w-8 h-8'}">
                       <div class="absolute w-full h-full bg-red-500 rounded-full opacity-40 animate-ping"></div>
                       <div class="relative ${isSelected ? 'w-6 h-6' : 'w-5 h-5'} bg-red-650 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[10px]">
                         🔴
                       </div>
                     </div>`,
              iconSize: isSelected ? [40, 40] : [32, 32],
              iconAnchor: isSelected ? [20, 20] : [16, 16],
            }) : null;

            return alert.latitude && alert.longitude && sosIcon ? (
              <Marker
                key={alert.id}
                position={[alert.latitude, alert.longitude]}
                icon={sosIcon}
                eventHandlers={{
                  click: () => {
                    if (onAlertMarkerClick) {
                      onAlertMarkerClick(alert);
                    }
                  },
                }}
              >
                <Popup>
                  <div style={{ color: "#0f172a", padding: "6px", fontFamily: "system-ui, -apple-system, sans-serif", minWidth: "180px" }}>
                    <h4 style={{ margin: "0 0 4px 0", fontWeight: 700, fontSize: "14px", color: "#e11d48" }}>🚨 EMERGENCY SOS</h4>
                    <p style={{ margin: "4px 0 2px 0", fontSize: "12px", fontWeight: 600 }}>Citizen: {alert.citizenName || "Unknown"}</p>
                    <p style={{ margin: "0", fontSize: "11px", color: "#64748b" }}>Phone: {alert.citizenPhone || "N/A"}</p>
                    <p style={{ margin: "0", fontSize: "11px", color: "#64748b" }}>Status: {alert.status}</p>
                    <p style={{ margin: "0", fontSize: "11px", color: "#64748b" }}>Time: {new Date(alert.createdAt || alert.timestamp).toLocaleTimeString()}</p>
                    <div style={{ marginTop: "8px", borderTop: "1px solid #e2e8f0", paddingTop: "6px" }}>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${alert.latitude},${alert.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: "11px", fontWeight: 600, color: "#2563eb", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        Open in Google Maps {"→"}
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ) : null;
          })}
        </MapContainer>
      </div>

      {/* Right Pane - Details Column Box */}
      {!hideDetails && (
        <div className="flex-1 lg:flex-[1] h-[210px] lg:h-full overflow-y-auto bg-slate-950/95 border border-slate-800 rounded-xl shadow-lg scrollbar-thin scrollbar-thumb-slate-800">
        {selectedStation ? (
          <div className="p-4 space-y-4 text-white font-sans">
            <div>
              <h4 className="text-[10px] font-bold text-rose-500 tracking-wider uppercase mb-1">
                🚔 Selected Station
              </h4>
              <h3 className="text-base font-bold text-white leading-tight">{selectedStation.name}</h3>
            </div>
            
            <div className="space-y-2 text-xs text-slate-300">
              <p className="flex items-start gap-1.5">
                <span className="font-semibold text-slate-400 w-16 shrink-0">📍 Address:</span>
                <span>Mukkam, Kozhikode, Kerala, India</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="font-semibold text-slate-400 w-16 shrink-0">📏 Distance:</span>
                <span className="font-bold text-rose-400">
                  {nearestDistance !== null ? `${formatDistance(nearestDistance)} away` : "Locate to check distance"}
                </span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="font-semibold text-slate-400 w-16 shrink-0">🕐 Open:</span>
                <span className="text-emerald-400 font-semibold">Open 24 Hours</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="font-semibold text-slate-400 w-16 shrink-0">📞 Phone:</span>
                <a href="tel:04952297022" className="text-blue-400 hover:underline">0495-2297022</a>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={calculateRoute}
                disabled={routingLoading || !userLoc}
                className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800/50 disabled:cursor-not-allowed text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                <span>🧭</span> {routingLoading ? "Finding best route..." : "Get Directions"}
              </button>
              
              {userLoc && (
                <a
                  href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${userLoc[0]}%2C${userLoc[1]}%3B${selectedStation.lat}%2C${selectedStation.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all border border-slate-800 shadow-md text-center"
                >
                  Open Directions
                </a>
              )}
            </div>

            {/* Route & Turn-by-Turn Panel */}
            {(routeInfo || routingError) && (
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 tracking-wider uppercase">
                  <span>🛣</span> Best Route
                </h4>

                {routingError ? (
                  <p className="text-xs text-rose-400 bg-rose-950/20 border border-rose-900/30 rounded-lg p-2.5">
                    {routingError}
                  </p>
                ) : routeInfo ? (
                  <div className="space-y-3">
                    <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-2.5 space-y-1 text-xs">
                      <p className="text-[10px] font-bold text-rose-500 flex items-center gap-1 uppercase tracking-wider">
                        <span>⭐</span> Recommended Route
                      </p>
                      <div className="grid grid-cols-1 gap-1 text-[11px] pt-1">
                        <p><span className="text-slate-400">Distance:</span> <span className="font-semibold text-slate-200">{formatDistance(routeInfo.distance / 1000)}</span></p>
                        <p><span className="text-slate-400">Time:</span> <span className="font-semibold text-slate-200">{formatDuration(routeInfo.duration)}</span></p>
                      </div>
                    </div>

                    {/* Turn-by-turn Collapse */}
                    {routeInfo.steps && routeInfo.steps.length > 0 && (
                      <details className="group border border-slate-800 rounded-lg overflow-hidden" open>
                        <summary className="bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 cursor-pointer hover:bg-slate-850 flex items-center justify-between transition-all select-none">
                          <span className="flex items-center gap-1">
                            <span>🧭</span> How to Get There
                          </span>
                          <span className="transition-transform duration-200 group-open:rotate-180 text-[10px] text-slate-500">▼</span>
                        </summary>
                        <div className="p-2.5 bg-slate-950/60 max-h-36 overflow-y-auto text-[11px] text-slate-300 space-y-2 divide-y divide-slate-900">
                          {routeInfo.steps.map((step, idx) => (
                            <div key={idx} className="pt-2 flex items-start gap-1.5">
                              <span className="text-slate-500 font-mono w-4 shrink-0">{idx + 1}.</span>
                              <div className="flex-1">
                                <p className="font-medium text-slate-200 leading-tight">{step.instruction}</p>
                                {step.distance > 0 && (
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    Continue for {formatDistance(step.distance / 1000)}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-5 text-slate-400 select-none">
            <span className="text-2xl mb-2">🚔</span>
            <h4 className="text-xs font-bold text-slate-200 mb-1">Police Station Details</h4>
            <p className="text-[10px] text-slate-500 max-w-[150px] leading-relaxed">
              Select a marker or click <strong>"Current Location"</strong> to calculate and show police details.
            </p>
          </div>
        )}
        </div>
      )}

    </div>
  );
}
