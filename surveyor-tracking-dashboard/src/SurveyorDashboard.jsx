import React, { useState, useEffect, useMemo, useCallback } from 'react';
import LiveTrackingPage from './pages/LiveTrackingPage';
import SurveyorManagementPage from './pages/SurveyorManagementPage';
import { Box, Button, Typography, InputBase, Paper, IconButton, Stack } from '@mui/material';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import GroupIcon from '@mui/icons-material/Group';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import config from './config';

const SurveyorDashboard = () => {
    const [activeView, setActiveView] = useState('tracking');
    const [allSurveyors, setAllSurveyors] = useState([]);
    const [surveyorSearch, setSurveyorSearch] = useState('');

   
    const fetchAllSurveyors = useCallback(() => {
        fetch(`${config.backendHost}/api/surveyors`)
            .then(res => res.json())
            .then(data => setAllSurveyors(data))
            .catch(err => console.error('Failed to load surveyors:', err));
    }, []); // useCallback ensures this function doesn't change on re-renders

    useEffect(() => {
        fetchAllSurveyors();
    }, [fetchAllSurveyors]);

    const filteredSurveyors = useMemo(() => {
        if (!surveyorSearch) return allSurveyors;
        const lowercasedSearch = surveyorSearch.toLowerCase();
        return allSurveyors.filter(s =>
            (s.name && s.name.toLowerCase().includes(lowercasedSearch)) ||
            (s.id && String(s.id).toLowerCase().includes(lowercasedSearch))
        );
    }, [allSurveyors, surveyorSearch]);

    const navButtonStyle = (view) => ({
        textTransform: 'none',
        fontWeight: 700,
        fontSize: '0.9rem',
        padding: '8px 20px',
        borderRadius: '10px',
        transition: 'all 0.3s ease',
        border: '1px solid transparent',
        color: activeView === view ? '#fff' : '#FF6200',
        background: activeView === view ?
            'linear-gradient(135deg, #FF6200 0%, #FD7F2C 100%)' :
            'transparent',
        borderColor: activeView === view ? 'transparent' : '#FFE8D9',
        '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            background: activeView !== view ? '#FFF7F2' : 'linear-gradient(135deg, #FD7F2C 5%, #FD9346 100%)',
        }
    });

    return (
        <Box sx={{
            height: '100vh',
            width: '100%',
            background: '#F5F5F5',
            display: 'flex',
            flexDirection: 'column',
        }}>
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    m: 2,
                    mb: 0,
                    bgcolor: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 8px 32px 0 rgba(100, 100, 150, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    flexShrink: 0
                }}
            >
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                    <Typography variant="h4" sx={{
                        fontWeight: 800,
                        background: 'linear-gradient(#FF6200, #FD7F2C, #FD9346)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        Live Tracking
                    </Typography>

                    <Stack direction="row" alignItems="center" sx={{ flexGrow: 1, justifyContent: 'center' }}>
                        <Paper
                            component="form"
                            onSubmit={(e) => e.preventDefault()}
                            elevation={0}
                            sx={{
                                p: '2px 4px',
                                display: 'flex',
                                alignItems: 'center',
                                width: '100%',
                                maxWidth: 500,
                                borderRadius: '50px',
                                border: '1px solid #E0E0E0', // Neutral default border
                                transition: 'all 0.2s ease-in-out',
                                '&:focus-within': {
                                    borderColor: '#FD7F2C', // Orange border on focus
                                    boxShadow: '0 0 0 3px rgba(253, 127, 44, 0.3)',
                                },
                            }}
                        >
                            <InputBase
                                sx={{ ml: 2, flex: 1 }}
                                placeholder="Search Surveyor by Name or ID..."
                                value={surveyorSearch}
                                onChange={(e) => setSurveyorSearch(e.target.value)}
                            />
                            {surveyorSearch && (
                                <IconButton type="button" sx={{ p: '10px' }} aria-label="clear" onClick={() => setSurveyorSearch('')}>
                                    <CloseIcon />
                                </IconButton>
                            )}
                            {/* --- CHANGE 3: Search icon is now a button on the right --- */}
                            <IconButton type="submit" sx={{ p: '10px', color: '#FF6200' }} aria-label="search">
                                <SearchIcon />
                            </IconButton>
                        </Paper>
                        {/* === END OF MODIFICATION === */}
                    </Stack>

                    <Stack direction="row" spacing={1.5}>
                        <Button startIcon={<TrackChangesIcon />} sx={navButtonStyle('tracking')} onClick={() => setActiveView('tracking')}>
                            Tracking
                        </Button>
                        <Button startIcon={<GroupIcon />} sx={navButtonStyle('users')} onClick={() => setActiveView('users')}>
                            Surveyors
                        </Button>
                    </Stack>
                </Stack>
            </Paper>

            <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex' }}>
                {activeView === 'tracking' && <LiveTrackingPage surveyors={filteredSurveyors} />}
                {activeView === 'users' && (
                    <SurveyorManagementPage
                        // --- CHANGE 4: Pass filtered data and refresh function to the child ---
                        surveyors={filteredSurveyors}
                        onDataChange={fetchAllSurveyors}
                    />
                )}
            </Box>
        </Box>
    );
};

export default SurveyorDashboard;
