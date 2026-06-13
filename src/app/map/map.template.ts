export function getMapHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; font-family: sans-serif; }
  #map { width: 100%; height: 100%; }
  .legend {
    position: absolute; bottom: 20px; left: 10px; z-index: 1000;
    background: rgba(255,255,255,0.9); padding: 6px 10px; border-radius: 4px;
    font-size: 11px; box-shadow: 0 1px 4px rgba(0,0,0,0.2); display: none;
  }
  .legend.visible { display: block; }
  .legend i { width: 14px; height: 14px; display: inline-block; margin-right: 4px; vertical-align: middle; border-radius: 2px; }
  .legend span { vertical-align: middle; }
  .acum-legend {
    position: absolute; bottom: 220px; left: 10px; z-index: 1000;
    background: rgba(255,255,255,0.9); padding: 6px 10px; border-radius: 4px;
    font-size: 11px; box-shadow: 0 1px 4px rgba(0,0,0,0.2); display: none;
  }
  .acum-legend.visible { display: block; }
  .acum-legend i { width: 14px; height: 14px; display: inline-block; margin-right: 4px; vertical-align: middle; border-radius: 2px; }
  .acum-legend span { vertical-align: middle; }
  .timestamp {
    position: absolute; top: 10px; right: 10px; z-index: 1000;
    background: rgba(0,0,0,0.7); color: #fff; padding: 4px 10px;
    border-radius: 4px; font-size: 12px;
  }
</style>
</head>
<body>
<div id="map"></div>
<div id="timestamp" class="timestamp">Carregando...</div>
<div id="legend" class="legend visible">
  <b>Radar (dBZ)</b><br>
  <i style="background:#00ff00"></i><span>0-10</span><br>
  <i style="background:#00cc00"></i><span>10-20</span><br>
  <i style="background:#009900"></i><span>20-30</span><br>
  <i style="background:#ffcc00"></i><span>30-40</span><br>
  <i style="background:#ff9900"></i><span>40-45</span><br>
  <i style="background:#ff6600"></i><span>45-50</span><br>
  <i style="background:#ff0000"></i><span>50-55</span><br>
  <i style="background:#cc0000"></i><span>55+</span>
</div>
<div id="acum-legend" class="acum-legend">
  <b>Chuva Acum. (mm)</b><br>
  <i style="background:#99ff99"></i><span>0-1</span><br>
  <i style="background:#00cc00"></i><span>1-5</span><br>
  <i style="background:#ffcc00"></i><span>5-10</span><br>
  <i style="background:#ff9900"></i><span>10-20</span><br>
  <i style="background:#ff3300"></i><span>20-30</span><br>
  <i style="background:#cc0000"></i><span>30-50</span><br>
  <i style="background:#990099"></i><span>50+</span>
</div>

