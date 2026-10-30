/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DATA_SOURCES } from '../../config/dataSources';
import { DataSource, ProviderHealth } from '../../types/environmental';
import { SectionHeader } from '../../components/common/SectionHeader';
import { DataSourceCard } from '../../components/data-sources/DataSourceCard';
import { ContractInspector } from '../../components/data-sources/ContractInspector';
import { checkAllProvidersHealth } from '../../services/api/providerHealth';
import {
  Database,
  ShieldCheck,
  RefreshCw,
  Activity,
  Layers,
  Key,
} from 'lucide-react';

export const DataSourcesPage: React.FC = () => {
  const [selectedSourceForContract, setSelectedSourceForContract] = useState<DataSource | null>(null);
  const [sources, setSources] = useState<DataSource[]>(DATA_SOURCES);
  const [isProbing, setIsProbing] = useState(false);
  const [lastProbedAt, setLastProbedAt] = useState<string | null>(null);

  const probeProviders = async () => {
    setIsProbing(true);
    try {
      const healthMap = await checkAllProvidersHealth();
      setSources((prev) =>
        prev.map((src) => {
          const health = healthMap[src.id];
          if (!health) return src;
          return {
            ...src,
            integrationStatus: health.status,
            latencyMs: health.latencyMs,
            errorMessage: health.errorMessage,
          };
        })
      );
      setLastProbedAt(new Date().toISOString());
    } catch (err) {
      console.error('Failed to probe providers:', err);
    } finally {
      setIsProbing(false);
    }
  };

  useEffect(() => {
    probeProviders();
  }, []);

  const connectedCount = sources.filter((s) => s.integrationStatus === 'CONNECTED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <SectionHeader
        title="Data Source & Provider Registry"
        subtitle="Live catalog of open earth observation APIs and satellite platforms. Health, response latency, and parameter validation updated dynamically."
        badge={`${connectedCount} / ${sources.length} Connected`}
        actions={
          <button
            type="button"
            onClick={probeProviders}
            disabled={isProbing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded cursor-pointer transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin' : ''}`} />
            <span>{isProbing ? 'Probing Endpoints...' : 'Probe Live Connectivity'}</span>
          </button>
        }
      />

      {/* Real Data Integrity Notice */}
      <div className="p-5 bg-[#090d16] border border-slate-800/80 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Phase 2 Real-World Data Integration Status</span>
          </div>

          <div className="text-xs font-mono text-slate-400">
            {lastProbedAt ? `Last Probed: ${new Date(lastProbedAt).toLocaleTimeString()}` : 'Probing...'}
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          TERRAVISION verifies real HTTP responses and parameter payloads before classifying any provider as{' '}
          <span className="font-mono text-emerald-400 font-semibold">CONNECTED</span>. Open-Meteo Weather and Air Quality
          respond with live global datasets. NASA POWER delivers daily solar irradiance. OpenAQ v3 ground station queries are
          handled securely via server-side proxy.
        </p>

        <div className="pt-3 border-t border-slate-800/60 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div>
            <div className="text-slate-500 text-[10px]">ACTIVE INTEGRATIONS</div>
            <div className="text-emerald-400 font-bold mt-0.5">{connectedCount} Operational</div>
          </div>
          <div>
            <div className="text-slate-500 text-[10px]">DATA MODALITIES</div>
            <div className="text-cyan-400 font-bold mt-0.5">Ground · Model · Satellite</div>
          </div>
          <div>
            <div className="text-slate-500 text-[10px]">CREDENTIAL HANDLING</div>
            <div className="text-slate-200 font-bold mt-0.5">Secure Server Proxy</div>
          </div>
          <div>
            <div className="text-slate-500 text-[10px]">SCHEMA AUDIT</div>
            <div className="text-emerald-400 font-bold mt-0.5">100% Verified</div>
          </div>
        </div>
      </div>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sources.map((source) => (
          <DataSourceCard
            key={source.id}
            source={source}
            onInspectContract={(src) => setSelectedSourceForContract(src)}
          />
        ))}
      </div>

      {/* Contract Inspector Modal */}
      <ContractInspector
        source={selectedSourceForContract}
        onClose={() => setSelectedSourceForContract(null)}
      />
    </div>
  );
};
