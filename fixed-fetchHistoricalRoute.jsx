// Fetch historical route with proper date formatting
const fetchHistoricalRoute = useCallback(async () => {
if (!selectedSurveyor) {
setError('Please select a surveyor first');
return;
}

setLoading(true);
setError('');
setHistoricalRoute([]);
setLiveLocation(null);
setLiveTrail([]);
try {
const startUTC = new Date(fromDate.getTime() - (fromDate.getTimezoneOffset() * 60000));
const endUTC = new Date(toDate.getTime() - (toDate.getTimezoneOffset() * 60000));

const startFormatted = startUTC.toISOString();
const endFormatted = endUTC.toISOString();

const url = `/api/location/${selectedSurveyor}/track?start=${encodeURIComponent(startFormatted)}&end=${encodeURIComponent(endFormatted)}`;
const data = await apiCall(url);

if (data?.length > 0) {
const routePoints = data.map(point => ({
lat: point.latitude,
lng: point.longitude,
timestamp: new Date(point.timestamp)
}));

setHistoricalRoute(routePoints);
// 移除Google Maps代码，让OSRMRoute组件负责导航
} else {
setError('No location data found for the selected time range');
}
} catch (error) {
console.error('Failed to fetch track data:', error);
// Fallback demo data if needed
const demoRoute = Array.from({ length: 5 }, (_, i) => {
const timeOffset = (toDate - fromDate) * (i / 4);
return {
lat: 17.4010007 + (Math.random() - 0.5) * 0.01,
lng: 78.5643879 + (Math.random() - 0.5) * 0.01,
timestamp: new Date(fromDate.getTime() + timeOffset)
};
});
setHistoricalRoute(demoRoute);
setError('Demo mode: Showing simulated historical route');
} finally {
setLoading(false);
}
}, [selectedSurveyor, fromDate, toDate, apiCall, needRouting, needExternalNav]);