import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShelterIcon, AedIcon, GraduationIcon, BuildingIcon, SirenIcon, ShieldIcon, LocationIcon, ClockIcon, SearchIcon, type LkIcon } from '../../design-system/icons';
import { overlaysApi } from '../../services/overlaysApi';
import type { LocationDto } from '../../services/overlaysApi';
import './LocationAutocomplete.css';

interface LocationAutocompleteProps {
    /** Bounding box to filter results [minLng, minLat, maxLng, maxLat] */
    bbox?: [number, number, number, number];
    /** Placeholder text */
    placeholder?: string;
    /** Called when a location is selected */
    onSelect: (location: LocationDto) => void;
    /** Called when the input value changes */
    onChange?: (value: string) => void;
    /** Whether the input is disabled */
    disabled?: boolean;
    /** Initial value */
    value?: string;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
    bbox,
    placeholder = '搜尋地點...',
    onSelect,
    onChange,
    disabled = false,
    value: externalValue,
}) => {
    const [inputValue, setInputValue] = useState(externalValue || '');
    const [results, setResults] = useState<LocationDto[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [error, setError] = useState<string | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync with external value
    useEffect(() => {
        if (externalValue !== undefined) {
            setInputValue(externalValue);
        }
    }, [externalValue]);

    // Search locations
    const searchLocations = useCallback(async (query: string) => {
        if (query.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const locations = await overlaysApi.searchLocations({
                query,
                bbox,
                limit: 10,
            });
            setResults(locations);
            setIsOpen(locations.length > 0);
            setSelectedIndex(-1);
        } catch (err: any) {
            setError(err.message || '搜尋失敗');
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [bbox]);

    // Debounced search
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        onChange?.(value);

        // Clear previous debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Debounce search
        debounceRef.current = setTimeout(() => {
            searchLocations(value);
        }, 300);
    }, [onChange, searchLocations]);

    // Handle selection
    const handleSelect = useCallback((location: LocationDto) => {
        setInputValue(location.name);
        setIsOpen(false);
        setResults([]);
        onSelect(location);
    }, [onSelect]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' && results.length > 0) {
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && results[selectedIndex]) {
                    handleSelect(results[selectedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setSelectedIndex(-1);
                break;
        }
    }, [isOpen, results, selectedIndex, handleSelect]);

    // Scroll selected item into view
    useEffect(() => {
        if (selectedIndex >= 0 && listRef.current) {
            const item = listRef.current.children[selectedIndex] as HTMLElement;
            item?.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (inputRef.current && !inputRef.current.parentElement?.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    // Get icon for category（R5/T5c：B3c 教範圖例，不再使用 emoji）
    const CATEGORY_ICONS: Record<string, LkIcon> = {
        shelter: ShelterIcon,
        hospital: AedIcon,
        school: GraduationIcon,
        government: BuildingIcon,
        fire_station: SirenIcon,
        police: ShieldIcon,
        temple: BuildingIcon,
        landmark: LocationIcon,
        default: LocationIcon,
    };
    const getCategoryIcon = (category: string): LkIcon => CATEGORY_ICONS[category] || CATEGORY_ICONS.default;

    return (
        <div className="loc-autocomplete">
            <div className="loc-input-wrapper">
                <input
                    ref={inputRef}
                    type="text"
                    className="loc-input"
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => results.length > 0 && setIsOpen(true)}
                    disabled={disabled}
                    aria-autocomplete="list"
                    aria-expanded={isOpen}
                    role="combobox"
                />
                <span className="loc-input-icon" aria-hidden="true">
                    {isLoading ? <ClockIcon size={16} /> : <SearchIcon size={16} />}
                </span>
            </div>

            {error && (
                <div className="loc-error">{error}</div>
            )}

            {isOpen && results.length > 0 && (
                <ul ref={listRef} className="loc-results" role="listbox">
                    {results.map((location, index) => (
                        <li
                            key={location.id}
                            className={`loc-result-item ${index === selectedIndex ? 'selected' : ''}`}
                            onClick={() => handleSelect(location)}
                            onMouseEnter={() => setSelectedIndex(index)}
                            role="option"
                            aria-selected={index === selectedIndex}
                        >
                            <span className="loc-result-icon" aria-hidden="true">
                                {(() => { const CatIcon = getCategoryIcon(location.category); return <CatIcon size={16} />; })()}
                            </span>
                            <div className="loc-result-content">
                                <div className="loc-result-name">{location.name}</div>
                                {location.address && (
                                    <div className="loc-result-address">{location.address}</div>
                                )}
                                {location.aliases && location.aliases.length > 0 && (
                                    <div className="loc-result-aliases">
                                        別名: {location.aliases.map(a => a.alias).join(', ')}
                                    </div>
                                )}
                            </div>
                            <span className="loc-result-category">{location.category}</span>
                        </li>
                    ))}
                </ul>
            )}

            {isOpen && results.length === 0 && inputValue.length >= 2 && !isLoading && (
                <div className="loc-no-results">
                    找不到相符的地點
                </div>
            )}
        </div>
    );
};

export default LocationAutocomplete;
