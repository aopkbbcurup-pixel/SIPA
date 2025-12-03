import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Fix Leaflet default icon issue
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface ComparableProperty {
    id: string;
    lat: number;
    lng: number;
    address: string;
    price: number;
    type: string;
    distance: number;
}

interface MapViewProps {
    center: [number, number];
    comparables?: ComparableProperty[];
}

function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center);
    }, [center, map]);
    return null;
}

export function MapView({ center, comparables = [] }: MapViewProps) {
    return (
        <div className="h-[400px] w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm z-0 relative">
            <MapContainer center={center} zoom={15} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
                <ChangeView center={center} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Main Property Marker */}
                <Marker position={center}>
                    <Popup>
                        <div className="p-1">
                            <h3 className="font-bold text-indigo-600">Properti Penilaian</h3>
                            <p className="text-xs text-slate-600">Lokasi Utama</p>
                        </div>
                    </Popup>
                </Marker>

                {/* Comparables Markers */}
                {comparables.map((comp) => (
                    <Marker key={comp.id} position={[comp.lat, comp.lng]}>
                        <Popup>
                            <div className="p-1 min-w-[150px]">
                                <h3 className="font-bold text-slate-800">Pembanding ({comp.type})</h3>
                                <p className="text-xs text-slate-600 mb-1">{comp.address}</p>
                                <p className="text-sm font-semibold text-emerald-600">
                                    Rp {comp.price.toLocaleString("id-ID")}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">Jarak: {comp.distance}m</p>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
