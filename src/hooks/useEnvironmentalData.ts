/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * useEnvironmentalData Hook
 * Central hook for querying real-world environmental observations across providers.
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchOpenMeteoWeather, WeatherDataResult } from '../services/api/openMeteoWeather';
import { fetchOpenMeteoAirQuality, AirQualityModelResult } from '../services/api/openMeteoAirQuality';
import { fetchOpenAQStations, fetchOpenAQStationLatest } from '../services/api/openAq';
import { fetchNasaPowerDaily, NasaPowerResult } from '../services/api/nasaPower';
import {
  EnvironmentalObservation,
  MonitoringStation,
  TimeSeriesDataset,
  GeographicLocation,
} from '../types/environmental';

export interface LocationPreset {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

export const GLOBAL_LOCATION_PRESETS: LocationPreset[] = [
  { name: 'London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278 },
  { name: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503 },
  { name: 'Tashkent', country: 'Uzbekistan', latitude: 41.2995, longitude: 69.2401 },
  { name: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006 },
  { name: 'São Paulo', country: 'Brazil', latitude: -23.5505, longitude: -46.6333 },
  { name: 'Nairobi', country: 'Kenya', latitude: -1.2921, longitude: 36.8219 },
  { name: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522 },
  { name: 'Sydney', country: 'Australia', latitude: -33.8688, longitude: 151.2093 },
  { name: 'Reykjavik', country: 'Iceland', latitude: 64.1466, longitude: -21.9426 },
  { name: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.209 },
];

export function useEnvironmentalData(initialLocation = GLOBAL_LOCATION_PRESETS[0]) {
  const [selectedLocation, setSelectedLocation] = useState<LocationPreset>(initialLocation);
  const [weatherData, setWeatherData] = useState<WeatherDataResult | null>(null);
  const [airQualityData, setAirQualityData] = useState<AirQualityModelResult | null>(null);
  const [nasaPowerData, setNasaPowerData] = useState<NasaPowerResult | null>(null);
  const [nasaTimeStandard, setNasaTimeStandard] = useState<'UTC' | 'LST'>('UTC');
  const [stations, setStations] = useState<MonitoringStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<MonitoringStation | null>(null);
  const [stationObservations, setStationObservations] = useState<EnvironmentalObservation[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  const loadDataForLocation = useCallback(async (loc: LocationPreset, timeStd: 'UTC' | 'LST' = nasaTimeStandard) => {
    setIsLoading(true);
    const newErrors: Record<string, string> = {};

    // 1. Fetch Open-Meteo Weather
    try {
      const wResult = await fetchOpenMeteoWeather(loc.latitude, loc.longitude);
      setWeatherData(wResult);
    } catch (err: any) {
      newErrors['open-meteo'] = err.message;
      setWeatherData(null);
    }

    // 2. Fetch Open-Meteo Air Quality (Model-derived)
    try {
      const aqResult = await fetchOpenMeteoAirQuality(loc.latitude, loc.longitude);
      setAirQualityData(aqResult);
    } catch (err: any) {
      newErrors['open-meteo-aq'] = err.message;
      setAirQualityData(null);
    }

    // 3. Fetch NASA POWER Satellite Climatology (explicit time-standard: UTC vs LST)
    try {
      const nasaResult = await fetchNasaPowerDaily(loc.latitude, loc.longitude, undefined, undefined, timeStd);
      setNasaPowerData(nasaResult);
    } catch (err: any) {
      newErrors['nasa-power'] = err.message;
      setNasaPowerData(null);
    }

    // 4. Fetch OpenAQ Ground Stations
    try {
      const stns = await fetchOpenAQStations(loc.latitude, loc.longitude, 60_000, 15);
      setStations(stns);
      if (stns.length > 0) {
        setSelectedStation(stns[0]);
        // Fetch station latest
        const latestObs = await fetchOpenAQStationLatest(stns[0].id);
        setStationObservations(latestObs);
      } else {
        setSelectedStation(null);
        setStationObservations([]);
      }
    } catch (err: any) {
      newErrors['openaq'] = err.message;
      setStations([]);
      setSelectedStation(null);
      setStationObservations([]);
    }

    setErrors(newErrors);
    setIsLoading(false);
    setLastRefreshedAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    loadDataForLocation(selectedLocation);
  }, [selectedLocation, loadDataForLocation]);

  const selectStation = async (station: MonitoringStation) => {
    setSelectedStation(station);
    try {
      const obs = await fetchOpenAQStationLatest(station.id);
      setStationObservations(obs);
    } catch (err: any) {
      console.warn('Failed to load station observations:', err);
    }
  };

  const changeLocation = (loc: LocationPreset) => {
    setSelectedLocation(loc);
  };

  const setCustomCoordinates = (lat: number, lon: number, name = 'Custom Coordinate') => {
    const customLoc: LocationPreset = {
      name,
      country: 'Global Grid',
      latitude: lat,
      longitude: lon,
    };
    setSelectedLocation(customLoc);
  };

  const updateNasaTimeStandard = (standard: 'UTC' | 'LST') => {
    setNasaTimeStandard(standard);
    loadDataForLocation(selectedLocation, standard);
  };

  const refreshAll = () => {
    loadDataForLocation(selectedLocation, nasaTimeStandard);
  };

  return {
    selectedLocation,
    weatherData,
    airQualityData,
    nasaPowerData,
    nasaTimeStandard,
    updateNasaTimeStandard,
    stations,
    selectedStation,
    stationObservations,
    isLoading,
    errors,
    lastRefreshedAt,
    changeLocation,
    setCustomCoordinates,
    selectStation,
    refreshAll,
  };
}
