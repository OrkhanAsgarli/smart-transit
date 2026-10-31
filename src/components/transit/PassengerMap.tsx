
"use client";

import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type PassengerStop = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  sequence: number;
};

export type LiveBus = {
  id: string;
  fleetCode: string;
  routeId: string | null;
  directionId: string | null;
  capacity: number;
  position: {
    latitude: number;
    longitude: number;
    speedKmh: number | null;
    source: string;
    isFresh: boolean;
    recordedAt: string;
  } | null;
};

type Props = {
  stops: PassengerStop[];
  buses: LiveBus[];
  selectedStopId: string;
  onSelectStop: (id: string) => void;
};

function MapFocus({ stops }: { stops: PassengerStop[] }) {
  const map = useMap();
  const directionKey = stops.map((s) => s.id).join(",");

  useEffect(() => {
    if (!stops.length) {
      map.setView([40.4093, 49.8671], 12);
      return;
    }

    const coordinates = stops.map(
      (stop): [number, number] => [
        stop.latitude,
        stop.longitude,
      ]
    );

    if (coordinates.length === 1) {
      map.setView(coordinates[0], 15);
    } else {
      map.fitBounds(coordinates, {
        padding: [45, 45],
        maxZoom: 15,
      });
    }
    // Fokus yalnız istiqamətin dayanacaqları dəyişəndə yenilənir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, directionKey]);

  return null;
}

export default function PassengerMap({
  stops,
  buses,
  selectedStopId,
  onSelectStop,
}: Props) {
  return (
    <div className="relative isolate h-full min-h-[480px] w-full overflow-hidden rounded-2xl">
      <MapContainer
        center={[40.4093, 49.8671]}
        zoom={12}
        scrollWheelZoom
        className="!z-0 h-full w-full"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <MapFocus stops={stops} />

        {stops.map((stop) => (
          <CircleMarker
            key={stop.id}
            center={[stop.latitude, stop.longitude]}
            radius={stop.id === selectedStopId ? 10 : 6}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor:
                stop.id === selectedStopId
                  ? "#f59e0b"
                  : "#06b6d4",
              fillOpacity: 0.95,
            }}
            eventHandlers={{
              click: () => onSelectStop(stop.id),
            }}
          >
            <Popup>
              <strong>{stop.name}</strong>
              <div>Dayanacaq #{stop.sequence}</div>
            </Popup>
          </CircleMarker>
        ))}

        {buses
          .filter(
            (bus) => bus.position && bus.position.isFresh
          )
          .map((bus) => (
            <CircleMarker
              key={bus.id}
              center={[
                bus.position!.latitude,
                bus.position!.longitude,
              ]}
              radius={11}
              pathOptions={{
                color: "#ffffff",
                weight: 3,
                fillColor: "#22c55e",
                fillOpacity: 1,
              }}
            >
              <Popup>
                <strong>{bus.fleetCode}</strong>
                <div>
                  {bus.position?.speedKmh ?? 0} km/saat
                </div>
                <div>
                  Mənbə: {bus.position?.source}
                </div>
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] rounded-xl bg-[#071120]/95 p-3 text-xs text-white shadow-xl">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-cyan-400" />
          Dayanacaq
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          Seçilmiş dayanacaq
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-green-500" />
          Avtobus (son 60 saniyə)
        </div>
      </div>
    </div>
  );
}
