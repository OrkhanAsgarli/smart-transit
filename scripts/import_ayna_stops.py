
import math
import sqlite3
import subprocess
from pathlib import Path

SOURCE = Path("data/ayna.sqlite")
CONTAINER = "smarttransit-postgres"
DB_USER = "smarttransit"
DB_NAME = "smarttransit_db"
BATCH_SIZE = 300


def quote(value):
    return "'" + str(value).replace("'", "''") + "'"


def main():
    if not SOURCE.is_file():
        raise SystemExit("Xəta: data/ayna.sqlite tapılmadı.")

    db = sqlite3.connect(SOURCE)
    db.row_factory = sqlite3.Row

    rows = db.execute("""
        SELECT
            d.id,
            d.code,
            d.name,
            d.latitude,
            d.longitude
        FROM stop_details AS d
        INNER JOIN stops AS s ON s.id = d.id
        ORDER BY d.id
    """).fetchall()

    values = []
    skipped = 0

    for row in rows:
        try:
            latitude = float(row["latitude"])
            longitude = float(row["longitude"])
        except (ValueError, TypeError):
            skipped += 1
            continue

        if not (
            math.isfinite(latitude)
            and math.isfinite(longitude)
            and 38.0 <= latitude <= 42.5
            and 44.0 <= longitude <= 51.5
        ):
            skipped += 1
            continue

        stop_id = f"ayna-stop-{row['id']}"
        external_id = f"AYNA_STOP_DETAIL:{row['id']}"
        name = str(row["name"] or "").strip()

        if not name:
            name = f"Dayanacaq {row['code'] or row['id']}"

        values.append(
            "("
            + ", ".join([
                quote(stop_id),
                quote(external_id),
                quote(name),
                repr(latitude),
                repr(longitude),
                "NOW()",
                "NOW()",
            ])
            + ")"
        )

    db.close()

    print(f"SQLite-dən oxundu: {len(rows)}")
    print(f"İdxala uyğundur: {len(values)}")
    print(f"Buraxılan qeydlər: {skipped}")

    if not values:
        raise SystemExit("İdxal üçün etibarlı dayanacaq yoxdur.")

    statements = ["BEGIN;"]

    for i in range(0, len(values), BATCH_SIZE):
        batch = values[i:i + BATCH_SIZE]

        statements.append("""
            INSERT INTO "Stop"
            (id, "externalId", name, latitude, longitude,
             "createdAt", "updatedAt")
            VALUES
        """ + ",\n".join(batch) + """
            ON CONFLICT ("externalId")
            DO UPDATE SET
                name = EXCLUDED.name,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                "updatedAt" = NOW();
        """)

    statements.append("COMMIT;")

    sql = "\n".join(statements).encode("utf-8")

    print("PostgreSQL-ə idxal başlanır...")

    result = subprocess.run(
        [
            "docker", "exec", "-i", CONTAINER,
            "psql",
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
        raise SystemExit("İdxal uğursuz oldu.")

    print("İdxal uğurla tamamlandı!")
    print(result.stdout.decode("utf-8", errors="replace"))


if __name__ == "__main__":
    main()