<script>
  const ULTIMO_MAP = '/home/webadm/alerta/dados/ppi/ultimo.map';

  const map = L.map('map', {
    center: [-22.3, -49.0],
    zoom: 7,
    minZoom: 4,
    maxZoom: 12,
    zoomControl: true,
  });

  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  function pad(n, d) { return String(n).padStart(d, '0'); }

  function subtractMinutes(ts, mins) {
    const y = parseInt(ts.substring(0,4));
    const m = parseInt(ts.substring(4,6)) - 1;
    const d = parseInt(ts.substring(6,8));
    const h = parseInt(ts.substring(8,10));
    const mi = parseInt(ts.substring(10,12));
    const s = parseInt(ts.substring(12,14));
    const dt = new Date(y, m, d, h, mi, s);
    dt.setMinutes(dt.getMinutes() - mins);
    return pad(dt.getFullYear(),4) + pad(dt.getMonth()+1,2) + pad(dt.getDate(),2) +
           pad(dt.getHours(),2) + pad(dt.getMinutes(),2) + pad(dt.getSeconds(),2);
  }

  function generateFrames(latestRaw, count, interval) {
    var frames = [];
    var current = latestRaw.replace('_', '');
    for (var i = 0; i < count; i++) {
      frames.push(current);
      current = subtractMinutes(current, interval);
    }
    frames.reverse();
    return frames;
  }

  var radarLayer = null;
  var radarFramesCache = [];
  var storedBounds = null;

  function updateStoredBounds() {
    storedBounds = { south: map.getBounds().getSouth(), west: map.getBounds().getWest(), north: map.getBounds().getNorth(), east: map.getBounds().getEast() };
  }

  window.getStoredBounds = function() {
    return storedBounds || { south: -24.3, west: -51.0, north: -20.3, east: -47.0 };
  };

  window.setRadarVisibility = function(visible) {
    console.log('[Leaflet] setRadarVisibility:', visible);
    if (visible) {
      if (radarLayer) map.addLayer(radarLayer);
      document.getElementById('legend').classList.add('visible');
    } else {
      if (radarLayer) map.removeLayer(radarLayer);
      document.getElementById('legend').classList.remove('visible');
    }
  };

  window.updateRadarImage = function(dataUri, south, west, north, east) {
    if (radarLayer) map.removeLayer(radarLayer);
    var bounds = L.latLngBounds(L.latLng(south, west), L.latLng(north, east));
    radarLayer = L.imageOverlay(dataUri, bounds, { opacity: 0.6 }).addTo(map);
  };

  function updateRadarBounds() {
    if (radarLayer && map.hasLayer(radarLayer)) {
      radarLayer.setBounds(map.getBounds());
    }
  }

  map.on('moveend', function() { updateStoredBounds(); updateRadarBounds(); updateSatelliteBounds(); });
  map.on('zoomend', function() { updateStoredBounds(); updateRadarBounds(); updateSatelliteBounds(); });

  var satLayer = null;

  function updateSatelliteBounds() {
    if (satLayer && map.hasLayer(satLayer)) {
      satLayer.setBounds(map.getBounds());
    }
  }

  window.setSatVisibility = function(visible) {
    console.log('[Leaflet] setSatVisibility:', visible);
    if (visible) {
      if (!satLayer) {
        var url = 'https://www.ipmetradar.com.br/alerta/dados/satelite/sat_goes.gif?' + Date.now();
        satLayer = L.imageOverlay(url, map.getBounds(), { opacity: 0.7 }).addTo(map);
      } else {
        map.addLayer(satLayer);
        satLayer.setBounds(map.getBounds());
      }
    } else {
      if (satLayer) map.removeLayer(satLayer);
    }
  };
  window.updateSatelliteImage = function(dataUri) {
    if (satLayer) map.removeLayer(satLayer);
    satLayer = L.imageOverlay(dataUri, map.getBounds(), { opacity: 0.7 }).addTo(map);
  };

  var acumLayer = null;

  window.updateAcumImage = function(dataUri, south, west, north, east) {
    if (acumLayer) map.removeLayer(acumLayer);
    var bounds = L.latLngBounds(L.latLng(south, west), L.latLng(north, east));
    acumLayer = L.imageOverlay(dataUri, bounds, { opacity: 0.6 }).addTo(map);
    document.getElementById('acum-legend').classList.add('visible');
  };

  function updateAcumBounds() {
    if (acumLayer && map.hasLayer(acumLayer)) {
      acumLayer.setBounds(map.getBounds());
    }
  }

  map.on('moveend', function() { updateStoredBounds(); updateRadarBounds(); updateSatelliteBounds(); updateAcumBounds(); });
  map.on('zoomend', function() { updateStoredBounds(); updateRadarBounds(); updateSatelliteBounds(); updateAcumBounds(); });

  const geoLayers = {};
  const layerGroups = {};

  function createLayerGroup(name, color) {
    const group = L.layerGroup().addTo(map);
    layerGroups[name] = group;
    geoLayers[name] = { group, visible: true, color };
    return group;
  }

  createLayerGroup('lightning', '#ff8800');
  createLayerGroup('metar', '#ff4444');
  createLayerGroup('inmet', '#44aaff');
  createLayerGroup('titan', '#ff0000');
  createLayerGroup('titanv', '#ff6600');
  createLayerGroup('alerta', '#ffff00');

  var animFrames = [];
  var animIndex = 0;
  var animTimer = null;
  var animPlaying = false;

  window.startRadarAnim = function(latestRaw, count, interval, speedMs) {
    stopRadarAnim();
    animFrames = generateFrames(latestRaw, count, interval);
    animIndex = 0;
    animPlaying = true;
    animStep(speedMs || 500);
  };

  function animStep(speedMs) {
    if (!animPlaying) return;
    var ts = animFrames[animIndex];
    document.getElementById('timestamp').textContent =
      ts.substring(6,8) + '/' + ts.substring(4,6) + '/' + ts.substring(0,4) +
      ' - ' + ts.substring(8,10) + ':' + ts.substring(10,12) + ':' + ts.substring(12,14) +
      ' [' + (animIndex + 1) + '/' + animFrames.length + ']';
    animIndex = (animIndex + 1) % animFrames.length;
    animTimer = setTimeout(function() { animStep(speedMs); }, speedMs);
  }

  window.stopRadarAnim = function() {
    animPlaying = false;
    if (animTimer) { clearTimeout(animTimer); animTimer = null; }
  };

  window.isRadarAnimating = function() { return animPlaying; };
  window.getCurrentAnimFrame = function() { return animPlaying && animFrames.length > 0 ? animFrames[(animIndex - 1 + animFrames.length) % animFrames.length] : null; };

  window.updateGeojsonLayer = function(layerId, geojsonData) {
    const layer = geoLayers[layerId];
    if (!layer) return;

    layer.group.clearLayers();

    if (!geojsonData || !geojsonData.features) return;

    const isStation = (layerId === 'metar' || layerId === 'inmet');
    const isLightning = (layerId === 'lightning');
    const isStorm = (layerId === 'titan' || layerId === 'titanv');
    const isAlert = (layerId === 'alerta');

    geojsonData.features.forEach(function(feature) {
      var props = feature.properties || {};
      var coords = feature.geometry && feature.geometry.coordinates;
      if (!coords) return;

      var marker;
      var lat = coords[1];
      var lng = coords[0];

      if (isStation) {
        var temp = props.temperatura || '-';
        var umid = props.umidade_relativa || '-';
        var iconColor = temp !== '-' && temp < 20 ? '#44aaff' : temp !== '-' && temp < 30 ? '#ffaa00' : '#ff4444';
        var iconSize = isLightning ? 8 : 12;
        var popupContent = '<b>' + (props.id || 'Estação') + '</b><br>' +
          'Temp: ' + temp + '&deg;C<br>' +
          'Umidade: ' + umid + '%<br>' +
          'Vento: ' + (props.veloc_vento || '-') + ' km/h';
        if (props.precip_liq_24h) popupContent += '<br>Chuva 24h: ' + props.precip_liq_24h + ' mm';
        marker = L.circleMarker([lat, lng], {
          radius: iconSize,
          fillColor: iconColor,
          color: '#333',
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.7
        }).bindPopup(popupContent);
      } else if (isLightning) {
        marker = L.circleMarker([lat, lng], {
          radius: 4,
          fillColor: '#ff8800',
          color: '#ff0000',
          weight: 1,
          fillOpacity: 0.8
        }).bindPopup('<b>Raio</b><br>' + (props.data_hora || '') + '<br>Lat: ' + lat.toFixed(2) + '<br>Lon: ' + lng.toFixed(2));
      } else if (isStorm) {
        var intensidade = props.intensidade || 'desconhecida';
        var fillC = intensidade === 'forte' ? '#ff0000' : intensidade === 'moderada' ? '#ffaa00' : '#ffff00';
        if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
          marker = L.polygon(feature.geometry.coordinates.map(function(r) {
            return r.map(function(p) { return [p[1], p[0]]; });
          }), {
            color: fillC,
            weight: 2,
            fillOpacity: 0.3
          }).bindPopup(
            '<b>Tempestade</b><br>' +
            'Intensidade: ' + intensidade + '<br>' +
            'Topo: ' + (props.topo_celula || '-') + ' km<br>' +
            'Velocidade: ' + (props.velocidade || '-') + ' km/h'
          );
        } else {
          marker = L.circleMarker([lat, lng], {
            radius: 10,
            fillColor: fillC,
            color: '#333',
            weight: 1,
            fillOpacity: 0.5
          }).bindPopup('<b>Tempestade</b><br>Intensidade: ' + intensidade);
        }
      } else if (isAlert) {
        if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
          marker = L.polygon(feature.geometry.coordinates.map(function(r) {
            return r.map(function(p) { return [p[1], p[0]]; });
          }), {
            color: '#ffff00',
            weight: 3,
            fillOpacity: 0.15
          }).bindPopup('<b>Alerta de Tempo Severo</b>');
        }
      }

      if (marker) layer.group.addLayer(marker);
    });

    if (!layer.visible) map.removeLayer(layer.group);
  };

  window.setRadarVisibility = function(visible) {
    console.log('[Leaflet] setRadarVisibility:', visible);
    if (visible) {
      if (radarLayer) map.addLayer(radarLayer);
      document.getElementById('legend').classList.add('visible');
    } else {
      if (radarLayer) map.removeLayer(radarLayer);
      document.getElementById('legend').classList.remove('visible');
    }
  };

  window.setAcumVisibility = function(visible) {
    console.log('[Leaflet] setAcumVisibility:', visible);
    if (visible) {
      if (acumLayer) map.addLayer(acumLayer);
      document.getElementById('acum-legend').classList.add('visible');
    } else {
      if (acumLayer) map.removeLayer(acumLayer);
      document.getElementById('acum-legend').classList.remove('visible');
    }
  };

  window.setLayerVisibility = function(layerId, visible) {
    console.log('[Leaflet] setLayerVisibility:', layerId, visible);
    const layer = geoLayers[layerId];
    if (!layer) return;
    layer.visible = visible;
    if (visible) { map.addLayer(layer.group); } else { map.removeLayer(layer.group); }
  };

  window.updateTimestamp = function(text) {
    document.getElementById('timestamp').textContent = text || '---';
  };

  window.setMapCenter = function(lat, lng, zoom) {
    map.setView([lat, lng], zoom || 7);
  };

  window.getBrowserLocation = function() {
    if (!navigator.geolocation) { console.warn('[Leaflet] geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        var lat = pos.coords.latitude.toFixed(4);
        var lng = pos.coords.longitude.toFixed(4);
        window.setMapCenter(parseFloat(lat), parseFloat(lng), 10);
      },
      function(err) {
        console.warn('[Leaflet] geolocation error:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  map.on('load', function() {
    window.mapReady = true;
  });
</script>
</body>
</html>`;
}
