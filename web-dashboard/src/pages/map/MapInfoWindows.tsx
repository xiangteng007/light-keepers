/**
 * MapInfoWindows — 地圖 InfoWindow 層（R2b 自 MapPage 抽出）
 *
 * 依 MapSelection 顯示對應的 InfoWindow（地圖上的快速一瞥）；
 * 完整行動卡在側欄／bottom sheet（MapSidebar）。
 *
 * C1.2 保留：防空避難處所 InfoWindow 完整欄位
 * （容納人數／地下層數／管理單位）與獨立琥珀色標示。
 */
import { InfoWindowF } from '@react-google-maps/api';
import {
    BuildingIcon,
    ClockIcon,
    LayersIcon,
    TeamsIcon,
    UserIcon,
} from '../../design-system/icons';
import {
    AedSymbol,
    AirRaidShelterSymbol,
    ShelterSymbol,
    WarehouseSymbol,
} from '../../design-system/icons/map-symbols';
import { getSeverityColor, getSeverityLabel } from '../map-utils';
import { openDirections, type MapSelection } from './types';

/** 行內 icon 對齊字級（InfoWindow 內文 12–13px；同 MapSidebar 的行內樣式） */
const inlineIcon = { verticalAlign: '-2px', marginRight: 5 } as const;

export interface MapInfoWindowsProps {
    selection: MapSelection | null;
    onClose: () => void;
}

