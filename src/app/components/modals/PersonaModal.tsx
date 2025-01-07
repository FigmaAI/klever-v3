import * as React from 'react';
import {
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Textarea,
  ModalClose
} from '@mui/joy';
import { FaceRetouchingNatural } from '@mui/icons-material';

interface PersonaModalProps {
  open: boolean;
  personaDesc: string;
  onClose: () => void;
  onChange: (value: string) => void;
  onReset: () => void;
}

export const PersonaModal = ({
  open,
  personaDesc,
  onClose,
  onChange,
  onReset
}: PersonaModalProps) => (
  <Modal open={open} onClose={onClose}>
    <ModalDialog layout="fullscreen">
      <ModalClose />
      <DialogTitle>Create Persona</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Textarea
            placeholder="(Optional) Please enter the description of the user persona you'd like me to emulate : "
            autoFocus
            value={personaDesc}
            minRows={3}
            maxRows={6}
            onChange={(e) => onChange(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          color="primary"
          variant="soft"
          onClick={onClose}
          startDecorator={<FaceRetouchingNatural fontSize="small" />}
        >
          Set Persona
        </Button>
        <Button
          variant="plain"
          color="neutral"
          onClick={onReset}
        >
          Reset
        </Button>
      </DialogActions>
    </ModalDialog>
  </Modal>
); 