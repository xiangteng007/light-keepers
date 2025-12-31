import { useState, useCallback, useRef } from 'react';
import { DirectionsRenderer, Autocomplete } from '@react-google-maps/api';
import { Button, Card } from '../../design-system';
import './DirectionsPanel.css';

export interface DirectionsPanelProps {
    userLocation?: { lat: number; lng: number } | null;
    onClose?: () => void;
}

export function DirectionsPanel({ userLocation, onClose }: DirectionsPanelProps) {
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [travelMode, setTravelMode] = useState<google.maps.TravelMode>(google.maps.TravelMode.DRIVING);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);

    const originAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const destinationAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    // 設定 Autocomplete 的範圍（台灣）
    const autocompleteOptions: google.maps.places.AutocompleteOptions = {
        componentRestrictions: { country: 'tw' },
        fields: ['geometry', 'name', 'formatted_address'],
    };

    // 使用目前位置作為起點
    const useCurrentLocation = useCallback(() => {
        if (userLocation) {
            setOrigin('目前位置');
        } else {
            setError('無法取得目前位置');
        }
    }, [userLocation]);

    // 計算路線
    const calculateRoute = useCallback(async () => {
        if (!origin || !destination) {
            setError('請輸入起點和終點');
            return;
        }

        setIsLoading(true);
        setError('');
        setDirections(null);
        setRouteInfo(null);

        const directionsService = new google.maps.DirectionsService();

        // 處理「目前位置」
        const originLocation = origin === '目前位置' && userLocation
            ? new google.maps.LatLng(userLocation.lat, userLocation.lng)
            : origin;

        try {
            const result = await directionsService.route({
                origin: originLocation,
                destination: destination,
                travelMode: travelMode,
                language: 'zh-TW',
            });

            setDirections(result);

            // 取得路線資訊
            const route = result.routes[0];
            if (route && route.legs[0]) {
                setRouteInfo({
                    distance: route.legs[0].distance?.text || '',
                    duration: route.legs[0].duration?.text || '',
                });
            }
        } catch (err: any) {
            console.error('Directions error:', err);
            if (err.status === 'ZERO_RESULTS') {
                setError('找不到路線');
            } else if (err.status === 'NOT_FOUND') {
                setError('找不到指定地點');
            } else {
                setError('無法計算路線');
            }
        } finally {
            setIsLoading(false);
        }
    }, [origin, destination, travelMode, userLocation]);

    // 清除路線
    const clearRoute = useCallback(() => {
        setDirections(null);
        setRouteInfo(null);
        setOrigin('');
        setDestination('');
        setError('');
    }, []);

    // 處理 Autocomplete 選擇
    const onOriginPlaceChanged = useCallback(() => {
        if (originAutocompleteRef.current) {
            const place = originAutocompleteRef.current.getPlace();
            if (place.formatted_address) {
                setOrigin(place.formatted_address);
            } else if (place.name) {
                setOrigin(place.name);
            }
        }
    }, []);

    const onDestinationPlaceChanged = useCallback(() => {
        if (destinationAutocompleteRef.current) {
            const place = destinationAutocompleteRef.current.getPlace();
            if (place.formatted_address) {
                setDestination(place.formatted_address);
            } else if (place.name) {
                setDestination(place.name);
            }
        }
    }, []);

    // 交通模式選項
    const travelModes = [
        { mode: google.maps.TravelMode.DRIVING, label: '🚗 開車', icon: '🚗' },
        { mode: google.maps.TravelMode.WALKING, label: '🚶 步行', icon: '🚶' },
        { mode: google.maps.TravelMode.BICYCLING, label: '🚲 騎車', icon: '🚲' },
        { mode: google.maps.TravelMode.TRANSIT, label: '🚌 大眾運輸', icon: '🚌' },
    ];

    return (
        <>
            <Card className="directions-panel">
                <div className="directions-panel-header">
                    <h3>🧭 路線規劃</h3>
                    {onClose && (
                        <button className="directions-panel-close" onClick={onClose}>
                            ✕
                        </button>
                    )}
                </div>

                <div className="directions-panel-content">
                    {/* 起點 */}
                    <div className="directions-field">
                        <label>起點</label>
                        <div className="directions-input-group">
                            <Autocomplete
                                onLoad={(autocomplete) => { originAutocompleteRef.current = autocomplete; }}
                                onPlaceChanged={onOriginPlaceChanged}
                                options={autocompleteOptions}
                            >
                                <input
                                    type="text"
                                    value={origin}
                                    onChange={(e) => setOrigin(e.target.value)}
                                    placeholder="輸入起點地址..."
                                />
                            </Autocomplete>
                            {userLocation && (
                                <button
                                    className="directions-location-btn"
                                    onClick={useCurrentLocation}
                                    title="使用目前位置"
                                >
                                    📍
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 終點 */}
                    <div className="directions-field">
                        <label>終點</label>
                        <Autocomplete
                            onLoad={(autocomplete) => { destinationAutocompleteRef.current = autocomplete; }}
                            onPlaceChanged={onDestinationPlaceChanged}
                            options={autocompleteOptions}
                        >
                            <input
                                type="text"
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                                placeholder="輸入目的地地址..."
                            />
                        </Autocomplete>
                    </div>

                    {/* 交通模式 */}
                    <div className="directions-travel-modes">
                        {travelModes.map(({ mode, label, icon }) => (
                            <button
                                key={mode}
                                className={`directions-mode-btn ${travelMode === mode ? 'active' : ''}`}
                                onClick={() => setTravelMode(mode)}
                                title={label}
                            >
                                {icon}
                            </button>
                        ))}
                    </div>

                    {/* 錯誤訊息 */}
                    {error && (
                        <div className="directions-error">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* 路線資訊 */}
                    {routeInfo && (
                        <div className="directions-route-info">
                            <div className="directions-route-stat">
                                <span className="directions-route-label">距離</span>
                                <span className="directions-route-value">{routeInfo.distance}</span>
                            </div>
                            <div className="directions-route-stat">
                                <span className="directions-route-label">預計時間</span>
                                <span className="directions-route-value">{routeInfo.duration}</span>
                            </div>
                        </div>
                    )}

                    {/* 按鈕 */}
                    <div className="directions-actions">
                        {directions ? (
                            <Button variant="secondary" onClick={clearRoute}>
                                清除路線
                            </Button>
                        ) : (
                            <Button
                                variant="primary"
                                onClick={calculateRoute}
                                disabled={isLoading || !origin || !destination}
                            >
                                {isLoading ? '計算中...' : '🔍 規劃路線'}
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            {/* 路線渲染 */}
            {directions && (
                <DirectionsRenderer
                    directions={directions}
                    options={{
                        suppressMarkers: false,
                        polylineOptions: {
                            strokeColor: '#2196F3',
                            strokeWeight: 5,
                            strokeOpacity: 0.8,
                        },
                    }}
                />
            )}
        </>
    );
}

export default DirectionsPanel;
