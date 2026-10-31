# Smart Transit & Crowdsourcing Engine

**Bakı avtobusları üçün marşrut izləmə, sərnişin sıxlığı bildirişləri və operator qərar dəstəyi — hackathon MVP.**

Smart Transit sərnişinlərə marşrut və dayanacaq seçərək avtobusların xəritədə mövqeyini və təxmini gəlmə vaxtını (ETA) görməyə imkan verir. Sərnişinlər avtobus doluluğunu bildirə, operatorlar isə həmin bildirişləri marşrut üzrə təhlil edə və uzunmüddətli sıxlıq üçün ehtiyat avtobus tövsiyəsi ala bilərlər.

> **Məlumatın mənşəyi:** dayanacaq və marşrut koordinatları nəqliyyat məlumatlarından hazırlanmış üçüncü tərəf SQLite snapshot-ından idxal olunur; real vaxtda rəsmi AYNA məlumat axını deyil. Mövcud GPS mövqeləri **SIMULATION** mənbəlidir. ETA ilkin, düz xətt məsafəsinə əsaslanan təxmindir. Sərnişin bildirişləri avtomatik olaraq təsdiqlənmiş fakt sayılmır.

## Texnologiyalar

- **Frontend və API:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Xəritə:** React Leaflet, Leaflet, OpenStreetMap
- **Məlumat bazası:** PostgreSQL 17, Prisma ORM 7, `@prisma/adapter-pg`
- **İnfrastruktur:** Docker, Docker Compose, pnpm
- **İlkin məlumat:** `data/ayna.sqlite` və `scripts/` idxal skriptləri

## Tələblər

- Git
- Docker Desktop / Docker Engine və Docker Compose v2
- İlk build üçün internet bağlantısı (Docker image-lər, npm paketləri və xəritə plitələri)
- Lokal port **3001** (və PostgreSQL üçün **5433**) boş olmalıdır
- Windows, macOS və ya Linux. Windows-da Docker Desktop Linux containers rejimində olmalıdır.

## Quraşdırma və işə salma

### 1. Repozitoriyanı endir

```bash
git clone https://github.com/OrkhanAsgarli/smart-transit.git
cd smart-transit
```

### 2. Lokal mühit dəyişənlərini hazırla

Layihənin kökündə `.env` faylı yarat. Aşağıdakı nümunə **yalnız lokal demo üçündür**. Öz güclü parol və token dəyərlərindən istifadə et; `.env` faylını GitHub-a əlavə etmə.

```dotenv
POSTGRES_PASSWORD=replace-with-a-strong-local-password
DOCKER_DATABASE_URL=postgresql://smarttransit:replace-with-a-strong-local-password@postgres:5432/smarttransit_db
ADMIN_SETUP_TOKEN=replace-with-a-long-random-local-token
```

`POSTGRES_PASSWORD` və `DOCKER_DATABASE_URL` daxilindəki parol **eyni** olmalıdır. Parolda URL üçün xüsusi simvollar varsa, `DOCKER_DATABASE_URL` daxilində URL-encoding tətbiq et.

**Əhəmiyyətli:** Hazırkı Compose faylı `DOCKER_DATABASE_URL` və `ADMIN_SETUP_TOKEN` dəyişənlərini tələb edir. Sadəcə `docker compose up` yazmadan əvvəl `.env`-in olması vacibdir. Bunlar demo konfiqurasiyasıdır, ictimai serverə birbaşa yerləşdirmək üçün təhlükəsiz deyil.

### 3. Bütün servisləri bir əmrlə başlat

```bash
docker compose up -d --build
```

Bu komanda mövcud Compose konfiqurasiyasına əsasən PostgreSQL, Next.js və **GPS simulyatorunu** işə salır. GPS worker `POST /api/simulation/tick` endpoint-inə təxminən **5 saniyədə bir** müraciət edir. Əlavə PowerShell dövrü açmaq lazım deyil.

```bash
docker compose ps
docker compose logs --tail=20 gps-simulator
```

GPS loglarında `GPS tick completed` gözlənilir. Bu mesaj simulyasiya çağırışının uğurlu HTTP cavabı aldığını bildirir; avtobus mövqeyinin yeniləndiyini ayrıca `/api/live/buses` ilə yoxla.

### 4. Tətbiqi aç

| Bölmə | Ünvan |
|---|---|
| Sərnişin paneli | http://localhost:3001/passenger |
| Operator analitikası | http://localhost:3001/operator |
| Marşrut idarəetməsi | http://localhost:3001/routes |
| Operator idarəetməsi | http://localhost:3001/operators |
| Sərnişin marşrut API-si | http://localhost:3001/api/passenger/routes |
| GPS məlumat API-si | http://localhost:3001/api/live/buses |
| Operator analitika API-si | http://localhost:3001/api/operator/analytics |
| Anomaliya API-si | http://localhost:3001/api/operator/anomalies |

### Təzə kompüterdə ilkin məlumatlar haqqında qeyd

**Hazırkı GitHub Compose versiyasında ayrıca avtomatik `bootstrap` servisi yoxdur.** Web konteyneri Prisma migration-ları tətbiq edir, amma boş PostgreSQL bazasına real dayanacaqları, marşrutları, demo istifadəçiləri və avtobusları avtomatik doldurması hələ təmin edilmir. Buna görə **təmiz kompüterdə bir əmrlə bütün demo məlumatlarının görünməsi hələ təsdiqlənməyib**.

