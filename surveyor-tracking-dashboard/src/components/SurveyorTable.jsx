import React from 'react';
// --- FIX IS HERE: All necessary components are now imported from @mui/material ---
import { 
    Box,
    IconButton,
    Paper,
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow, 
    Tooltip,
    Typography
} from '@mui/material';
// --- END OF FIX ---
import EditIcon from '@mui/icons-material/Edit';
// import DeleteIcon from '@mui/icons-material/Delete';

const SurveyorTable = ({ surveyors, onEdit, onDelete }) => {
    if (!surveyors || surveyors.length === 0) {
        return (
            <Paper sx={{ textAlign: 'center', p: 4, mt: 3 }}>
                <Typography variant="h6">No Surveyors Found</Typography>
                <Typography color="textSecondary">Click the "Add Surveyor" button to get started.</Typography>
            </Paper>
        );
    }

    return (
        <TableContainer component={Paper} elevation={2}>
            <Table sx={{ minWidth: 650 }} aria-label="surveyors table">
                <TableHead sx={{ backgroundColor: '#f4f6f8' }}>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Username</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>City</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Project</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {surveyors.map((surveyor) => (
                        <TableRow
                            key={surveyor.id || surveyor._id}
                            hover
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                            <TableCell component="th" scope="row">{surveyor.id}</TableCell>
                            <TableCell>{surveyor.name}</TableCell>
                            <TableCell>{surveyor.username || 'N/A'}</TableCell>
                            <TableCell>{surveyor.city || 'N/A'}</TableCell>
                            <TableCell>{surveyor.projectName || 'No Project'}</TableCell>
                            <TableCell align="center">
                                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                    <Tooltip title="Edit Surveyor">
                                        <IconButton onClick={() => onEdit(surveyor)} color="warning">
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>
                                    {/* <Tooltip title="Delete Surveyor">
                                        <IconButton onClick={() => onDelete(surveyor.id || surveyor._id)} color="error">
                                            <DeleteIcon /> */}
                                        {/* </IconButton>
                                    </Tooltip> */}
                                </Box>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default SurveyorTable;