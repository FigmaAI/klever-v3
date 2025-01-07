import * as React from 'react';
import { 
  Typography, 
  Card, 
  CardContent, 
  CardOverflow,
  Button,
  Box
} from '@mui/joy';
import { Player } from '@lottiefiles/react-lottie-player';
import Animation from '../../assets/Animation.json';

interface ReportStepProps {
  isInterviewing: boolean;
  loadingMessage: string;
  onBack: () => void;
  onReset: () => void;
}

export const ReportStep = ({
  isInterviewing,
  loadingMessage,
  onBack,
  onReset
}: ReportStepProps) => (
  <Card variant="outlined" sx={{ backgroundColor: 'white' }}>
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
          Generating Report
        </Typography>
        <Button color="neutral" variant="plain" onClick={onBack} size="sm">
          Reset
        </Button>
      </Box>
    </CardOverflow>

    <CardContent>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Player
          autoplay
          loop
          src={Animation}
          style={{ height: '200px', width: '200px' }}
        />
        <Typography level="body-md">{loadingMessage}</Typography>
        {isInterviewing && (
          <Button
            color="danger"
            variant="solid"
            onClick={onReset}
            sx={{ mt: 2 }}
          >
            Stop Interview
          </Button>
        )}
      </Box>
    </CardContent>
  </Card>
); 