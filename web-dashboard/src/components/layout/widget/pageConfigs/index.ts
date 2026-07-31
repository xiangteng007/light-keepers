/**
 * Page-Specific Widget Configurations
 *
 * Split by domain so each file stays readable; merged here into the single
 * `PAGE_WIDGET_CONFIGS` lookup that PageWrapper / useWidgetLayout consume.
 */
import { WidgetConfig } from '../types';
import { COMMAND_PAGE_CONFIGS } from './command';
import { GEO_PAGE_CONFIGS } from './geo';
import { RESOURCE_PAGE_CONFIGS } from './resources';
import { WORKFORCE_PAGE_CONFIGS } from './workforce';
import { GOVERNANCE_PAGE_CONFIGS } from './governance';
import { HUB_PAGE_CONFIGS } from './hubs';
import { COMMUNITY_PAGE_CONFIGS } from './community';

export const PAGE_WIDGET_CONFIGS: Record<string, WidgetConfig[]> = {
    ...COMMAND_PAGE_CONFIGS,
    ...GEO_PAGE_CONFIGS,
    ...RESOURCE_PAGE_CONFIGS,
    ...WORKFORCE_PAGE_CONFIGS,
    ...GOVERNANCE_PAGE_CONFIGS,
    ...HUB_PAGE_CONFIGS,
    ...COMMUNITY_PAGE_CONFIGS,
};

export {
    COMMAND_PAGE_CONFIGS,
    GEO_PAGE_CONFIGS,
    RESOURCE_PAGE_CONFIGS,
    WORKFORCE_PAGE_CONFIGS,
    GOVERNANCE_PAGE_CONFIGS,
    HUB_PAGE_CONFIGS,
    COMMUNITY_PAGE_CONFIGS,
};
