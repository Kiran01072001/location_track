
import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Container, IconButton, Card, CardContent } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import SurveyorTable from '../components/SurveyorTable';
import SurveyorFormModal from '../components/SurveyorFormModal';


const SurveyorDetailView = ({ surveyor, onBack }) => (
    <Paper sx={{ p: { xs: 2, md: 3 }, mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton onClick={onBack} aria-label="back to list">
                <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" component="h1" fontWeight="bold" sx={{ ml: 1 }}>
                Surveyor Details
            </Typography>
        </Box>
        <Card variant="outlined">
            <CardContent>
                <Typography variant="h4" gutterBottom color="primary">
                    {surveyor.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, mt: 2 }}>
                    <PersonIcon sx={{ mr: 1.5, color: 'text.secondary' }} />
                    <Typography><strong>ID:</strong> {surveyor.id}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <EmailIcon sx={{ mr: 1.5, color: 'text.secondary' }} />
                    <Typography><strong>Email:</strong> {surveyor.email || 'Not Available'}</Typography>
                </Box>
                 {/* Add more details as needed */}
            </CardContent>
        </Card>
    </Paper>
);


const SurveyorManagementPage = ({ surveyors, onDataChange }) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSurveyor, setEditingSurveyor] = useState(null);
    const [selectedSurveyor, setSelectedSurveyor] = useState(null);


    const handleAddClick = () => {
        setEditingSurveyor(null);
        setModalOpen(true);
    };

    const handleEditClick = (surveyor) => {
        setEditingSurveyor(surveyor);
        setModalOpen(true);
    };

    const handleDeleteClick = async (surveyorId) => {
        if (window.confirm('Are you sure you want to delete this surveyor?')) {
            try {
                // Example delete logic (uncomment and adapt to your API)
                // const response = await fetch(`http://localhost:3000/api/surveyors/${surveyorId}`, { method: 'DELETE' });
                // if (!response.ok) throw new Error('Failed to delete');
                console.log(`Deleted surveyor: ${surveyorId}`);
                onDataChange(); // Refresh the list from the parent
            } catch (error) {
                console.error("Failed to delete surveyor:", error);
                // Optionally show an alert to the user
            }
        }
    };
    
    const handleSaveSuccess = () => {
        setModalOpen(false);
        if (onDataChange) {
            onDataChange();
        }
    };

    const handleRowClick = (surveyor) => {
        setSelectedSurveyor(surveyor);
    };
    
    const handleBackToList = () => {
        setSelectedSurveyor(null);
    };

    return (
        <Container maxWidth="lg" sx={{ width: '100%' }}>
            {/* --- CHANGE 6: Conditionally render detail view or table view --- */}
            {selectedSurveyor ? (
                <SurveyorDetailView surveyor={selectedSurveyor} onBack={handleBackToList} />
            ) : (
                <>
                    <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h5" component="h1" fontWeight="bold">
                            Surveyor Management
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleAddClick}
                            sx={{
                                background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                                boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                                color: 'white',
                            }}
                        >
                            Add Surveyor
                        </Button>
                    </Paper>

                    {/*
                      IMPORTANT: Your SurveyorTable component must be updated to accept and use an 'onRowClick' prop.
                      Example modification in SurveyorTable.js inside the map function:
                      
                      <TableRow
                        key={surveyor.id}
                        hover
                        onClick={() => onRowClick(surveyor)} // <--- ADD THIS LINE
                        sx={{ cursor: 'pointer' }}
                      >
                        ... table cells ...
                      </TableRow>
                    */}
                    <SurveyorTable 
                        surveyors={surveyors} 
                        onEdit={handleEditClick} 
                        onDelete={handleDeleteClick}
                        onRowClick={handleRowClick} // Pass the click handler to the table
                    />
                </>
            )}

            <SurveyorFormModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveSuccess}
                surveyor={editingSurveyor}
            />
        </Container>
    );
};

export default SurveyorManagementPage;