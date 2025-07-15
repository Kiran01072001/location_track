import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Select, MenuItem, FormControl, InputLabel, TextField, Button,
  Paper, Grid, Box, Typography, CircularProgress, InputAdornment, Alert
} from '@mui/material';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import SurveyorTrackMap from '../SurveyorTrackMap';
import config from '../config';

// Icons
import HistoryIcon from '@mui/icons-material/History';
import SensorsIcon from '@mui/icons-material/Sensors';
import MapIcon from '@mui/icons-material/Map';
import SearchIcon from '@mui/icons-material/Search';

// --- HELPER: Formats a timestamp into "X units ago" ---
const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'N/A';
  const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
  if (seconds < 60) return `${seconds} secs ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hrs ago`;
};

// --- RESTORED: SurveyorInfoCard component ---
const SurveyorInfoCard = ({ surveyor, status, liveData }) => {
  const StatusIndicator = ({ status }) => (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box
        component="span"
        sx={{
          width: 9, height: 9, borderRadius: '50%', mr: 1,
          bgcolor: status === 'Online' ? '#10B981' : '#EF4444',
        }}
      />
      <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.5 }}>
        {status || 'Offline'}
      </Typography>
    </Box>
  );

  const DetailPair = ({ label, children }) => (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Box>{children}</Box>
    </Box>
  );

  return (
    <Paper
      elevation={5}
      sx={{
        position: 'absolute', top: 16, right: 16, width: 350,
        p: '20px', borderRadius: '12px', bgcolor: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(10px)', zIndex: 1100, // zIndex higher than map
        boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
      }}
    >
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Surveyor Details
        </Typography>
      </Box>
      <Grid container rowSpacing={2.5} columnSpacing={2}>
        <Grid item xs={6}>
          <DetailPair label="Name / ID">
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{`${surveyor.name} / ${surveyor.id}`}</Typography>
          </DetailPair>
        </Grid>
        <Grid item xs={6}>
          <DetailPair label="Live Status">
            <StatusIndicator status={status} />
          </DetailPair>
        </Grid>
         <Grid item xs={6}>
          <DetailPair label="Project">
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{surveyor.projectName}</Typography>
          </DetailPair>
        </Grid>
        <Grid item xs={6}>
          <DetailPair label="City">
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{surveyor.city}</Typography>
          </DetailPair>
        </Grid>
        <Grid item xs={12}>
           <DetailPair label="Last Update">
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{formatTimeAgo(liveData?.timestamp)}</Typography>
          </DetailPair>
        </Grid>
         <Grid item xs={12}>
          <DetailPair label="Coordinates">
            <Typography variant="body2" sx={{ fontWeight: 500, letterSpacing: '0.5px' }}>
              {liveData ? `${liveData.lat.toFixed(5)}, ${liveData.lon.toFixed(5)}` : 'N/A'}
            </Typography>
          </DetailPair>
        </Grid>
      </Grid>
    </Paper>
  );
};


const gradientBorderStyle = {
  '& label.Mui-focused': { color: '#FF6200' },
  '& .MuiOutlinedInput-root': {
    borderRadius: 0,
    '& .MuiOutlinedInput-notchedOutline': {
      border: '2px solid',
      borderImageSlice: 1,
      borderImageSource: 'linear-gradient(135deg, #FF6200 0%, #FD7F2C 100%)',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderImageSource: 'linear-gradient(135deg, #FF6200 0%, #FD7F2C 100%)',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderImageSource: 'linear-gradient(135deg, #FF6200 0%, #FD7F2C',
    },
  },
};

const CustomDateInput = React.forwardRef(({ value, onClick, label, sx }, ref) => (
  <TextField
    label={label} value={value} onClick={onClick} ref={ref}
    size="small" fullWidth readOnly sx={sx}
  />
));

