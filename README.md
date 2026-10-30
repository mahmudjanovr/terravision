# TERRAVISION — Environmental Intelligence Platform

> **Understand the planet. Visualize the change.**

TERRAVISION is a global environmental intelligence platform designed to monitor air quality, atmospheric chemistry, and climate indicators using authoritative international earth observation sources.

---

## 🌍 Platform Overview
TERRAVISION combines ground-level sensor networks with satellite sounding grids and global reanalysis models.

- **Global Air Quality**: Ground concentrations of PM2.5, PM10, NO₂, SO₂, O₃, and CO.
- **Meteorology & Climate**: Surface temperature, atmospheric pressure, relative humidity, precipitation, and solar irradiance.
- **Geospatial Intelligence**: High-performance MapLibre GL vector basemaps with real-time coordinate inspection.
- **Historical & Comparative Analytics**: Apache ECharts powered time-series and correlation models.
- **Transparent Data Sources**: Mapped to Open-Meteo, OpenAQ, NASA POWER, Copernicus Climate Data Store, and Copernicus Data Space.
- **Strict Data Integrity Guarantee**: Zero fabricated readings or synthetic AQI values.

---

## 🛠️ Technology Stack
- **Frontend Core**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4 with dark scientific theme (`#07090e`, `#0b0f19`)
- **Cartography**: MapLibre GL JS
- **Visualization**: Apache ECharts
- **Icons**: Lucide React
- **Testing**: Node's built-in test runner (`node:test`, `node:assert/strict`) run via `npx --yes tsx --test`

---

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Run Unit Tests
```bash
npx --yes tsx --test src/utils/coordinates.test.ts src/utils/parameters.test.ts
```

### Production Build
```bash
npm run build
```

---

## 📁 Project Architecture
```
src/
├── types/                # Strict environmental and geospatial TypeScript contracts
├── config/               # Data source registry & basemap configurations
├── utils/                # Coordinate projection, DMS formatting, and parameter metadata
├── components/
│   ├── common/           # MetricCard, StatusBadge, EmptyState, SectionHeader, Search
│   ├── layout/           # AppShell, TopHeader, Sidebar, MobileNav
│   ├── maps/             # MapLibreViewer with coordinate HUD & layer controls
│   ├── charts/           # EChartContainer, ParameterTimeSeriesChart, ComparisonChart
│   └── data-sources/     # DataSourceCard, ContractInspector modal
└── pages/
    ├── Overview/         # Global monitoring dashboard
    ├── AirQuality/       # Criteria air pollutants console
    ├── Climate/          # Meteorological and climate variables
    ├── EnvironmentalMap/ # Geospatial intelligence workstation
    ├── Analytics/        # Historical multi-parameter analysis
    ├── Research/         # Precision bounding-box and date query explorer
    ├── DataSources/      # 5 official provider readiness cards
    └── Settings/         # Cartography, unit preferences, and API keys
```

---

## 📜 Development Roadmap
1. **Phase 1 (Completed)**: Foundation, visual design system, navigation, all 7 page modules, MapLibre GL, Apache ECharts, typed contracts, unit tests.
2. **Phase 2**: Real data integration with Open-Meteo REST API, OpenAQ v3, and NASA POWER.
3. **Phase 3**: FastAPI backend, PostgreSQL + PostGIS database, and Redis cache.
4. **Phase 4**: Real-time geospatial satellite layers and vector soundings.
5. **Phase 5**: Predictive anomaly detection and climate risk indicators.
