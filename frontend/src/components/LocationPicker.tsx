import { useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon in Leaflet with Vite/Webpack
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPickerProps {
    latitude?: number;
    longitude?: number;
    onLocationChange: (lat: number, lng: number) => void;
}

function LocationMarker({
    position,
    onDragEnd,
}: {
    position: L.LatLngExpression;
    onDragEnd: (event: L.LeafletEvent) => void;
}) {
    const markerRef = useRef<L.Marker>(null);
    const map = useMapEvents({
        click() {
            // Allow clicking on map to move marker
            // We simulate a drag end event structure for consistency if needed,
            // but here we just call the handler directly if we wanted click-to-move.
            // For now, let's stick to dragging the marker or we can expose a prop.
        },
    });

    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    return (
        <Marker
            draggable={true}
            eventHandlers={{
                dragend: onDragEnd,
            }}
            position={position}
            ref={markerRef}
        >
            <Popup>Geser marker untuk menyesuaikan lokasi.</Popup>
        </Marker>
    );
}

export function LocationPicker({ latitude, longitude, onLocationChange }: LocationPickerProps) {
    // Default to Jakarta (Monas) if no coords provided
    const defaultCenter: [number, number] = [-6.175392, 106.827153];

    const position = useMemo(() => {
        return latitude && longitude ? [latitude, longitude] as [number, number] : defaultCenter;
    }, [latitude, longitude]);

    const handleDragEnd = (event: L.LeafletEvent) => {
        const marker = event.target;
        if (marker) {
            const newPos = marker.getLatLng();
            onLocationChange(newPos.lat, newPos.lng);
        }
    };

    return (
        <div className="h-[400px] w-full rounded-xl overflow-hidden border border-slate-300 z-0 relative shadow-sm">
            <MapContainer center={position} zoom={15} scrollWheelZoom={false} className="h-full w-full">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker position={position} onDragEnd={handleDragEnd} />
            </MapContainer>
        </div>
    );
}