const LiveTrackingPage = ({ surveyors }) => {
  const [statusMap, setStatusMap] = useState({});
  const [surveyorId, setSurveyorId] = useState('ALL');
  const [city, setCity] = useState('');
  const [project, setProject] = useState('');
  const [viewMode, setViewMode] = useState('live');
  const [from, setFrom] = useState(new Date(new Date().setHours(0, 0, 0, 0)));
  const [to, setTo] = useState(new Date());
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [historicalRoute, setHistoricalRoute] = useState([]);
  
  // State for a single surveyor's live data
  const [liveData, setLiveData] = useState(null);
  
  // NEW: State for all surveyors' latest locations
  const [allSurveyorsData, setAllSurveyorsData] = useState([]);

  const apiCall = useCallback(async (endpoint, options = {}) => {
    try {
      const url = `${config.backendHost}${endpoint}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
      });
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorBody}`);
      }
      return await response.json();
    } catch (err) {
      console.error(`API call failed for ${endpoint}:`, err);
      throw err;
    }
  }, []);

  const loadStatus = useCallback(() => {
    apiCall('/api/surveyors/status')
      .then(data => setStatusMap(data))
      .catch(err => console.error('Failed to load status:', err));
  }, [apiCall]);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 15000); // Refresh status every 15s
    return () => clearInterval(interval);
  }, [loadStatus]);

  // NEW: Effect to fetch all surveyors' latest locations
  useEffect(() => {
    const fetchAllLatestLocations = async () => {
      try {
        const data = await apiCall('/api/location/latest/all');
        
        // Add surveyor name to each location object for the popup
        const enrichedData = data.map(loc => {
            const surveyorDetails = surveyors.find(s => s.id === loc.surveyorId);
            return {
                ...loc,
                name: surveyorDetails ? surveyorDetails.name : loc.surveyorId,
                lat: loc.latitude,
                lon: loc.longitude,
            };
        });

        setAllSurveyorsData(enrichedData);
      } catch (err) {
        console.error("Could not fetch all latest locations", err);
        setError("Could not fetch latest locations for all surveyors.");
      }
    };
    
    let interval;
    if (viewMode === 'live' && surveyorId === 'ALL' && surveyors.length > 0) {
      fetchAllLatestLocations();
      interval = setInterval(fetchAllLatestLocations, 20000); // Refresh every 20s
    }

    return () => {
        if (interval) clearInterval(interval);
        setAllSurveyorsData([]); // Clear data when not in this mode
    };
  }, [viewMode, surveyorId, apiCall, surveyors]);


  // Effect for a SINGLE surveyor's live data (mocked for now)
  useEffect(() => {
    let intervalId = null;
    const fetchLiveData = () => {
      setLiveData({
        lat: 34.0522 + (Math.random() - 0.5) * 0.01,
        lon: -118.2437 + (Math.random() - 0.5) * 0.01,
        timestamp: new Date().toISOString(),
      });
    };
    if (viewMode === 'live' && surveyorId && surveyorId !== 'ALL') {
      fetchLiveData();
      intervalId = setInterval(fetchLiveData, 5000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
      setLiveData(null);
    };
  }, [surveyorId, viewMode]);

  const handleSurveyorChange = (event) => {
    const newId = event.target.value;
    setSurveyorId(newId);
    setError(''); // Clear errors on change
    if (newId && newId !== 'ALL') {
      const selectedSurveyor = surveyors.find(s => s.id === newId);
      if (selectedSurveyor) {
        setCity(selectedSurveyor.city || '');
        setProject(selectedSurveyor.projectName || '');
      }
    } else {
      setCity('');
      setProject('');
    }
  };

  const handleFetchHistorical = useCallback(async () => {
    // ... (This function remains unchanged from the previous version)
     if (!surveyorId || surveyorId === 'ALL') { setError('Please select a single surveyor to view their historical route.'); return; }
    setLoading(true); setError(''); setHistoricalRoute([]); setLiveData(null);
    try {
      const startFormatted = from.toISOString(); const endFormatted = to.toISOString();
      const url = `/api/location/${surveyorId}/track?start=${encodeURIComponent(startFormatted)}&end=${encodeURIComponent(endFormatted)}`;
      const data = await apiCall(url);
      if (data?.length > 0) {
        const routePoints = data.map(point => ({ lat: point.latitude, lon: point.longitude, timestamp: new Date(point.timestamp) }));
        setHistoricalRoute(routePoints); setViewMode('historical');
        if (routePoints.length > 1) {
          const start = routePoints[0]; const end = routePoints[routePoints.length - 1];
          const googleMapsUrl = `https://www.google.com/maps/dir/${start.lat},${start.lon}/${end.lat},${end.lon}/data=!4m2!4m1!3e2`;
          window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
        }
      } else { setError('No location data found for the selected surveyor in this time range.'); setViewMode('historical'); }
    } catch (err) { console.error('Failed to fetch track data:', err); setError('Failed to fetch historical route. Check backend connection and console for details.');
    } finally { setLoading(false); }
  }, [surveyorId, from, to, apiCall]);

  const switchToLiveMode = () => {
    setViewMode('live');
    setError('');
    setHistoricalRoute([]);
  };
  
  const surveyorsToDisplay = useMemo(() => {
    return surveyors.filter(s => {
      const matchesCity = !city || (s.city && s.city.toLowerCase().includes(city.toLowerCase()));
      const matchesProject = !project || (s.projectName && s.projectName.toLowerCase().includes(project.toLowerCase()));
      return matchesCity && matchesProject;
    });
  }, [surveyors, city, project]);

  const selectedSurveyorData = useMemo(() => {
    if (!surveyorId || surveyorId === 'ALL') return null;
    return surveyors.find(s => s.id === surveyorId);
  }, [surveyorId, surveyors]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      
      <Paper elevation={0} sx={{ p: 2, borderRadius: 0, bgcolor: 'white', borderBottom: '1px solid #E5E7EB' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item sx={{ minWidth: 280 }}>
            <FormControl fullWidth size="small" sx={gradientBorderStyle}>
              <InputLabel>Tracking Surveyor</InputLabel>
              <Select value={surveyorId} label="Tracking Surveyor" onChange={handleSurveyorChange}>
                <MenuItem value="ALL" sx={{ fontWeight: 'bold' }}>All Surveyors (Live)</MenuItem>
                {surveyorsToDisplay.map(s => (
                  <MenuItem key={s.id} value={s.id}>
                    {/* NEW: Status indicator dot */}
                    <Box component="span" sx={{
                      width: '10px', height: '10px', borderRadius: '50%', mr: 1.5,
                      bgcolor: statusMap[s.id] === 'Online' ? '#10B981' : '#EF4444'
                    }} />
                    {s.name || s.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {/* ... Other filter controls are unchanged ... */}
          <Grid item xs={12} sm={6} md={1.5}> <TextField label="Filter by City" size="small" fullWidth value={city} onChange={e => setCity(e.target.value)} sx={gradientBorderStyle} InputProps={{ endAdornment: ( <InputAdornment position="end"> <SearchIcon sx={{ color: 'grey.500' }} /> </InputAdornment> ), }} /> </Grid>
          <Grid item xs={12} sm={6} md={1.5}> <TextField label="Filter by Project" size="small" fullWidth value={project} onChange={e => setProject(e.target.value)} sx={gradientBorderStyle} InputProps={{ endAdornment: ( <InputAdornment position="end"> <SearchIcon sx={{ color: 'grey.500' }} /> </InputAdornment> ), }} /> </Grid>
          <Grid item xs={6} md={2}> <DatePicker selected={from} onChange={date => setFrom(date)} showTimeSelect dateFormat="MMM dd, h:mm aa" customInput={<CustomDateInput label="From Date" sx={gradientBorderStyle} />} calendarClassName="elegant-datepicker" popperPlacement="bottom-end" /> </Grid>
          <Grid item xs={6} md={2}> <DatePicker selected={to} onChange={date => setTo(date)} showTimeSelect dateFormat="MMM dd, h:mm aa" customInput={<CustomDateInput label="To Date" sx={gradientBorderStyle} />} calendarClassName="elegant-datepicker" popperPlacement="bottom-end" /> </Grid>
          <Grid item xs={12} md container spacing={1} justifyContent="flex-end">
            <Grid item>
              <Button onClick={handleFetchHistorical} disabled={!surveyorId || surveyorId === 'ALL' || loading} variant="contained" startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <HistoryIcon />} sx={{ textTransform: 'none', borderRadius: '8px', bgcolor: '#F59E0B', '&:hover': { bgcolor: '#D97706' } }}>
                Historical
              </Button>
            </Grid>
            <Grid item>
              <Button onClick={switchToLiveMode} disabled={viewMode === 'live' || loading} variant="contained" startIcon={<SensorsIcon />} sx={{ textTransform: 'none', borderRadius: '8px', bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}>
                Live
              </Button>
            </Grid>
          </Grid>
        </Grid>
        {error && <Alert severity="warning" sx={{ mt: 2 }}>{error}</Alert>}
      </Paper>

      <Paper elevation={0} sx={{ flex: 1, borderRadius: 0, overflow: 'hidden', position: 'relative' }}>
          {/* RESTORED: Conditionally render the SurveyorInfoCard */}
          {viewMode === 'live' && selectedSurveyorData && (
            <SurveyorInfoCard
              surveyor={selectedSurveyorData}
              status={statusMap[selectedSurveyorData.id]}
              liveData={liveData}
            />
          )}

          {/* Map Rendering Logic */}
          <SurveyorTrackMap
            key={`${viewMode}-${surveyorId}-${historicalRoute.length}`}
            liveTracking={viewMode === 'live'}
            // Pass the data for all surveyors if that mode is active
            allSurveyorsData={viewMode === 'live' && surveyorId === 'ALL' ? allSurveyorsData : []}
            // Pass live data for a single surveyor
            liveSurveyorData={viewMode === 'live' && surveyorId !== 'ALL' ? liveData : null}
            // Pass historical route data if that mode is active
            historicalRouteData={viewMode === 'historical' ? historicalRoute : []}
          />
      </Paper>

      <style>{`
        .elegant-datepicker .react-datepicker {
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          border: none;
           font-family: 'Roboto', sans-serif;
       }
       .elegant-datepicker .react-datepicker__header {
         background: linear-gradient(135deg, #FF6200 0%, #FD7F2C 100%);
          border-top-left-radius: 12px;
           border-top-right-radius: 12px;
          color: white;
        padding-top: 15px;
       }
       .elegant-datepicker .react-datepicker__current-month,
.elegant-datepicker .react-datepicker__day-name {
         color: white;
         font-weight: 500;
       }
.elegant-datepicker .react-datepicker__navigation-icon::before {
         border-color: white;
       }
       .elegant-datepicker .react-datepicker__day {
         transition: all 0.2s ease;
         border-radius: 50%;
       }
       .elegant-datepicker .react-datepicker__day:hover {
         background-color: #FFE8D9;
         border-radius: 50%;
       }
       .elegant-datepicker .react-datepicker__day--selected,
       .elegant-datepicker .react-datepicker__day--keyboard-selected {
         background-color: #FF6200;
         color: white;
         border-radius: 50%;
       }
       .elegant-datepicker .react-datepicker__day--today {
         font-weight: bold;
         border: 1px solid #FF6200;
       }
       .elegant-datepicker .react-datepicker__time-container {
         border-left: 1px solid #eee;
       }
       .elegant-datepicker .react-datepicker__time-list-item--selected {
         background-color: #FF6200 !important;
         color: white !important;
       }
       .elegant-datepicker .react-datepicker__time-list-item:hover {
         background-color: #FFE8D9 !important;
       }
       .react-datepicker-popper {
          z-index: 2000 !important;
        }
       }
     `}</style>
    </Box>
  );
};

export default LiveTrackingPage;