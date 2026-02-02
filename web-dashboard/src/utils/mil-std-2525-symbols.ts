/**
 * MIL-STD-2525 Tactical Symbols Library
 * 
 * Military standard symbology for tactical maps.
 * Implements common symbols for disaster response operations.
 */

// Symbol identity codes
export enum SymbolIdentity {
    PENDING = 'P',
    UNKNOWN = 'U',
    ASSUMED_FRIEND = 'A',
    FRIEND = 'F',
    NEUTRAL = 'N',
    SUSPECT = 'S',
    HOSTILE = 'H',
    JOKER = 'J',
    FAKER = 'K',
}

// Symbol dimension codes
export enum SymbolDimension {
    AIR = 'A',
    GROUND = 'G',
    SEA_SURFACE = 'S',
    SEA_SUBSURFACE = 'U',
    SPACE = 'P',
    SOF = 'F',
}

// Symbol status codes
export enum SymbolStatus {
    PRESENT = 'P',
    PLANNED = 'A',
    FULLY_CAPABLE = 'C',
    DAMAGED = 'D',
    DESTROYED = 'X',
    FULL_TO_CAPACITY = 'F',
}

// Disaster response specific symbols
export const DISASTER_SYMBOLS = {
    // Command & Control
    INCIDENT_COMMAND_POST: {
        sidc: 'GFGPGPPC--',
        name: '事件指揮所',
        description: 'Incident Command Post',
        category: 'command',
    },
    STAGING_AREA: {
        sidc: 'GFGPGPSA--',
        name: '集結區',
        description: 'Staging Area',
        category: 'command',
    },
    HELIBASE: {
        sidc: 'GFGPGPHB--',
        name: '直升機基地',
        description: 'Helibase',
        category: 'command',
    },

    // Units
    RESCUE_TEAM: {
        sidc: 'SFGPUCR---',
        name: '救援隊',
        description: 'Search and Rescue Team',
        category: 'unit',
    },
    MEDICAL_TEAM: {
        sidc: 'SFGPUCM---',
        name: '醫療隊',
        description: 'Medical Team',
        category: 'unit',
    },
    FIREFIGHTING: {
        sidc: 'SFGPUCF---',
        name: '消防隊',
        description: 'Firefighting Unit',
        category: 'unit',
    },
    LOGISTICS: {
        sidc: 'SFGPUCL---',
        name: '後勤隊',
        description: 'Logistics Unit',
        category: 'unit',
    },

    // Hazards
    FIRE_ORIGIN: {
        sidc: 'OHVPF-----',
        name: '火災起點',
        description: 'Fire Origin',
        category: 'hazard',
    },
    FLOOD_AREA: {
        sidc: 'OHVPW-----',
        name: '淹水區',
        description: 'Flood Area',
        category: 'hazard',
    },
    HAZMAT: {
        sidc: 'OHVPH-----',
        name: '危險物質',
        description: 'Hazardous Material',
        category: 'hazard',
    },
    COLLAPSED_STRUCTURE: {
        sidc: 'OHVPS-----',
        name: '倒塌建物',
        description: 'Collapsed Structure',
        category: 'hazard',
    },

    // Points of Interest
    CASUALTY_COLLECTION: {
        sidc: 'GFGPGPCC--',
        name: '傷患集合點',
        description: 'Casualty Collection Point',
        category: 'poi',
    },
    EVACUATION_POINT: {
        sidc: 'GFGPGPEV--',
        name: '疏散點',
        description: 'Evacuation Point',
        category: 'poi',
    },
    SUPPLY_POINT: {
        sidc: 'GFGPGPSP--',
        name: '物資發放點',
        description: 'Supply Distribution Point',
        category: 'poi',
    },
    SHELTER: {
        sidc: 'GFGPGPSH--',
        name: '避難所',
        description: 'Emergency Shelter',
        category: 'poi',
    },

    // Triage Colors
    TRIAGE_RED: {
        sidc: 'EMERTR----',
        name: '紅色傷患',
        description: 'Immediate - Critical',
        category: 'triage',
        color: '#ef4444',
    },
    TRIAGE_YELLOW: {
        sidc: 'EMERTY----',
        name: '黃色傷患',
        description: 'Delayed - Serious',
        category: 'triage',
        color: '#eab308',
    },
    TRIAGE_GREEN: {
        sidc: 'EMERTG----',
        name: '綠色傷患',
        description: 'Minor - Walking Wounded',
        category: 'triage',
        color: '#22c55e',
    },
    TRIAGE_BLACK: {
        sidc: 'EMERTB----',
        name: '黑色傷患',
        description: 'Deceased/Expectant',
        category: 'triage',
        color: '#18181b',
    },
} as const;

export type DisasterSymbolKey = keyof typeof DISASTER_SYMBOLS;

/**
 * Symbol renderer configuration
 */
export interface SymbolRenderOptions {
    size: number;
    showLabel: boolean;
    showReinforced?: boolean;
    showEchelon?: boolean;
    opacity?: number;
}

/**
 * Generate SVG for a tactical symbol
 */
export function renderSymbol(
    symbolKey: DisasterSymbolKey,
    options: SymbolRenderOptions = { size: 32, showLabel: true }
): string {
    const symbol = DISASTER_SYMBOLS[symbolKey];
    const { size, showLabel } = options;
    
    // Base shapes by category
    const shapes: Record<string, string> = {
        command: `<rect x="4" y="4" width="${size - 8}" height="${size - 8}" fill="#4f46e5" rx="2"/>`,
        unit: `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 4}" fill="#3b82f6"/>`,
        hazard: `<polygon points="${size / 2},4 ${size - 4},${size - 4} 4,${size - 4}" fill="#ef4444"/>`,
        poi: `<rect x="4" y="4" width="${size - 8}" height="${size - 8}" fill="#22c55e" transform="rotate(45 ${size / 2} ${size / 2})"/>`,
        triage: `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 4}" fill="${(symbol as any).color || '#666'}"/>`,
    };

    const shape = shapes[symbol.category] || shapes.unit;

    return `
        <svg width="${size}" height="${size + (showLabel ? 16 : 0)}" xmlns="http://www.w3.org/2000/svg">
            ${shape}
            <text x="${size / 2}" y="${size / 2 + 4}" text-anchor="middle" fill="white" font-size="10" font-weight="bold">
                ${symbol.name.charAt(0)}
            </text>
            ${showLabel ? `<text x="${size / 2}" y="${size + 12}" text-anchor="middle" fill="#333" font-size="10">${symbol.name}</text>` : ''}
        </svg>
    `;
}

/**
 * Get all symbols by category
 */
export function getSymbolsByCategory(category: string): DisasterSymbolKey[] {
    return (Object.keys(DISASTER_SYMBOLS) as DisasterSymbolKey[])
        .filter(key => DISASTER_SYMBOLS[key].category === category);
}

/**
 * Get all available categories
 */
export function getSymbolCategories(): string[] {
    return [...new Set(Object.values(DISASTER_SYMBOLS).map(s => s.category))];
}

/**
 * Search symbols by name or description
 */
export function searchSymbols(query: string): DisasterSymbolKey[] {
    const lowerQuery = query.toLowerCase();
    return (Object.keys(DISASTER_SYMBOLS) as DisasterSymbolKey[])
        .filter(key => {
            const symbol = DISASTER_SYMBOLS[key];
            return symbol.name.toLowerCase().includes(lowerQuery) ||
                   symbol.description.toLowerCase().includes(lowerQuery);
        });
}
