import * as React from 'react';
import {
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/joy';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  content?: string;
}

export const ConfirmModal = ({ 
  open, 
  onClose, 
  onConfirm, 
  title = "Confirm Action",
  content = "Are you sure you want to proceed?"
}: ConfirmModalProps) => (
  <Modal open={open} onClose={onClose}>
    <ModalDialog>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{content}</DialogContent>
      <DialogActions>
        <Button variant="solid" color="danger" onClick={onConfirm}>
          Confirm
        </Button>
        <Button variant="plain" color="neutral" onClick={onClose}>
          Cancel
        </Button>
      </DialogActions>
    </ModalDialog>
  </Modal>
); 