
"use client";

import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";

export type OperatorLiveBus = {
  id: string;
  fleetCode: string;
  routeId: string | null;
  position: {
    latitude: number;
    longitude: number;
    source: string;
    speedKmh: number | null;
    recordedAt: string;
    isFresh: boolean;
  } | null;
};

type Props = {
  buses: OperatorLiveBus[];
  selectedRouteId: string;
};

const BAKU_CENTER: LatLngTuple = [40.4093, 49.8671];

function FocusBuses({
  buses,
  selectedRouteId,
}: Props) {
  const map = useMap();

  const coordinates = useMemo(
    () =>
      buses
        .filter(
          (bus) =>
            bus.position &&
            Number.isFinite(bus.position.latitude) &&
            Number.isFinite(bus.position.longitude)
        )
        .map(
          (bus): LatLngTuple => [
            bus.position!.latitude,
            bus.position!.longitude,
          ]
        ),
    [buses]
  );

  // Yalnız marşrut dəyişəndə xəritəni yenidən fokuslayırıq.
  // Hər GPS yenilənməsində istifadəçinin zoom-u pozulmur.
  useEffect(() => {
    if (coordinates.length === 0) {
      map.setView(BAKU_CENTER, 12);
    } else if (coordinates.length === 1) {
      map.setView(coordinates[0], 15);
    } else {
      map.fitBounds(coordinates, {
        padding: [55, 55],
        maxZoom: 15,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, selectedRouteId]);

  return null;
}

export default function OperatorGpsMap({
  buses,
  selectedRouteId,
}: Props) {
  const positionedBuses = buses.filter(
    (bus) =>
      bus.position &&
      Number.isFinite(bus.position.latitude) &&
      Number.isFinite(bus.position.longitude)
  );

  return (
    <div className="relative isolate h-full min-h-[400px] w-full overflow-hidden rounded-xl">
      <MapContainer
        center={BAKU_CENTER}
        zoom={12}
        scrollWheelZoom
        className="!z-0 h-full w-full"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <FocusBuses
          buses={positionedBuses}
          selectedRouteId={selectedRouteId}
        />

        {positionedBuses.map((bus) => {
          const position = bus.position!;

          return (
            <CircleMarker
              key={bus.id}
              center={[
                position.latitude,
                position.longitude,
              ]}
              radius={12}
              pathOptions={{
                color: "#ffffff",
                weight: 3,
                fillColor: position.isFresh
                  ? "#22c55e"
                  : "#64748b",
                fillOpacity: 0.95,
              }}
            >
              <Popup>
                <div className="min-w-[170px] space-y-1">
                  <strong>{bus.fleetCode}</strong>

                  <div>
                    {position.isFresh
                      ? "Aktiv GPS mövqeyi"
                      : "Köhnə GPS mövqeyi"}
                  </div>

                  <div>
                    Sürət: {position.speedKmh ?? 0} km/saat
                  </div>

                  <div>Mənbə: {position.source}</div>

                  <div>
                    Son qeyd:{" "}
                    {new Date(
                      position.recordedAt
                    ).toLocaleTimeString("az-AZ")}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] rounded-lg border border-white/10 bg-[#071120]/95 px-3 py-2 text-xs text-white shadow-lg">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
          Aktiv GPS
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
          Köhnə GPS
        </div>
      </div>
    </div>
  );
}
