import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';

import { AgriColors, AgriRadius, AgriSpacing } from '@/constants/agri-theme';

type RobotLeafletMapProps = {
  latitude: number;
  longitude: number;
  status: string;
};

type RobotLocationMessage = {
  type: 'robotLocation';
  latitude: number;
  longitude: number;
  status: string;
};

const LEAFLET_HTML = `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map { height: 100%; margin: 0; }
      body { background: #e7f0e5; }
      .agribot-marker { align-items: center; background: #1e6b45; border: 3px solid #ffffff; border-radius: 50% 50% 50% 0; box-shadow: 0 3px 9px rgba(21, 63, 44, 0.35); display: flex; height: 34px; justify-content: center; transform: rotate(-45deg); width: 34px; }
      .agribot-marker span { color: #ffffff; font: 800 14px sans-serif; transform: rotate(45deg); }
      .leaflet-popup-content-wrapper { border-radius: 10px; }
      .leaflet-popup-content { color: #16352a; font: 700 13px sans-serif; margin: 12px 14px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      (function () {
        var map;
        var marker;
        var lastStatus = 'online';
        var defaultCenter = [19.076, 72.8777];

        function sendMessage(message) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(message));
          }
        }

        function updateMarker(location) {
          var coordinates = [location.latitude, location.longitude];
          lastStatus = location.status;
          if (!map) return;
          if (!marker) {
            marker = L.marker(coordinates, {
              icon: L.divIcon({ className: '', html: '<div class="agribot-marker"><span>A</span></div>', iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30] })
            }).addTo(map);
          } else {
            marker.setLatLng(coordinates);
          }
          marker.bindPopup('<strong>AgriBot</strong><br>Status: ' + lastStatus).openPopup();
          map.setView(coordinates, map.getZoom() || 15, { animate: true });
        }

        function initializeMap() {
          map = L.map('map', { zoomControl: true, attributionControl: true }).setView(defaultCenter, 15);
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);
          setTimeout(function () { map.invalidateSize(); }, 100);
          sendMessage({ type: 'mapReady' });
        }

        function handleMessage(event) {
          try {
            var message = JSON.parse(event.data);
            if (message.type === 'robotLocation' && typeof message.latitude === 'number' && typeof message.longitude === 'number') {
              updateMarker(message);
            }
          } catch (error) {
            sendMessage({ type: 'mapError' });
          }
        }

        window.addEventListener('message', handleMessage);
        document.addEventListener('message', handleMessage);
        window.addEventListener('resize', function () { if (map) map.invalidateSize(); });

        try {
          initializeMap();
        } catch (error) {
          sendMessage({ type: 'mapError' });
        }
      }());
    </script>
  </body>
</html>
`;

export function RobotLeafletMap({ latitude, longitude, status }: RobotLeafletMapProps) {
  const webViewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  const sendLocation = () => {
    const message: RobotLocationMessage = { type: 'robotLocation', latitude, longitude, status };
    webViewRef.current?.postMessage(JSON.stringify(message));
  };

  useEffect(() => {
    if (isReady) sendLocation();
  }, [isReady, latitude, longitude, status]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string };
      if (message.type === 'mapReady') {
        setIsReady(true);
      }
      if (message.type === 'mapError') {
        setHasError(true);
      }
    } catch {
      setHasError(true);
    }
  }

  if (hasError) {
    return <View style={styles.error}><Text style={styles.errorTitle}>Map unavailable</Text><Text style={styles.errorText}>The Leaflet map could not be loaded. Check the phone&apos;s internet connection.</Text></View>;
  }

  return <View style={styles.container}><WebView ref={webViewRef} originWhitelist={['*']} javaScriptEnabled onError={() => setHasError(true)} onLoadEnd={sendLocation} onMessage={handleMessage} source={{ html: LEAFLET_HTML }} style={styles.webView} /><View pointerEvents="none" style={[styles.loading, isReady && styles.hidden]}><ActivityIndicator color={AgriColors.primary} /><Text style={styles.loadingText}>Loading map...</Text></View></View>;
}

const styles = StyleSheet.create({
  container: { backgroundColor: AgriColors.surfaceMuted, borderColor: '#C3D8C4', borderRadius: AgriRadius.lg, borderWidth: 1, flex: 1, minHeight: 300, overflow: 'hidden' },
  webView: { backgroundColor: 'transparent', flex: 1 },
  loading: { alignItems: 'center', backgroundColor: AgriColors.surfaceMuted, bottom: 0, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
  hidden: { opacity: 0 },
  loadingText: { color: AgriColors.textMuted, fontSize: 12, marginTop: AgriSpacing.sm },
  error: { alignItems: 'center', backgroundColor: AgriColors.surfaceMuted, borderColor: '#C3D8C4', borderRadius: AgriRadius.lg, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 300, padding: AgriSpacing.lg },
  errorTitle: { color: AgriColors.text, fontSize: 16, fontWeight: '800', marginBottom: AgriSpacing.sm },
  errorText: { color: AgriColors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
