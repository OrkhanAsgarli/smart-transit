
import json
import sqlite3
import subprocess
from pathlib import Path

SQLITE_PATH = Path("data/ayna.sqlite")
CONTAINER = "smarttransit-postgres"
DB_NAME = "smarttransit_db"
DB_USER = "smarttransit"

OPERATOR_ID = "ayna-snapshot-operator"
OPERATOR_CODE = "AYNA_SNAPSHOT"
ROUTE_NUMBERS = ("1", "12")


def q(value):
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def main():
    if not SQLITE_PATH.exists():
        raise SystemExit("data/ayna.sqlite tapılmadı.")

    db = sqlite3.connect(SQLITE_PATH)
    db.row_factory = sqlite3.Row

    statements = ["BEGIN;"]

    # Rəsmi operator hesabı deyil:
    # yalnız idxal edilmiş məlumatların ayrıca qruplaşdırılmasıdır.
    statements.append(f"""
        INSERT INTO "TransitOperator"
        (id, name, code, "createdAt", "updatedAt")
        VALUES (
            {q(OPERATOR_ID)},
            {q("Açıq nəqliyyat məlumatları (snapshot)")},
            {q(OPERATOR_CODE)},
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    """)

    total_stops = 0

    for number in ROUTE_NUMBERS:
        source_bus = db.execute("""
            SELECT *
            FROM buses
            WHERE TRIM(number) = ?
            LIMIT 1
        """, (number,)).fetchone()

        if not source_bus:
            raise RuntimeError(f"Marşrut {number} tapılmadı.")

        route_id = f"ayna-snapshot-route-{number}"
        display_number = f"AYNA-{number}"

        route_name = (
            f"№{number}: "
            f"{source_bus['first_point']} - "
            f"{source_bus['last_point']}"
        )

        statements.append(f"""
            INSERT INTO "Route"
            (
                id, number, name, "isActive",
                "operatorId", "createdAt", "updatedAt"
            )
            VALUES (
                {q(route_id)},
                {q(display_number)},
                {q(route_name)},
                TRUE,
                {q(OPERATOR_ID)},
                NOW(),
                NOW()
            )
            ON CONFLICT (id)
            DO UPDATE SET
                name = EXCLUDED.name,
                "updatedAt" = NOW();
        """)

        print(f"\nMarşrut №{number}")

        for source_direction, direction_type in [
            (1, "OUTBOUND"),
            (2, "INBOUND"),
        ]:
            direction_id = (
                f"ayna-snapshot-dir-{number}-{source_direction}"
            )

            source_route = db.execute("""
                SELECT id, destination
                FROM routes
                WHERE bus_id = ?
                  AND direction_type_id = ?
                ORDER BY id
                LIMIT 1
            """, (
                source_bus["id"],
                source_direction,
            )).fetchone()

            if not source_route:
                raise RuntimeError(
                    f"{number}: {direction_type} istiqaməti yoxdur."
                )

            # Mənbədəki istiqamətin real xəritə koordinatları.
            coordinate_rows = db.execute("""
                SELECT latitude, longitude
                FROM route_coordinates
                WHERE route_id = ?
                ORDER BY sequence_order, id
            """, (source_route["id"],)).fetchall()

            coordinates = [
                [float(row["longitude"]), float(row["latitude"])]
                for row in coordinate_rows
                if row["latitude"] is not None
                and row["longitude"] is not None
                and 38 <= float(row["latitude"]) <= 42.5
                and 44 <= float(row["longitude"]) <= 51.5
            ]

            geometry_sql = "NULL"

            if len(coordinates) >= 2:
                geometry = {
                    "type": "LineString",
                    "coordinates": coordinates,
                }
                geometry_sql = (
                    q(json.dumps(geometry, ensure_ascii=False))
                    + "::jsonb"
                )

            stop_rows = db.execute("""
                SELECT
                    bs.id,
                    bs.bus_stop_id,
                    bs.stop_id,
                    d.name,
                    d.latitude,
                    d.longitude
                FROM bus_stops bs
                LEFT JOIN stop_details d
                    ON d.id = bs.stop_id
                WHERE bs.bus_id = ?
                  AND bs.direction_type_id = ?
                ORDER BY bs.bus_stop_id, bs.id
            """, (
                source_bus["id"],
                source_direction,
            )).fetchall()

            if not stop_rows:
                raise RuntimeError(
                    f"{number}: {direction_type} dayanacaqları yoxdur."
                )

            for stop in stop_rows:
                if stop["name"] is None:
                    raise RuntimeError(
                        f"Stop ID {stop['stop_id']} uyğun gəlmir."
                    )

            first_name = stop_rows[0]["name"].strip()
            last_name = stop_rows[-1]["name"].strip()

            statements.append(f"""
                INSERT INTO "RouteDirection"
                (
                    id, type, "originName",
                    "destinationName", geometry,
                    "routeId", "createdAt", "updatedAt"
                )
                VALUES (
                    {q(direction_id)},
                    {q(direction_type)},
                    {q(first_name)},
                    {q(last_name)},
                    {geometry_sql},
                    {q(route_id)},
                    NOW(),
                    NOW()
                )
                ON CONFLICT (id)
                DO UPDATE SET
                    "originName" = EXCLUDED."originName",
                    "destinationName" = EXCLUDED."destinationName",
                    geometry = EXCLUDED.geometry,
                    "updatedAt" = NOW();
            """)

            for sequence, stop in enumerate(stop_rows, start=1):
                stop_id = f"ayna-stop-{stop['stop_id']}"
                route_stop_id = (
                    f"ayna-rs-{number}-{source_direction}-{sequence}"
                )

                statements.append(f"""
                    INSERT INTO "RouteStop"
                    (id, "directionId", "stopId", sequence)
                    VALUES (
                        {q(route_stop_id)},
                        {q(direction_id)},
                        {q(stop_id)},
                        {sequence}
                    )
                    ON CONFLICT ("directionId", sequence)
                    DO UPDATE SET
                        "stopId" = EXCLUDED."stopId";
                """)

            total_stops += len(stop_rows)

            print(
                f"  {direction_type}: "
                f"{len(stop_rows)} dayanacaq, "
                f"{len(coordinates)} xəritə nöqtəsi"
            )

    statements.append("COMMIT;")
    db.close()

    print(f"\nCəmi əlaqə: {total_stops}")
    print("PostgreSQL idxalı başlanır...")

    sql = "\n".join(statements).encode("utf-8")

    result = subprocess.run(
        [
            "docker", "exec", "-i", CONTAINER,
            "psql",
            "-X",
            "-q",
            "-v", "ON_ERROR_STOP=1",
            "-U", DB_USER,
            "-d", DB_NAME,
        ],
        input=sql,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    if result.returncode != 0:
        print(result.stderr.decode("utf-8", errors="replace"))
        raise SystemExit(
            "İdxal uğursuz oldu. Transaction geri qaytarıldı."
        )

    print("Real marşrutlar və dayanacaqlar uğurla idxal edildi!")


if __name__ == "__main__":
    main()
