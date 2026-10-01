import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';

import { AgriColors } from '@/constants/agri-theme';

export type RobotMapHandle = { zoomIn: () => void; zoomOut: () => void; recenter: () => void };

type RobotLeafletMapProps = {
  latitude: number;
  longitude: number;
  status: string;
  /** false renders a static preview (no pan/zoom) for use inside scroll views. */
  interactive?: boolean;
  /** Radius in metres of the highlighted field around the robot. */
  fieldRadius?: number;
  style?: StyleProp<ViewStyle>;
  ref?: Ref<RobotMapHandle>;
};

// Leaflet in a self-contained page. Tiles are tinted mint with CSS filters so
// the real OpenStreetMap map matches the field-map look of the app.
function buildHtml(interactive: boolean, fieldRadius: number) {
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map { height: 100%; margin: 0; background: #e4efdf; }
      .leaflet-tile-pane { filter: grayscale(1) sepia(0.25) hue-rotate(55deg) saturate(1.7) brightness(1.06) contrast(0.88); }
      .leaflet-control-attribution { background: rgba(255,255,255,0.7) !important; font: 9px sans-serif; border-radius: 8px 0 0 0; }
      .bot { width: 46px; height: 46px; border-radius: 23px; background: #123B29; border: 4px solid #fff; box-shadow: 0 6px 16px rgba(12,42,29,.35); display: flex; align-items: center; justify-content: center; }
      .bot svg { width: 22px; height: 22px; }
      .bot.offline { background: #8a968e; }
      .pulse { position: absolute; left: -10px; top: -10px; width: 66px; height: 66px; border-radius: 33px; background: rgba(138,203,110,.35); animation: p 2s infinite; }
      @keyframes p { 0% { transform: scale(.6); opacity: 1 } 100% { transform: scale(1.3); opacity: 0 } }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      (function () {
        var interactive = ${interactive ? 'true' : 'false'};
        var map, marker, field, last;
        var icon = '<svg viewBox="0 0 24 24" fill="#D7EECF"><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/></svg>';
        function send(m) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
        function markerHtml(status) {
          var online = String(status).toLowerCase() === 'online';
          return '<div style="position:relative">' + (online ? '<div class="pulse"></div>' : '') + '<div class="bot' + (online ? '' : ' offline') + '">' + icon + '</div></div>';
        }
        function update(m) {
          var ll = [m.latitude, m.longitude];
          var first = !last;
          last = m;
          if (!marker) {
            field = L.circle(ll, { radius: ${fieldRadius}, color: '#123B29', weight: 2, dashArray: '6 6', fillColor: '#A9DB9C', fillOpacity: 0.45 }).addTo(map);
            marker = L.marker(ll, { icon: L.divIcon({ className: '', html: markerHtml(m.status), iconSize: [46, 46], iconAnchor: [23, 23] }) }).addTo(map);
          } else {
            marker.setLatLng(ll);
            field.setLatLng(ll);
            marker.setIcon(L.divIcon({ className: '', html: markerHtml(m.status), iconSize: [46, 46], iconAnchor: [23, 23] }));
          }
          if (first || !interactive) map.setView(ll, map.getZoom(), { animate: !first });
        }
        function onMessage(event) {
          try {
            var m = JSON.parse(event.data);
            if (m.type === 'robotLocation' && typeof m.latitude === 'number' && typeof m.longitude === 'number') update(m);
            if (m.type === 'zoomIn') map.zoomIn();
            if (m.type === 'zoomOut') map.zoomOut();
            if (m.type === 'recenter' && last) map.setView([last.latitude, last.longitude], 17, { animate: true });
          } catch (e) { send({ type: 'mapError' }); }
        }
        window.addEventListener('message', onMessage);
        document.addEventListener('message', onMessage);
        window.addEventListener('resize', function () { if (map) map.invalidateSize(); });
        try {
          map = L.map('map', { zoomControl: false, attributionControl: true, dragging: interactive, touchZoom: interactive, doubleClickZoom: interactive, scrollWheelZoom: interactive, boxZoom: false, keyboard: false, tap: false }).setView([19.076, 72.8777], 17);
          map.attributionControl.setPrefix(false);
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
          setTimeout(function () { map.invalidateSize(); }, 100);
          send({ type: 'mapReady' });
        } catch (e) { send({ type: 'mapError' }); }
      }());
    </script>
  </body>
</html>`;
}

export function RobotLeafletMap({ latitude, longitude, status, interactive = true, fieldRadius = 70, style, ref }: RobotLeafletMapProps) {
  const webViewRef = useRef<WebView>(null);
  const [html] = useState(() => buildHtml(interactive, fieldRadius));
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  const post = (message: object) => webViewRef.current?.postMessage(JSON.stringify(message));

  useImperativeHandle(ref, () => ({
    zoomIn: () => post({ type: 'zoomIn' }),
    zoomOut: () => post({ type: 'zoomOut' }),
    recenter: () => post({ type: 'recenter' }),
  }), []);

  useEffect(() => {
    if (isReady) post({ type: 'robotLocation', latitude, longitude, status });
  }, [isReady, latitude, longitude, status]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string };
      if (message.type === 'mapReady') setIsReady(true);
      if (message.type === 'mapError') setHasError(true);
    } catch {
      setHasError(true);
    }
  }

  if (hasError) {
    return <View style={[styles.container, styles.center, style]}><Text style={styles.errorTitle}>Map unavailable</Text><Text style={styles.errorText}>Check the phone&apos;s internet connection.</Text></View>;
  }

  return (
    <View pointerEvents={interactive ? 'auto' : 'none'} style={[styles.container, style]}>
      <WebView
        javaScriptEnabled
        onError={() => setHasError(true)}
        onMessage={handleMessage}
        originWhitelist={['*']}
        ref={webViewRef}
        scrollEnabled={false}
        source={{ html }}
        style={styles.webView}
      />
      <View pointerEvents="none" style={[styles.loading, isReady && styles.hidden]}>
        <ActivityIndicator color={AgriColors.primary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: AgriColors.mint, flex: 1, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  webView: { backgroundColor: 'transparent', flex: 1 },
  loading: { alignItems: 'center', backgroundColor: AgriColors.mint, bottom: 0, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
  hidden: { opacity: 0 },
  errorTitle: { color: AgriColors.text, fontSize: 15, fontWeight: '800', marginBottom: 6 },
  errorText: { color: AgriColors.textMuted, fontSize: 12, textAlign: 'center' },
});
