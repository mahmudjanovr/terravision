/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PageId = 
  | 'overview'
  | 'air-quality'
  | 'climate'
  | 'map'
  | 'analytics'
  | 'research'
  | 'sources'
  | 'settings';

export interface NavItem {
  id: PageId;
  label: string;
  shortLabel?: string;
  iconName: string;
  description: string;
  badge?: string;
}
