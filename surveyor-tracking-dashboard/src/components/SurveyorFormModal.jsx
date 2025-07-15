import React, { useState, useEffect } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    IconButton,
    InputAdornment,
    Typography,
    Box,
    CircularProgress,
    createTheme, // To create a custom theme
    ThemeProvider, // To apply the theme
    styled // To create custom styled components
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

// --- 1. DEFINE A CUSTOM THEME FOR THE MODAL ---
// This will change the default blue color to our new orange theme.
const dialogTheme = createTheme({
    palette: {
        primary: {
            main: '#F77062', // A nice orange from the gradient
            light: '#FF8E53',
            dark: '#FE6B8B',
            contrastText: '#ffffff',
        },
    },
});

// --- 2. CREATE A CUSTOM, ELEGANT TEXT FIELD ---
const StyledTextField = styled(TextField)(({ theme }) => ({
    '& .MuiOutlinedInput-root': {
        borderRadius: '8px', // Softer corners
        backgroundColor: '#f8f9fa', // Subtle background for the input
        '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.light, // Brighter orange on hover
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main, // Main orange when focused
            borderWidth: '2px',
        },
    },
    '& .MuiInputLabel-outlined': {
        color: '#FF8E53', // A softer label color
        '&.Mui-focused': {
            color: theme.palette.primary.main, // Label turns orange when focused
        },
    },
}));

// --- 3. CREATE THE GRADIENT BORDER BUTTON FOR "CANCEL" ---
const GradientBorderButton = styled(Button)(({ theme }) => ({
    position: 'relative',
    padding: '8px 24px',
    border: '2px solid transparent',
    backgroundClip: 'padding-box',
    borderRadius: '50px', // Pill shape
    color: theme.palette.primary.dark,
    fontWeight: 'bold',
    '&:before': {
        content: '""',
        position: 'absolute',
        top: 0, right: 0, bottom: 0, left: 0,
        zIndex: -1,
        margin: '-2px', // Make the gradient bleed outside the border
        borderRadius: 'inherit',
        background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
    },
}));


const SurveyorFormModal = ({ open, onClose, onSave, surveyor }) => {
    const isEditing = surveyor !== null;
    const initialFormState = { id: '', name: '', city: '', projectName: '', username: '', password: '' };
    
    const [form, setForm] = useState(initialFormState);
    const [showPassword, setShowPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

   useEffect(() => {
        if (open) {
            if (isEditing) {
                setForm({ ...surveyor, password: '' });
            } else {
                setForm(initialFormState);
            }
            setError('');
            setIsSaving(false);
        }
    }, [open, surveyor, isEditing]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!form.id || !form.name || !form.username) {
            setError('ID, Name, and Username are required fields.');
            return;
        }

        setIsSaving(true);
        setError('');

        const method = isEditing ? 'PUT' : 'POST';
        const endpoint = isEditing 
            ? `http://localhost:3000/api/surveyors/${surveyor.id || surveyor._id}` 
            : `http://localhost:3000/api/surveyors`;
        
        const body = { ...form };
        if (isEditing && !body.password) {
            delete body.password;
        }

        try {
            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Failed to save surveyor.');
            }
            onSave();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };


    return (
        // --- 4. APPLY THE THEME TO THE ENTIRE DIALOG ---
        <ThemeProvider theme={dialogTheme}>
            <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" component="form" onSubmit={handleSubmit} PaperProps={{ sx: { borderRadius: '16px' } }}>
                <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1.5rem', pb: 1 }}>
                    {isEditing ? 'Edit Surveyor' : 'Add New Surveyor'}
                </DialogTitle>
                <DialogContent>
                    {error && <Typography color="error" sx={{ mb: 2, fontWeight: '500' }}>{error}</Typography>}
                    
                    {/* --- 5. USE OUR NEW STYLED TEXT FIELDS --- */}
                    <StyledTextField label="ID " name="id" value={form.id} onChange={handleChange} fullWidth margin="normal" required disabled={isEditing} />
                    <StyledTextField label="Name " name="name" value={form.name} onChange={handleChange} fullWidth margin="normal" required />
                    <StyledTextField label="City" name="city" value={form.city} onChange={handleChange} fullWidth margin="normal" />
                    <StyledTextField label="Project" name="projectName" value={form.projectName} onChange={handleChange} fullWidth margin="normal" />
                    
                    <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 'bold', color: '#495057' }}>
                        Authentication Details
                    </Typography>
                    <StyledTextField label="Username " name="username" value={form.username} onChange={handleChange} fullWidth margin="normal" required />
                    <StyledTextField
                        label={isEditing ? 'New Password' : 'Password'}
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                        placeholder={isEditing ? 'Leave blank to keep current' : ''}
                        required={!isEditing}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: '16px 24px' }}>
                    {/* --- 6. USE OUR NEW GRADIENT BORDER BUTTON --- */}
                    <GradientBorderButton onClick={onClose} disabled={isSaving}>
                        Cancel
                    </GradientBorderButton>
                    <Box sx={{ position: 'relative', ml: 1 }}>
                        <Button 
                            type="submit" 
                            variant="contained" 
                            disabled={isSaving}
                            sx={{
                                background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                                borderRadius: '50px', // Pill shape
                                boxShadow: '0 4px 10px 0 rgba(255, 105, 135, .3)',
                                color: 'white',
                                fontWeight: 'bold',
                                padding: '10px 26px',
                            }}
                        >
                            Save
                        </Button>
                        {isSaving && <CircularProgress size={24} sx={{ position: 'absolute', top: '50%', left: '50%', mt: '-12px', ml: '-12px' }} />}
                    </Box>
                </DialogActions>
            </Dialog>
        </ThemeProvider>
    );
};

export default SurveyorFormModal;