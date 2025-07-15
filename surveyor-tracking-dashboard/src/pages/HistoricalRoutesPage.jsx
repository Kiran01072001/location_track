import React, { useState, useCallback, useMemo, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FormControl, InputAdornment, TextField, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
// For files in src root (go up one level from pages/)
import SurveyorTrackMap from '../SurveyorTrackMap';
import config from '../config';
import { getTracingService } from '../tracing';

import { fromLonLat, toLonLat } from 'ol/proj';





// Walking mode configuration from SurveyorTrackMap
const WALKING_MODE = {
  code: '3e2',
  label: '🚶 Walking',
  color: '#16a34a'
};

const HistoricalRoutesPage = () => {
  const [surveyors, setSurveyors] = useState([]);
  const [surveyorId, setSurveyorId] = useState('');
  const [city, setCity] = useState('');
  const [project, setProject] = useState('');
  const [surveyorSearch, setSurveyorSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [from, setFrom] = useState(new Date(new Date().setHours(0, 0, 0, 0)));
  const [to, setTo] = useState(new Date());
  const [routeData, setRouteData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [showMap, setShowMap] = useState(false);

  // Get OpenTelemetry tracing service
  const tracingService = getTracingService();

  // Load surveyors (only when needed, not automatically)
  const loadSurveyors = useCallback(() => {
    console.log('🏛️ Loading surveyors for historical routes...');
    
    const fetchSpan = tracingService.traceDataFetch('surveyors-list', {
      'filter.city': city || 'none',
      'filter.project': project || 'none'
    });
    
    // Check if backend is available first
    const backendUrl = `${config.backendHost}/api/surveyors`;
    console.log('🏛️ Attempting to fetch from:', backendUrl);
    
    fetch(backendUrl)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('🏛️ Historical routes - surveyors loaded:', data.length, 'surveyors');
        
        // Filter client-side if needed
        let filteredData = data;
        if (city || project) {
          filteredData = data.filter(surveyor => {
            const matchesCity = !city || (surveyor.city && surveyor.city.toLowerCase().includes(city.toLowerCase()));
            const matchesProject = !project || (surveyor.projectName && surveyor.projectName.toLowerCase().includes(project.toLowerCase()));
            return matchesCity && matchesProject;
          });
          console.log(`🏛️ Filtered to ${filteredData.length} surveyors based on city/project filters`);
        }
        
        // Normalize the IDs for case-insensitive comparison
        const normalizedData = filteredData.map(surveyor => ({
          ...surveyor,
          normalizedId: surveyor.id ? surveyor.id.toLowerCase() : ''
        }));
        
        setSurveyors(normalizedData);
        console.log('🏛️ Historical routes surveyors state updated');
        
        fetchSpan.end(true, normalizedData.length);
      })
      .catch(err => {
        console.error('🏛️ Failed to load surveyors for historical routes:', err.message);
        
        // Provide mock data for development/demo purposes when backend is not available
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          console.log('🏛️ Backend not available, using mock data for demo');
          const mockSurveyors = [
            {
              id: 'surveyor-001',
              name: 'John Smith',
              city: 'New York',
              projectName: 'Manhattan Survey',
              normalizedId: 'surveyor-001'
            },
            {
              id: 'surveyor-002', 
              name: 'Sarah Johnson',
              city: 'Los Angeles',
              projectName: 'LA Downtown Project',
              normalizedId: 'surveyor-002'
            },
            {
              id: 'surveyor-003',
              name: 'Mike Davis',
              city: 'Chicago',
              projectName: 'Chicago Infrastructure',
              normalizedId: 'surveyor-003'
            }
          ];
          
          // Apply filters to mock data
          let filteredMockData = mockSurveyors;
          if (city || project) {
            filteredMockData = mockSurveyors.filter(surveyor => {
              const matchesCity = !city || (surveyor.city && surveyor.city.toLowerCase().includes(city.toLowerCase()));
              const matchesProject = !project || (surveyor.projectName && surveyor.projectName.toLowerCase().includes(project.toLowerCase()));
              return matchesCity && matchesProject;
            });
          }
          
          setSurveyors(filteredMockData);
          console.log('🏛️ Mock surveyors loaded:', filteredMockData.length, 'surveyors');
          fetchSpan.end(true, filteredMockData.length);
        } else {
          // For other errors, show user-friendly message
          alert(`Failed to load surveyors: ${err.message}\n\nPlease check if the backend server is running at ${config.backendHost}`);
          fetchSpan.end(false, 0, err);
        }
      });
  }, [city, project, tracingService]);

  // Generate Google Maps walking route URL from coordinates
  const generateGoogleMapsUrl = useCallback((coordinates) => {
    if (!coordinates || coordinates.length < 2) return '';
    
    const start = toLonLat(coordinates[0]);
    const end = toLonLat(coordinates[coordinates.length - 1]);
    return `https://www.google.com/maps/dir/${start[1]},${start[0]}/${end[1]},${end[0]}/data=!4m2!4m1!${WALKING_MODE.code}`;
  }, []);

  // Fetch route data and redirect to Google Maps
  const fetchRouteData = useCallback(async () => {
    if (!surveyorId || surveyorId === 'ALL') {
      alert('Please select a specific surveyor to view historical routes.');
      return;
    }

    console.log('🏛️ User clicked Fetch Historical Route button');
    
    const routeSpan = tracingService.traceRouteOperation('historical-fetch', {
      'surveyor.id': surveyorId,
      'route.start_time': from.toISOString(),
      'route.end_time': to.toISOString(),
      'route.type': 'historical'
    });
    
    setIsLoading(true);
    setLastFetchTime(new Date());
    setShowMap(false);
    
    console.log('🏛️ Fetching historical route data for:', surveyorId, 'from:', from, 'to:', to);
    
    try {
      // Fetch the actual coordinate data for Google Maps redirect
      const trackUrl = `${config.backendHost}/api/location/${surveyorId}/track?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
      
      console.log('🏛️ Attempting to fetch track data from:', trackUrl);
      
      try {
        const response = await fetch(trackUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const trackData = await response.json();
        
        if (trackData && trackData.length > 0) {
          // Convert coordinates to OpenLayers format
          const coordinates = trackData.map(point => fromLonLat([point.longitude, point.latitude]));
          
          // Generate Google Maps URL
          const googleMapsUrl = generateGoogleMapsUrl(coordinates);
          
          if (googleMapsUrl) {
            console.log('🏛️ Opening Google Maps walking route:', googleMapsUrl);
            // Open Google Maps in a new tab with walking route
            window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
          }
        } else {
          console.log('🏛️ No track data available for the selected time range');
          alert('No route data found for the selected surveyor and time range.');
        }
      } catch (fetchError) {
        console.error('🏛️ Failed to fetch track data:', fetchError.message);
        
        // For demo purposes when backend is not available, show a mock Google Maps URL
        if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
          console.log('🏛️ Backend not available, opening demo Google Maps route');
          // Open a demo walking route in NYC
          const demoUrl = 'https://www.google.com/maps/dir/40.7589,-73.9851/40.7614,-73.9776/data=!4m2!4m1!3e2';
          window.open(demoUrl, '_blank', 'noopener,noreferrer');
          alert('Backend server not available. Opening demo walking route in Google Maps.');
        } else {
          throw fetchError; // Re-throw other errors
        }
      }
      
      // Set route data to trigger map refresh
      const newRouteData = {
        surveyorId,
        from: from.toISOString(),
        to: to.toISOString(),
        timestamp: Date.now()
      };
      
      setRouteData(newRouteData);
      
      // Simulate loading time for better UX, then show map
      setTimeout(() => {
        setIsLoading(false);
        setShowMap(true);
        console.log('🏛️ Historical route data ready, showing map');
        
        routeSpan.end(true);
      }, 1000);
      
    } catch (error) {
      console.error('🏛️ Error fetching route data:', error);
      setIsLoading(false);
      routeSpan.end(false, 0, error);
      alert(`Failed to fetch route data: ${error.message}\n\nPlease check if the backend server is running at ${config.backendHost}`);
    }
  }, [surveyorId, from, to, tracingService, generateGoogleMapsUrl]);

  // Clear route data and hide map
  const clearRouteData = useCallback(() => {
    console.log('🏛️ Clearing route data and hiding map');
    setRouteData(null);
    setShowMap(false);
    setIsLoading(false);
  }, []);

  // Filter surveyors based on search input
  const filteredSurveyors = useMemo(() => {
    if (!surveyorSearch) return surveyors;
    
    return surveyors.filter(surveyor => {
      const id = surveyor.id || '';
      const name = surveyor.name || surveyor.fullName || surveyor.surveyorName || id;
      const project = surveyor.projectName || '';
      const city = surveyor.city || '';
      
      const searchTerm = surveyorSearch.toLowerCase();
      return (
        id.toLowerCase().includes(searchTerm) ||
        name.toLowerCase().includes(searchTerm) ||
        project.toLowerCase().includes(searchTerm) ||
        city.toLowerCase().includes(searchTerm)
      );
    });
  }, [surveyors, surveyorSearch]);

  // Group surveyors by project
  const groupedSurveyors = useMemo(() => {
    const groups = {};
    filteredSurveyors.forEach(surveyor => {
      const project = surveyor.projectName || 'Other';
      if (!groups[project]) groups[project] = [];
      groups[project].push(surveyor);
    });
    return groups;
  }, [filteredSurveyors]);

  // Load surveyors on component mount
  useEffect(() => {
    console.log('🏛️ HistoricalRoutesPage mounted - loading surveyors automatically');
    loadSurveyors();
  }, [loadSurveyors]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem'
        }}>
          <div style={{ fontSize: '2rem' }}>🛣️</div>
          <div>
            <h1 style={{
              fontSize: '1.8rem',
              fontWeight: '800',
              margin: '0',
              background: 'linear-gradient(45deg, #f59e0b, #d97706)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Historical Routes
            </h1>
            <p style={{
              fontSize: '0.9rem',
              color: '#64748b',
              margin: '0.25rem 0 0 0',
              fontWeight: '500'
            }}>
              Route analysis & movement patterns
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '20px',
          padding: '2rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{ display: 'flex', gap: '2rem', height: '850px' }}>
            {/* Left: Historical Analysis Controls */}
            <div style={{ 
              width: '320px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1.5rem',
              paddingRight: '1rem',
              borderRight: '1px solid rgba(245, 158, 11, 0.1)'
            }}>
              {/* Historical Analysis Header */}
              <div style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#fff',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.25)'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📊</div>
                <h2 style={{
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  margin: '0',
                  letterSpacing: '0.3px'
                }}>
                  Route Analysis
                </h2>
                <p style={{
                  fontSize: '0.8rem',
                  margin: '0.25rem 0 0 0',
                  opacity: 0.9
                }}>
                  Manual fetch • No auto-refresh
                </p>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ 
                    fontWeight: '600', 
                    marginBottom: '0.5rem',
                    display: 'block',
                    color: '#374151',
                    fontSize: '0.95rem'
                  }}>
                    🏙️ City
                  </label>
                  <input
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Filter by city"
                    style={{ 
                      padding: '0.75rem 1rem', 
                      borderRadius: '12px', 
                      border: '2px solid #e5e7eb', 
                      width: '100%',
                      fontSize: '1rem',
                      transition: 'all 0.3s ease',
                      background: '#ffffff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    fontWeight: '600', 
                    marginBottom: '0.5rem',
                    display: 'block',
                    color: '#374151',
                    fontSize: '0.95rem'
                  }}>
                    📋 Project
                  </label>
                  <input
                    value={project}
                    onChange={e => setProject(e.target.value)}
                    placeholder="Filter by project"
                    style={{ 
                      padding: '0.75rem 1rem', 
                      borderRadius: '12px', 
                      border: '2px solid #e5e7eb', 
                      width: '100%',
                      fontSize: '1rem',
                      transition: 'all 0.3s ease',
                      background: '#ffffff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                  />
                </div>
                <button 
                  onClick={loadSurveyors} 
                  style={{ 
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '12px', 
                    padding: '0.75rem 1.5rem', 
                    fontWeight: '600', 
                    fontSize: '1rem', 
                    cursor: 'pointer', 
                    boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  🔍 Load Surveyors
                </button>
              </div>

              {/* Surveyor Selector */}
              <div>
                <label style={{ fontWeight: 500, marginBottom: 8, display: 'block' }}>Select Surveyor:</label>
                
                {/* Search input */}
                <FormControl fullWidth variant="outlined" style={{ marginBottom: '0.75rem' }}>
                  <TextField
                    placeholder="Search surveyors..."
                    size="small"
                    value={surveyorSearch}
                    onChange={(e) => setSurveyorSearch(e.target.value)}
                    onClick={() => setIsDropdownOpen(true)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon style={{ color: '#f59e0b' }} />
                        </InputAdornment>
                      ),
                      style: { 
                        background: 'white', 
                        borderRadius: 8,
                        fontSize: '0.95rem'
                      }
                    }}
                  />
                </FormControl>
                
                {/* Dropdown */}
                <div style={{ position: 'relative' }}>
                  <div onClick={() => setIsDropdownOpen(!isDropdownOpen)} style={{
                    padding: '0.75rem 1rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'white'
                  }}>
                    <div>
                      {surveyorId ? (
                        (() => {
                          const selectedSurveyor = surveyors.find(s => s.id && s.id.toLowerCase() === surveyorId.toLowerCase());
                          const name = selectedSurveyor?.name || surveyorId;
                          return (
                            <span>
                              <span style={{ fontWeight: 600 }}>{name}</span>
                              <span style={{ color: '#64748b' }}> ({surveyorId})</span>
                            </span>
                          );
                        })()
                      ) : (
                        <span style={{ color: '#94a3b8' }}>-- Select surveyor for analysis --</span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{isDropdownOpen ? '▲' : '▼'}</span>
                  </div>
                  
                  {isDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      width: '100%',
                      maxHeight: '250px',
                      overflowY: 'auto',
                      background: 'white',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      zIndex: 10,
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      marginTop: '0.25rem'
                    }}>
                      <div style={{ padding: '0.5rem' }}>
                        {/* Individual surveyors only (no "All" option for historical) */}
                        {Object.keys(groupedSurveyors).length > 0 ? (
                          Object.entries(groupedSurveyors).map(([project, projectSurveyors]) => (
                            <div key={project} style={{ marginBottom: '0.75rem' }}>
                              <div style={{ 
                                padding: '0.25rem 0.75rem', 
                                backgroundColor: '#fef3c7',
                                fontWeight: 600, 
                                fontSize: '0.85rem', 
                                color: '#92400e',
                                borderRadius: 6
                              }}>
                                {project} ({projectSurveyors.length})
                              </div>
                              {projectSurveyors.map(surveyor => {
                                const id = surveyor.id || '';
                                const name = surveyor.name || surveyor.fullName || id;
                                const city = surveyor.city || '';
                                
                                return (
                                  <div 
                                    key={id}
                                    onClick={() => {
                                      setSurveyorId(id);
                                      setIsDropdownOpen(false);
                                    }}
                                    style={{ 
                                      padding: '0.5rem 0.75rem', 
                                      cursor: 'pointer',
                                      borderRadius: 6,
                                      backgroundColor: surveyorId === id ? '#fef3c7' : 'transparent'
                                    }}
                                    onMouseOver={(e) => {
                                      if (surveyorId !== id) e.target.style.backgroundColor = '#f8fafc';
                                    }}
                                    onMouseOut={(e) => {
                                      if (surveyorId !== id) e.target.style.backgroundColor = 'transparent';
                                    }}
                                  >
                                    <div>
                                      <span style={{ fontWeight: 600 }}>{name}</span>
                                      <span style={{ color: '#64748b', marginLeft: '0.25rem', fontSize: '0.9rem' }}>({id})</span>
                                    </div>
                                    {city && (
                                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.15rem' }}>
                                        📍 {city}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>
                            No surveyors loaded. Click "Load Surveyors" first.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Date Range Pickers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ 
                    fontWeight: '600', 
                    marginBottom: '0.5rem',
                    display: 'block',
                    color: '#374151',
                    fontSize: '0.95rem'
                  }}>
                    📅 From Date & Time
                  </label>
                  <DatePicker
                    selected={from}
                    onChange={date => setFrom(date)}
                    showTimeSelect
                    dateFormat="MMM dd, yyyy h:mm aa"
                    className="date-picker"
                    placeholderText="Select start date and time"
                  />
                </div>
                <div>
                  <label style={{ 
                    fontWeight: '600', 
                    marginBottom: '0.5rem',
                    display: 'block',
                    color: '#374151',
                    fontSize: '0.95rem'
                  }}>
                    📅 To Date & Time
                  </label>
                  <DatePicker
                    selected={to}
                    onChange={date => setTo(date)}
                    showTimeSelect
                    dateFormat="MMM dd, yyyy h:mm aa"
                    className="date-picker"
                    placeholderText="Select end date and time"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1rem',
                alignItems: 'stretch'
              }}>
                {/* Fetch Button - Now includes Google Maps redirect */}
                <Button
                  onClick={fetchRouteData}
                  disabled={!surveyorId || isLoading}
                  variant="contained"
                  size="large"
                  style={{
                    background: surveyorId && !isLoading 
                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                      : '#94a3b8',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    padding: '1rem 2rem',
                    borderRadius: '12px',
                    boxShadow: surveyorId && !isLoading 
                      ? '0 8px 25px rgba(245, 158, 11, 0.4)' 
                      : 'none',
                    transition: 'all 0.3s ease',
                    textTransform: 'none'
                  }}
                >
                  {isLoading ? (
                    <>
                      <div style={{ 
                        display: 'inline-block', 
                        width: '16px', 
                        height: '16px', 
                        border: '2px solid #ffffff30',
                        borderTop: '2px solid #ffffff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginRight: '0.5rem'
                      }} />
                      Opening Google Maps...
                    </>
                  ) : (
                    <>
                      🔍 Fetch Historical Route
                    </>
                  )}
                </Button>

                {/* Clear Map Button */}
                <Button
                  onClick={clearRouteData}
                  disabled={isLoading || !routeData}
                  variant="contained"
                  size="large"
                  style={{
                    background: routeData && !isLoading
                      ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                      : '#94a3b8',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '1rem',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    boxShadow: routeData && !isLoading
                      ? '0 4px 15px rgba(239, 68, 68, 0.3)'
                      : 'none',
                    transition: 'all 0.3s ease',
                    textTransform: 'none',
                    opacity: routeData && !isLoading ? 1 : 0.6
                  }}
                >
                  🗑️ Clear Map
                </Button>
              </div>

              {/* Last Fetch Info */}
              {lastFetchTime && (
                <div style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  border: '1px solid #fed7aa'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Last Fetch:</div>
                  <div>{lastFetchTime.toLocaleString()}</div>
                </div>
              )}

              {/* Google Maps Integration Info */}
              <div style={{
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                color: '#ffffff',
                padding: '1rem',
                borderRadius: '12px',
                fontSize: '0.85rem',
                textAlign: 'center',
                boxShadow: '0 4px 15px rgba(22, 163, 74, 0.25)'
              }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>🚶</div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Google Maps Integration</div>
                <div style={{ opacity: 0.9 }}>
                  Clicking "Fetch Historical Route" will automatically open Google Maps with walking directions
                </div>
              </div>
            </div>

            {/* Right: Historical Routes Map */}
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              minHeight: '700px',
              background: '#f8fafc',
              borderRadius: '16px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                padding: '1.5rem 2rem', 
                borderBottom: '1px solid rgba(245, 158, 11, 0.1)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem' 
                }}>
                  <div style={{ fontSize: '1.5rem' }}>🗺️</div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#92400e', fontSize: '1.1rem' }}>Historical Routes Map</div>
                    <div style={{ fontSize: '0.85rem', color: '#d97706' }}>Manual fetch • Route analysis</div>
                  </div>
                </div>
                {routeData && (
                  <div style={{ 
                    background: 'linear-gradient(45deg, #f59e0b 0%, #d97706 100%)', 
                    color: '#ffffff',
                    padding: '0.5rem 1rem',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span>📊</span>
                    Route Analysis
                  </div>
                )}
              </div>
              
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                position: 'relative',
                minHeight: '600px'
              }}>
                {routeData && showMap && (
                  <SurveyorTrackMap
                    key={routeData.timestamp}
                    surveyorIds={[routeData.surveyorId]}
                    from={routeData.from}
                    to={routeData.to}
                    liveTracking={false}
                    showGoogleMapsLinks={false} // Disable the built-in Google Maps link since we're handling it manually
                  />
                )}
                {(!routeData || !showMap) && (
                  <div style={{ 
                    padding: '4rem 2rem', 
                    textAlign: 'center',
                    color: '#64748b',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
                    borderRadius: '16px',
                    margin: '2rem',
                    border: '2px dashed #fbbf24'
                  }}>
                    <div style={{ 
                      fontSize: '4rem',
                      background: 'linear-gradient(45deg, #f59e0b, #d97706)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>🛣️</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#92400e', marginBottom: '0.5rem' }}>
                        {isLoading ? 'Loading Historical Route...' : 'Ready for Route Analysis'}
                      </div>
                      <div style={{ fontSize: '1rem', lineHeight: '1.5', color: '#d97706' }}>
                        {isLoading ? (
                          'Opening Google Maps with walking directions...'
                        ) : (
                          <>
                            1. Select a surveyor from dropdown<br />
                            2. Choose your date range<br />
                            3. Click "Fetch Historical Route"<br />
                            4. Google Maps will open with walking directions
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      color: '#d97706',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      border: '1px solid rgba(245, 158, 11, 0.2)'
                    }}>
                      {isLoading ? '🚶 Opening Google Maps...' : '🔍 Fetch route to open Google Maps walking directions'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add CSS for loading animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default HistoricalRoutesPage;



