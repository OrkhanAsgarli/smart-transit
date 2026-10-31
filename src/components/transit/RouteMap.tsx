
"use client";

import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type Point = [number, number];

export type DisplayRoute = {
  id: string;
  number: string;
  outbound: Point[];
  inbound: Point[];
};

type Direction = "OUTBOUND" | "INBOUND";

type Props = {
  routes: DisplayRoute[];
  selectedId: string;
  editing: boolean;
  activeDirection: Direction;
  draft: Point[];
  otherDraft?: Point[];
  onAddPoint: (point: Point) => void;
};

function MapClickHandler({
  enabled,
  onAddPoint,
}: {
  enabled: boolean;
  onAddPoint: (point: Point) => void;
}) {
  useMapEvents({
    click(event) {
      if (!enabled) return;

      onAddPoint([
        event.latlng.lat,
        event.latlng.lng,
      ]);
    },
  });

  return null;
}

function RouteFocus({
  selectedId,
  points,
  editing,
}: {
  selectedId: string;
  points: Point[];
  editing: boolean;
}) {
  const map = useMap();

  // Yalnız seçilmiş marşrut dəyişəndə fokuslanır.
  // Redaktorun hər klikində xəritə yerini dəyişmir.
  useEffect(() => {
    if (editing || !selectedId) return;

    if (points.length >= 2) {
      map.fitBounds(points, {
        padding: [45, 45],
        maxZoom: 15,
      });
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    }
  }, [map, selectedId, editing, points]);

  return null;
}

export default function RouteMap({
  routes,
  selectedId,
  editing,
  activeDirection,
  draft,
  otherDraft = [],
  onAddPoint,
}: Props) {
  const selected = routes.find(
    (route) => route.id === selectedId
  );

  const selectedPoints =
    selected?.outbound.length
      ? selected.outbound
      : selected?.inbound ?? [];

  return (
    <div className="relative isolate h-full min-h-[450px] w-full overflow-hidden rounded-xl">
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
          maxZoom={19}
        />

        <MapClickHandler
          enabled={editing}
          onAddPoint={onAddPoint}
        />

        <RouteFocus
          selectedId={selectedId}
          points={selectedPoints}
          editing={editing}
        />

        {/* Saxlanılmış marşrutlar yalnız əsas xəritədə göstərilir. */}
        {!editing &&
          routes.map((route) => {
            const isSelected = route.id === selectedId;

            return (
              <Polyline
                key={`${route.id}-out`}
                positions={route.outbound}
                pathOptions={{
                  color: "#06b6d4",
                  weight: isSelected ? 6 : 3,
                  opacity: isSelected ? 1 : 0.3,
                }}
              >
                <Popup>
                  Marşrut {route.number} — Gediş
                </Popup>
              </Polyline>
            );
          })}

        {!editing &&
          routes.map((route) => {
            const isSelected = route.id === selectedId;

            return (
              <Polyline
                key={`${route.id}-in`}
                positions={route.inbound}
                pathOptions={{
                  color: "#f59e0b",
                  weight: isSelected ? 6 : 3,
                  opacity: isSelected ? 1 : 0.3,
                  dashArray: "9 7",
                }}
              >
                <Popup>
                  Marşrut {route.number} — Dönüş
                </Popup>
              </Polyline>
            );
          })}

        {/* Redaktorda yalnız cari marşrutun xətləri olur. */}
        {editing && (
          <>
            <Polyline
              positions={otherDraft}
              pathOptions={{
                color:
                  activeDirection === "OUTBOUND"
                    ? "#f59e0b"
                    : "#06b6d4",
                weight: 4,
                opacity: 0.5,
                dashArray: "7 9",
              }}
            />

            <Polyline
              positions={draft}
              pathOptions={{
                color:
                  activeDirection === "OUTBOUND"
                    ? "#06b6d4"
                    : "#f59e0b",
                weight: 6,
                opacity: 0.95,
              }}
            />

            {draft.map((point, index) => (
              <CircleMarker
                key={`${activeDirection}-${index}`}
                center={point}
                radius={7}
                pathOptions={{
                  color: "#ffffff",
                  weight: 2,
                  fillColor:
                    index === 0
                      ? "#22c55e"
                      : index === draft.length - 1
                        ? "#ef4444"
                        : "#8b5cf6",
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  {index === 0
                    ? "Başlanğıc"
                    : index === draft.length - 1
                      ? "Son nöqtə"
                      : `Nöqtə ${index + 1}`}
                </Popup>
              </CircleMarker>
            ))}
          </>
        )}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] rounded-xl border border-white/10 bg-[#071120]/95 p-3 text-xs text-white shadow-xl">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
          Gediş A → B
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          Dönüş B → A
        </div>

        {editing && (
          <div className="mt-3 border-t border-white/10 pt-2 text-slate-300">
            Aktiv istiqamət:{" "}
            {activeDirection === "OUTBOUND"
              ? "Gediş"
              : "Dönüş"}
          </div>
        )}
      </div>
    </div>
  );
}
