import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { Typography } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const startIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const endIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const liveIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });

const MapBounds = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
        map.setView([20.5937, 78.9629], 5);
    }
  }, [positions, map]);
  return null;
};

const SurveyorTrackMap = ({ allSurveyorsData, liveSurveyorData, historicalRouteData }) => {
  
  // Combine all possible points to calculate the map bounds
  const allPositions = [
    ...(allSurveyorsData?.map(p => [p.lat, p.lon]) || []),
    ...(liveSurveyorData ? [[liveSurveyorData.lat, liveSurveyorData.lon]] : []),
    ...(historicalRouteData?.map(p => [p.lat, p.lon]) || []),
  ];

  const startPoint = historicalRouteData?.[0];
  const endPoint = historicalRouteData?.length > 1 ? historicalRouteData[historicalRouteData.length - 1] : null;

  return (
    <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapBounds positions={allPositions} />
      
      {/* 1. Render all surveyors' latest locations */}
      {allSurveyorsData && allSurveyorsData.map(surveyor => (
        <Marker key={surveyor.surveyorId} position={[surveyor.lat, surveyor.lon]}>
          <Popup>
            <strong>{surveyor.name || surveyor.surveyorId}</strong><br />
            Last Seen: {new Date(surveyor.timestamp).toLocaleString()}
          </Popup>
        </Marker>
      ))}

      {/* 2. Render a single surveyor's live location */}
      {liveSurveyorData && (
          <Marker position={[liveSurveyorData.lat, liveSurveyorData.lon]} icon={liveIcon}>
              <Popup>Live Location</Popup>
          </Marker>
      )}

      {/* 3. Render historical route */}
      {historicalRouteData && historicalRouteData.length > 0 && (
        <>
            <Polyline positions={historicalRouteData.map(p => [p.lat, p.lon])} color="#FF6200" weight={5} />
            
            {startPoint && (
                <Marker position={[startPoint.lat, startPoint.lon]} icon={startIcon}>
                    <Popup><strong>Start Point</strong><br />Time: {startPoint.timestamp.toLocaleString()}</Popup>
                </Marker>
            )}

            {endPoint && (
                <Marker position={[endPoint.lat, endPoint.lon]} icon={endIcon}>
                    <Popup><strong>End Point</strong><br />Time: {endPoint.timestamp.toLocaleString()}</Popup>
                </Marker>
            )}
        </>
      )}
      
       {/* Placeholder if no data is available at all */}
       {allPositions.length === 0 && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1000, background: 'rgba(255,255,255,0.8)', padding: 20, borderRadius: 8, textAlign: 'center' }}>
            <MapIcon sx={{ fontSize: '3rem', color: '#9ca3af' }} />
            <Typography variant="h6" color="textSecondary">Select a surveyor or mode to begin.</Typography>
        </div>
      )}

    </MapContainer>
  );
};

export default SurveyorTrackMap;
