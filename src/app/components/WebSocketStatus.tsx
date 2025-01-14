import * as React from 'react';
import { Chip, Tooltip } from '@mui/joy';
import { WifiRounded, WifiOffRounded } from '@mui/icons-material';

interface WebSocketStatusProps {
  isConnected: boolean;
  onReconnect: () => void;
}

const WebSocketStatus: React.FC<WebSocketStatusProps> = ({ isConnected, onReconnect }) => {
  return (
    <Tooltip
      title={isConnected ? "WebSocket Connected" : "WebSocket Disconnected - Click to reconnect"}
      variant="soft"
    >
      <Chip
        variant="outlined"
        color={isConnected ? "success" : "danger"}
        onClick={!isConnected ? onReconnect : undefined}
        startDecorator={isConnected ? <WifiRounded /> : <WifiOffRounded />}
        sx={{ 
          cursor: !isConnected ? 'pointer' : 'default',
          '--Chip-radius': '8px',
          '--Chip-paddingInline': '12px',
        }}
      >
        {isConnected ? "Connected" : "Disconnected"}
      </Chip>
    </Tooltip>
  );
};

export default WebSocketStatus; 