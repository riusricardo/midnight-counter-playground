import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { type Dayjs } from 'dayjs';

export interface CredentialSubjectFormData {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: Dayjs | null;
}

export interface CredentialSubjectData {
  id: Uint8Array;
  first_name: Uint8Array;
  last_name: Uint8Array;
  birth_timestamp: bigint;
}

interface AgeVerificationFormProps {
  onSubmit: (credentialData: CredentialSubjectData) => Promise<void>;
  isLoading?: boolean;
  error?: Error | null;
}

// Helper function to convert string to Uint8Array with padding
const stringToUint8Array = (str: string, length: number = 32): Uint8Array => {
  const encoder = new TextEncoder();
  const utf8Bytes = encoder.encode(str);

  if (utf8Bytes.length > length) {
    throw new Error(`String "${str}" is too long. Maximum length is ${length} bytes.`);
  }

  const paddedArray = new Uint8Array(length);
  paddedArray.set(utf8Bytes);
  return paddedArray;
};

// Helper function to generate a dummy ID based on user input
const generateUserIdFromName = (firstName: string, lastName: string): Uint8Array => {
  const combinedName = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;
  return stringToUint8Array(combinedName, 32);
};

export const AgeVerificationForm: React.FC<AgeVerificationFormProps> = ({ onSubmit, isLoading = false, error }) => {
  const [formData, setFormData] = useState<CredentialSubjectFormData>({
    id: '',
    firstName: '',
    lastName: '',
    birthDate: null,
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!formData.birthDate) {
      errors.birthDate = 'Birth date is required';
    } else {
      const age = dayjs().diff(formData.birthDate, 'year');
      if (age < 18) {
        errors.birthDate = 'You must be at least 18 years old to use this service';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const credentialData: CredentialSubjectData = {
        id: generateUserIdFromName(formData.firstName, formData.lastName),
        first_name: stringToUint8Array(formData.firstName, 32),
        last_name: stringToUint8Array(formData.lastName, 32),
        birth_timestamp: BigInt(formData.birthDate!.valueOf()),
      };

      await onSubmit(credentialData);
    } catch (err) {
      console.error('Error submitting age verification:', err);
    }
  };

  const calculateAge = (): number | null => {
    if (!formData.birthDate) return null;
    return dayjs().diff(formData.birthDate, 'year');
  };

  const age = calculateAge();

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Paper elevation={2} sx={{ p: 3, maxWidth: 500, mx: 'auto' }}>
        <Typography variant="h5" gutterBottom>
          Age Verification Required
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Please provide your information to verify that you are at least 18 years old before using the counter.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="First Name"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            error={!!validationErrors.firstName}
            helperText={validationErrors.firstName}
            margin="normal"
            required
            disabled={isLoading}
          />

          <TextField
            fullWidth
            label="Last Name"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            error={!!validationErrors.lastName}
            helperText={validationErrors.lastName}
            margin="normal"
            required
            disabled={isLoading}
          />

          <DatePicker
            label="Birth Date"
            value={formData.birthDate}
            onChange={(newValue) => setFormData({ ...formData, birthDate: newValue })}
            slotProps={{
              textField: {
                fullWidth: true,
                margin: 'normal',
                required: true,
                error: !!validationErrors.birthDate,
                helperText: validationErrors.birthDate,
                disabled: isLoading,
              },
            }}
            maxDate={dayjs().subtract(18, 'year')}
          />

          {age !== null && (
            <Typography
              variant="body2"
              sx={{
                mt: 1,
                mb: 2,
                color: age >= 18 ? 'success.main' : 'error.main',
              }}
            >
              Age: {age} years {age >= 18 ? '✓' : '(Must be 18 or older)'}
            </Typography>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 2 }}
            disabled={isLoading || !formData.firstName || !formData.lastName || !formData.birthDate}
          >
            {isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                Verifying...
              </Box>
            ) : (
              'Verify Age and Continue'
            )}
          </Button>
        </Box>
      </Paper>
    </LocalizationProvider>
  );
};
