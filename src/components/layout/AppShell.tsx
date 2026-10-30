/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PageId } from '../../types/navigation';
import { TopHeader } from './TopHeader';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { GlobalSearchModal } from '../common/GlobalSearchModal';

import { OverviewPage } from '../../pages/Overview/OverviewPage';
import { AirQualityPage } from '../../pages/AirQuality/AirQualityPage';
import { ClimatePage } from '../../pages/Climate/ClimatePage';
import { EnvironmentalMapPage } from '../../pages/EnvironmentalMap/EnvironmentalMapPage';
import { AnalyticsPage } from '../../pages/Analytics/AnalyticsPage';
import { ResearchPage } from '../../pages/Research/ResearchPage';
import { DataSourcesPage } from '../../pages/DataSources/DataSourcesPage';
import { SettingsPage } from '../../pages/Settings/SettingsPage';

export const AppShell: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageId>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [timeRange, setTimeRange] = useState('latest');

  const handleNavigate = (page: PageId) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderActivePage = () => {
    switch (currentPage) {
      case 'overview':
        return <OverviewPage onNavigate={handleNavigate} />;
      case 'air-quality':
        return <AirQualityPage onNavigateToSources={() => handleNavigate('sources')} />;
      case 'climate':
        return <ClimatePage onNavigateToSources={() => handleNavigate('sources')} />;
      case 'map':
        return <EnvironmentalMapPage />;
      case 'analytics':
        return <AnalyticsPage onNavigateToSources={() => handleNavigate('sources')} />;
      case 'research':
        return <ResearchPage onNavigateToSources={() => handleNavigate('sources')} />;
      case 'sources':
        return <DataSourcesPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <OverviewPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#e2e8f0] flex flex-col font-sans">
      {/* Top Header */}
      <TopHeader
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenSearch={() => setSearchModalOpen(true)}
        onToggleMobileNav={() => setMobileNavOpen(true)}
        timeRange={timeRange}
        onChangeTimeRange={setTimeRange}
      />

      {/* Main Container with Sidebar + Page Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Sidebar */}
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Mobile Navigation Drawer */}
        <MobileNav
          isOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          currentPage={currentPage}
          onNavigate={handleNavigate}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#07090e]">
          {renderActivePage()}
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onNavigate={handleNavigate}
      />
    </div>
  );
};