Hazırda işlək baza olan kompüterdə Docker volume saxlanıldığından əvvəlki məlumatlar qalır. Yeni kompüter üçün idxal skriptləri (`scripts/import_ayna_stops.py`, `scripts/import_ayna_routes.py`) və demo seed prosesi Docker bootstrap mərhələsinə inteqrasiya edilməlidir; həmin mərhələ tamamlanmadan sistemi sıfırdan tam hazır hesab etməyin.

## Əsas funksiyalar

### 1.1 Sərnişin GPS izləməsi və ETA

- Marşrut, istiqamət və dayanacaq seçimi
- Seçilmiş istiqamət üzrə dayanacaqlar və avtobus markerləri
- GPS məlumatlarının təzə/köhnə kimi göstərilməsi
- Seçilmiş dayanacağa təxmini ETA

### 1.2 Crowd Reporting

- **Aşağı** (`BUS_EMPTY`), **Orta** (`BUS_MODERATE`), **Yüksək** (`BUS_CROWDED`) doluluq bildirişləri
- PostgreSQL-də `CrowdReport` saxlanması
- Demo rejimində bir istifadəçi üçün eyni avtobusa 60 saniyəlik sadə cooldown
- Yeni bildirişdən sonra anomaliya yoxlaması

### 2.1 Operator Analytics

- Marşrutlar üzrə son **30 dəqiqənin** LOW/MEDIUM/HIGH bildiriş statistikası
- Avtobus koordinatlarının siyahı və xəritədə göstərilməsi
- GPS mənbə və təzəlik statusu

### 2.2 Anomaly Detection

Detektor bir avtobus üçün son 12 dəqiqəlik pəncərədə minimum 10 dəqiqə davam edən müşahidələri qiymətləndirir. Demo qaydası ən az 4 bildiriş, 2 fərqli istifadəçi, minimum 75% `HIGH`, maksimum 5 dəqiqəlik müşahidə aralığı və son 2 dəqiqədə müşahidə tələb edir. Şərtlər ödənərsə `DispatchAction`-da `PROPOSED` tövsiyəsi yaradıla bilər; fiziki avtobus avtomatik göndərilmir.

Hakimlər üçün `/api/operator/anomalies?demo=true` sintetik ssenari təqdim edir: bu, **real insident deyil** və verilənlər bazasına yazılmır. Tam inteqrasiya olunmuş real dispatch yazılışının ayrıca test edilməsi tələb olunur.

## Sürətli yoxlama

```bash
docker compose ps
docker compose logs --tail=20 web
docker compose logs --tail=20 gps-simulator
```

Brauzerdə yoxla:

- http://localhost:3001/api/passenger/routes
- http://localhost:3001/api/live/buses
- http://localhost:3001/api/operator/analytics
- http://localhost:3001/api/operator/anomalies?demo=true

Windows PowerShell nümunəsi:

```powershell
Invoke-RestMethod 'http://localhost:3001/api/operator/anomalies?demo=true' | ConvertTo-Json -Depth 8
```

Gözlənilən məntiq: `sustainedHigh.detected = true`, `insufficient.detected = false`, `persisted = false`.

Kod yoxlaması (lokal pnpm quraşdırılıbsa):

```bash
pnpm exec tsc --noEmit
pnpm build
```

## Dayandırma və yenidən başlatma

```bash
# Yalnız servisləri dayandır; PostgreSQL məlumatları saxlanır
docker compose down

# Yenidən başlat
docker compose up -d --build

# Loglara bax
docker compose logs -f gps-simulator
```

**`docker compose down -v` işlətmə:** bu, PostgreSQL volume-nu silə və məlumat itkisinə səbəb ola bilər.

## Layihənin strukturu

```text
smart-transit/
├── src/
│   ├── app/
│   │   ├── passenger/                # Sərnişin interfeysi
│   │   ├── operator/                 # Operator interfeysi
│   │   ├── routes/                   # Marşrut idarəetməsi
│   │   └── api/                      # Next.js API route-ları
│   ├── components/transit/           # Xəritə, crowd form, xəbərdarlıqlar
│   └── lib/                          # Prisma və anomaliya alqoritmi
├── prisma/                           # Schema və migration-lar
├── scripts/                          # İdxal/seed köməkçiləri
├── data/                             # SQLite mənbə snapshot-ı (mövcud olduqda)
├── Dockerfile
├── docker-compose.yml
├── README.md
└── ARCHITECTURE.md
```

## Təhlükəsizlik və məhdudiyyətlər

- Demo istifadəçi mexanizmi real autentifikasiya əvəzi deyil.
- `ENABLE_LOCAL_ADMIN_API` və `ENABLE_DEMO_CROWD_REPORTS` ictimai deployment üçün açıq saxlanmamalıdır.
- `.env`, parollar və admin tokenləri commit etmə.
- GPS simulyasiyası real GPS telemetriyası deyil.
- ETA yol şəbəkəsini və canlı trafiki nəzərə almır.
- Crowd report-lar müstəqil təsdiqlənmiş sərnişin sayı deyil.
- Üçüncü tərəf datasetinin yeniliyi və paylaşım şərtləri ayrıca yoxlanmalıdır.

## Arxitektura

Komponentlər, məlumat axınları, verilənlər bazası modelləri və anomaliya qaydası haqqında məlumat: [ARCHITECTURE.md](./ARCHITECTURE.md).

## GitHub

Repository: https://github.com/OrkhanAsgarli/smart-transit

Bu layihə hackathon MVP-dir və istehsalat səviyyəsində real nəqliyyat izləmə sistemi kimi təqdim edilmir.