export default function MapInfoWindows({ selection, onClose }: MapInfoWindowsProps) {
    if (!selection) return null;

    switch (selection.kind) {
        case 'event': {
            const event = selection.event;
            if (!event.latitude || !event.longitude) return null;
            return (
                <InfoWindowF
                    position={{ lat: Number(event.latitude), lng: Number(event.longitude) }}
                    onCloseClick={onClose}
                    options={{ pixelOffset: new google.maps.Size(0, -30) }}
                >
                    <div className="gmap-infowindow">
                        <div className="gmap-infowindow__header">
                            <span
                                className="gmap-infowindow__severity"
                                style={{ background: getSeverityColor(event.severity || 1) }}
                            >
                                {getSeverityLabel(event.severity || 1)}
                            </span>
                            <span className="gmap-infowindow__category">
                                {event.category || '其他'}
                            </span>
                        </div>
                        <h4 className="gmap-infowindow__title">{event.title}</h4>
                        <p className="gmap-infowindow__desc">{event.description || '無描述'}</p>
                        {event.address && (
                            <p className="gmap-infowindow__address">{event.address}</p>
                        )}
                        <div className="gmap-infowindow__actions">
                            <button onClick={() => openDirections(event.latitude!, event.longitude!)}>
                                導航
                            </button>
                        </div>
                    </div>
                </InfoWindowF>
            );
        }

        case 'ncdr': {
            const alert = selection.alert;
            if (!alert.latitude || !alert.longitude) return null;
            const bg = alert.severity === 'critical'
                ? '#B85C5C'
                : alert.severity === 'warning' ? '#C9A256' : '#5C7B8E';
            return (
                <InfoWindowF
                    position={{ lat: Number(alert.latitude), lng: Number(alert.longitude) }}
                    onCloseClick={onClose}
                    options={{ pixelOffset: new google.maps.Size(0, -30) }}
                >
                    <div className="gmap-infowindow">
                        <div className="gmap-infowindow__header">
                            <span className="gmap-infowindow__severity" style={{ background: bg }}>
                                {alert.alertTypeName}
                            </span>
                            <span className="gmap-infowindow__category">NCDR 示警</span>
                        </div>
                        <h4 className="gmap-infowindow__title">{alert.title}</h4>
                        <p className="gmap-infowindow__desc">{alert.description || '無描述'}</p>
                        <div className="gmap-infowindow__actions">
                            {alert.sourceLink && (
                                <button onClick={() => window.open(alert.sourceLink, '_blank')}>
                                    查看詳情
                                </button>
                            )}
                        </div>
                    </div>
                </InfoWindowF>
            );
        }

        case 'shelter': {
            const shelter = selection.shelter;
            return (
                <InfoWindowF
                    position={{ lat: shelter.latitude, lng: shelter.longitude }}
                    onCloseClick={onClose}
                    options={{ pixelOffset: new google.maps.Size(0, -25) }}
                >
                    <div className="gmap-infowindow">
                        <div className="gmap-infowindow__header">
                            <span className="gmap-infowindow__severity" style={{ background: '#4CAF50' }}>
                                <ShelterSymbol size={14} style={inlineIcon} />避難所
                            </span>
                            <span className="gmap-infowindow__category">{shelter.type}</span>
                        </div>
                        <h4 className="gmap-infowindow__title">{shelter.name}</h4>
                        <p className="gmap-infowindow__desc">
                            {shelter.address || `${shelter.city}${shelter.district}`}
                        </p>
                        <p className="gmap-infowindow__desc">
                            <TeamsIcon size={15} style={inlineIcon} />可收容人數：{shelter.capacity || '未知'}
                        </p>
                        <div className="gmap-infowindow__actions">
                            <button onClick={() => openDirections(shelter.latitude, shelter.longitude)}>
                                導航
                            </button>
                        </div>
                    </div>
                </InfoWindowF>
            );
        }

        case 'aed': {
            const aed = selection.aed;
            return (
                <InfoWindowF
                    position={{ lat: aed.latitude, lng: aed.longitude }}
                    onCloseClick={onClose}
                    options={{ pixelOffset: new google.maps.Size(0, -25) }}
                >
                    <div className="gmap-infowindow">
                        <div className="gmap-infowindow__header">
                            <span className="gmap-infowindow__severity" style={{ background: '#E53935' }}>
                                <AedSymbol size={14} style={inlineIcon} />AED
                            </span>
                        </div>
                        <h4 className="gmap-infowindow__title">{aed.name}</h4>
                        <p className="gmap-infowindow__desc">{aed.address}</p>
                        {aed.placeName && (
                            <p className="gmap-infowindow__desc">
                                <BuildingIcon size={15} style={inlineIcon} />{aed.placeName} {aed.floor && `(${aed.floor})`}
                            </p>
                        )}
                        {aed.openHours && (
                            <p className="gmap-infowindow__desc">
                                <ClockIcon size={15} style={inlineIcon} />開放時間：{aed.openHours}
                            </p>
                        )}
                        <div className="gmap-infowindow__actions">
                            <button onClick={() => openDirections(aed.latitude, aed.longitude)}>
                                導航
                            </button>
                        </div>
                    </div>
                </InfoWindowF>
            );
        }

        case 'warehouse': {
            const warehouse = selection.warehouse;
            return (
                <InfoWindowF
                    position={{ lat: Number(warehouse.latitude), lng: Number(warehouse.longitude) }}
                    onCloseClick={onClose}
                    options={{ pixelOffset: new google.maps.Size(0, -25) }}
                >
                    <div className="gmap-infowindow">
                        <div className="gmap-infowindow__header">
                            <span className="gmap-infowindow__severity" style={{ background: '#2196F3' }}>
                                <WarehouseSymbol size={14} style={inlineIcon} />倉庫
                            </span>
                            {warehouse.isPrimary && (
                                <span className="gmap-infowindow__category">主倉庫</span>
                            )}
                        </div>
                        <h4 className="gmap-infowindow__title">{warehouse.name}</h4>
                        <p className="gmap-infowindow__desc">{warehouse.address || '無地址'}</p>
                        {warehouse.contactPerson && (
                            <p className="gmap-infowindow__desc">
                                <UserIcon size={15} style={inlineIcon} />{warehouse.contactPerson} {warehouse.contactPhone && `(${warehouse.contactPhone})`}
                            </p>
                        )}
                        <div className="gmap-infowindow__actions">
                            <button onClick={() => openDirections(Number(warehouse.latitude), Number(warehouse.longitude))}>
                                導航
                            </button>
                        </div>
                    </div>
                </InfoWindowF>
            );
        }

        case 'airRaidShelter': {
            // C1.2：防空避難處所（獨立設施類型，欄位不得刪減）
            const shelter = selection.shelter;
            return (
                <InfoWindowF
                    position={{ lat: shelter.latitude, lng: shelter.longitude }}
                    onCloseClick={onClose}
                    options={{ pixelOffset: new google.maps.Size(0, -25) }}
                >
                    <div className="gmap-infowindow">
                        <div className="gmap-infowindow__header">
                            <span className="gmap-infowindow__severity" style={{ background: '#FF8F00' }}>
                                <AirRaidShelterSymbol size={14} style={inlineIcon} />防空避難處所
                            </span>
                        </div>
                        <h4 className="gmap-infowindow__title">{shelter.name}</h4>
                        <p className="gmap-infowindow__desc">
                            {shelter.address || `${shelter.city}${shelter.district}`}
                        </p>
                        <p className="gmap-infowindow__desc">
                            <TeamsIcon size={15} style={inlineIcon} />容納人數：{shelter.capacity || '未知'}
                        </p>
                        {shelter.basementLevels != null && (
                            <p className="gmap-infowindow__desc">
                                <LayersIcon size={15} style={inlineIcon} />地下 {shelter.basementLevels} 層
                            </p>
                        )}
                        {shelter.managingOrg && (
                            <p className="gmap-infowindow__desc">
                                <BuildingIcon size={15} style={inlineIcon} />管理單位：{shelter.managingOrg}
                            </p>
                        )}
                        <div className="gmap-infowindow__actions">
                            <button onClick={() => openDirections(shelter.latitude, shelter.longitude)}>
                                導航
                            </button>
                        </div>
                    </div>
                </InfoWindowF>
            );
        }

        default:
            return null;
    }
}
