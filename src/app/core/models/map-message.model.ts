import { MapBounds } from './map-bounds.model';

export type MapMessageAction =
  | 'setRadarVisibility'
  | 'setSatVisibility'
  | 'setAcumVisibility'
  | 'setLayerVisibility'
  | 'updateRadarImage'
  | 'updateSatelliteImage'
  | 'updateAcumImage'
  | 'updateGeojsonLayer'
  | 'updateTimestamp'
  | 'setMapCenter'
  | 'stopRadarAnim';

export interface MapMessage {
  action: MapMessageAction;
  payload: unknown;
}

export interface SetLayerVisibilityPayload {
  layerId: string;
  visible: boolean;
}

export interface UpdateRadarImagePayload {
  filePath: string;
  bounds: MapBounds;
}

export interface UpdateGeojsonLayerPayload {
  layerId: string;
  data: unknown;
}

export interface UpdateTimestampPayload {
  text: string;
}

export interface SetMapCenterPayload {
  lat: number;
  lng: number;
  zoom: number;
}
