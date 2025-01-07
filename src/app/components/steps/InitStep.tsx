import * as React from 'react';
import { 
  Typography, 
  Card, 
  CardContent, 
  CardActions, 
  CardOverflow,
  FormControl,
  FormLabel,
  Input,
  Button,
  Box
} from '@mui/joy';

interface InitStepProps {
  url: string;
  password: string;
  isConnecting: boolean;
  onUrlChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onInit: () => void;
  onBack: () => void;
}

export const InitStep = ({
  url,
  password,
  isConnecting,
  onUrlChange,
  onPasswordChange,
  onInit,
  onBack
}: InitStepProps) => (
  <Card variant="outlined">
    <CardOverflow
      variant="soft"
      color="primary"
      sx={{
        justifyContent: 'center',
        letterSpacing: '1px',
        padding: '0.5rem 1rem',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontSize: 'xs', fontWeight: 'xl', textTransform: 'uppercase' }}>
          Initialize
        </Typography>
        <Button color="neutral" variant="plain" onClick={onBack} disabled={isConnecting} size="sm">
          Reset
        </Button>
      </Box>
    </CardOverflow>

    <CardContent>
      <FormControl>
        <FormLabel>Figma Prototype URL</FormLabel>
        <Input
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="Enter the Figma Prototype URL"
          disabled={isConnecting}
        />
      </FormControl>
      <br />
      <FormControl>
        <FormLabel>Password (optional)</FormLabel>
        <Input
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="Enter the password if required"
          disabled={isConnecting}
        />
      </FormControl>
    </CardContent>
    <CardActions>
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button 
          size="sm" 
          onClick={onInit} 
          loading={isConnecting} 
          disabled={!url || isConnecting}
        >
          Initialize
        </Button>
      </Box>
    </CardActions>
  </Card>
); 