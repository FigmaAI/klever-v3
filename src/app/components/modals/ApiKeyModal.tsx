import * as React from 'react';
import {
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Input,
  IconButton
} from '@mui/joy';
import { Delete } from '@mui/icons-material';

interface ApiKeyModalProps {
  open: boolean;
  apiKey: string;
  currentApiKey: string;
  onClose: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onDelete: () => void;
}

export const ApiKeyModal = ({
  open,
  apiKey,
  currentApiKey,
  onClose,
  onChange,
  onSubmit,
  onDelete
}: ApiKeyModalProps) => (
  <Modal open={open} onClose={onClose}>
    <ModalDialog>
      <DialogTitle>API Key Management</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography level="body-sm">
            {currentApiKey
              ? 'Your API key is set. You can update or delete it.'
              : 'Enter your OpenAI API key to get started.'}
          </Typography>
          <Input
            placeholder="Enter OpenAI API Key"
            value={apiKey}
            onChange={(e) => onChange(e.target.value)}
            endDecorator={
              currentApiKey && (
                <IconButton
                  onClick={onDelete}
                  color="danger"
                  variant="plain"
                  size="sm"
                >
                  <Delete />
                </IconButton>
              )
            }
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          color="primary"
          variant="solid"
          onClick={onSubmit}
          disabled={!apiKey.trim()}
        >
          {currentApiKey === apiKey ? 'Close' : 'Save Key'}
        </Button>
        <Button
          variant="plain"
          color="neutral"
          onClick={onClose}
        >
          Cancel
        </Button>
      </DialogActions>
    </ModalDialog>
  </Modal>
); 