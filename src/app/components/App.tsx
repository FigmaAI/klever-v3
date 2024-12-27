import * as React from 'react';
import { CssVarsProvider } from '@mui/joy/styles';
import {
  Typography,
  FormControl,
  FormLabel,
  Input,
  Button,
  Stack,
  Stepper,
  Step,
  StepIndicator,
  Textarea,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  CardActions,
  CardOverflow,
  Box,
  ModalClose,
} from '@mui/joy';
import {
  CheckRounded,
  DesignServicesOutlined,
  AddLinkOutlined,
  PhotoFilterOutlined,
  AutoAwesome,
  FaceRetouchingNatural,
} from '@mui/icons-material';
import { WSMessageType, ServerResponse } from '../../typings/types';
import { Player } from '@lottiefiles/react-lottie-player';
import Animation from '../assets/Animation.json';

const App = () => {
  const [activeStep, setActiveStep] = React.useState(0);
  const [data, setData] = React.useState<ServerResponse | null>(null);
  const [url, setUrl] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [taskDesc, setTaskDesc] = React.useState('');
  const [personaDesc, setPersonaDesc] = React.useState('');
  const [personaModalOpen, setPersonaModalOpen] = React.useState(false);

  const [isLoading, setIsLoading] = React.useState(false);
  const [openModal, setOpenModal] = React.useState(false);

  const handleInit = () => {
    setIsLoading(true);
    
    const socket = new WebSocket('ws://localhost:8080');
    socket.onopen = () => {
        const initMessage = {
            type: WSMessageType.INIT,
            payload: { url, password: password || undefined }
        };
        socket.send(JSON.stringify(initMessage));
    };

    socket.onmessage = (event) => {
        const response = JSON.parse(event.data);
        console.log('Server response:', response);
        
        if (response.status === 'success') {
            setActiveStep(1);
            setIsLoading(false);
        } else {
            console.error('Server error:', response);
            parent.postMessage({
                pluginMessage: { type: 'error', message: response.payload.message }
            }, '*');
            setIsLoading(false);
        }
    };

    socket.onerror = (error: Event) => {
        console.error('WebSocket error:', error);
        parent.postMessage({
            pluginMessage: { type: 'error', message: 'WebSocket connection failed' }
        }, '*');
        setIsLoading(false);
    };
  };

  const handleExplore = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
        parent.postMessage({ 
            pluginMessage: { type: 'explore', taskDesc, personaDesc }
        }, '*');
    } catch (error) {
        console.error('Exploration error:', error);
        parent.postMessage({
            pluginMessage: { type: 'error', message: 'Failed to start exploration' }
        }, '*');
        setIsLoading(false);
    }
  };

  const handleStop = () => {
    try {
        parent.postMessage({ pluginMessage: { type: 'stop-exploration' } }, '*');
    } catch (error) {
        console.error('Stop exploration error:', error);
        parent.postMessage({
            pluginMessage: { type: 'error', message: 'Failed to stop exploration' }
        }, '*');
    }
  };

  const handleStatus = () => {
    try {
        parent.postMessage({ pluginMessage: { type: 'exploration-status' } }, '*');
    } catch (error) {
        console.error('Status check error:', error);
        parent.postMessage({
            pluginMessage: { type: 'error', message: 'Failed to check status' }
        }, '*');
    }
  };

  const handleBack = () => {
    setOpenModal(true);
  };

  const handleConfirmBack = () => {
    try {
        const socket = new WebSocket('ws://localhost:8080');
        socket.onopen = () => {
            const closeMessage = {
                type: WSMessageType.CLOSE,
                payload: { message: "Close browser session" }
            };
            socket.send(JSON.stringify(closeMessage));
        };

        socket.onmessage = (event) => {
            const response = JSON.parse(event.data);
            console.log('Close response:', response);
            
            if (response.status !== 'success') {
                console.error('Close session error:', response);
                parent.postMessage({
                    pluginMessage: { type: 'error', message: response.payload.message }
                }, '*');
            }
        };

        socket.onerror = (error: Event) => {
            console.error('Close session WebSocket error:', error);
            parent.postMessage({
                pluginMessage: { type: 'error', message: 'Failed to close browser session' }
            }, '*');
        };

        handleStop();
        setOpenModal(false);
        setActiveStep(0);
        setUrl('');
        setPassword('');
        setTaskDesc('');
        setPersonaDesc('');
        setData(null);
    } catch (error) {
        console.error('Reset error:', error);
        parent.postMessage({
            pluginMessage: { type: 'error', message: 'Failed to reset application state' }
        }, '*');
    }
  };

  const handleKeyDown = async (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleExplore(e);
    }
  };

  // const sendTestMessage = () => {
  //   const socket = new WebSocket('ws://localhost:8080');
  //   socket.onopen = () => {
  //     const testMessage = {
  //       type: WSMessageType.INIT,
  //       payload: {
  //         message: "Hello from Figma Plugin!"
  //       }
  //     };
  //     socket.send(JSON.stringify(testMessage));
  //     console.log('Test message sent');
  //   };

  //   socket.onmessage = (event) => {
  //     console.log('Received response:', event.data);
  //   };
  // };

  // WebSocket global message handler
  React.useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080');

    socket.onopen = () => {
        console.log('Connected to WebSocket server');
        setIsLoading(false);
    };

    socket.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            console.log('WebSocket message:', message);
            
            switch (message.type) {
                case WSMessageType.SCREENSHOT:
                    setData(message.payload);
                    break;
                case WSMessageType.STATUS_UPDATE:
                    setIsLoading(false);
                    break;
                case WSMessageType.ERROR:
                    console.error('Server error:', message);
                    parent.postMessage({
                        pluginMessage: { type: 'error', message: message.payload.message }
                    }, '*');
                    setIsLoading(false);
                    break;
            }
        } catch (error) {
            console.error('Message parsing error:', error);
            parent.postMessage({
                pluginMessage: { type: 'error', message: 'Failed to process server message' }
            }, '*');
        }
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        parent.postMessage({
            pluginMessage: { type: 'error', message: 'WebSocket connection error' }
        }, '*');
        setIsLoading(false);
    };

    socket.onclose = () => {
        console.log('WebSocket connection closed');
        setIsLoading(false);
    };

    return () => {
        socket.close();
    };
  }, []);

  React.useEffect(() => {
    console.log('Active step changed:', activeStep);
  }, [activeStep]);

  return (
    <CssVarsProvider>
      <Box sx={{ maxWidth: 600, mx: 'auto', px: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Stepper orientation="vertical" key={activeStep}>
          <Step
            active={activeStep === 0}
            completed={activeStep > 0}
            indicator={
              <StepIndicator variant={activeStep === 0 ? 'solid' : 'soft'} color="primary">
                {activeStep > 0 ? <CheckRounded /> : <AddLinkOutlined />}
              </StepIndicator>
            }
          >
            <Typography level="title-md">Step 1</Typography>

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
                  <Button color="neutral" variant="plain" onClick={handleBack} disabled={isLoading} size="sm">
                    Reset
                  </Button>
                </Box>
              </CardOverflow>
              {activeStep === 0 && (
                <>
                  <CardContent>
                    <FormControl>
                      <FormLabel>Figma Prototype URL</FormLabel>
                      <Input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Enter the Figma Prototype URL"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <br />
                    <FormControl>
                      <FormLabel>Password (optional)</FormLabel>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter the password if required"
                        disabled={isLoading}
                      />
                    </FormControl>
                  </CardContent>
                  <CardActions>
                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                      <Button size="sm" onClick={handleInit} loading={isLoading} disabled={!url || isLoading}>
                        Initialize
                      </Button>
                    </Box>
                  </CardActions>
                </>
              )}
            </Card>
          </Step>
          <Step
            active={activeStep === 1}
            completed={activeStep > 1}
            indicator={
              <StepIndicator variant={activeStep === 1 ? 'solid' : 'soft'} color="primary">
                {activeStep > 1 ? <CheckRounded /> : <DesignServicesOutlined />}
              </StepIndicator>
            }
          >
            <Typography level="title-md">Step 2</Typography>

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
                    Task and Persona
                  </Typography>
                  <Button color="neutral" variant="plain" onClick={handleBack} disabled={isLoading} size="sm">
                    Reset
                  </Button>
                </Box>
              </CardOverflow>
              {activeStep === 1 && (
                <>
                  <CardContent>
                    <Textarea
                      placeholder="Please enter the description of the task you want to test"
                      disabled={isLoading}
                      value={taskDesc}
                      onChange={(e) => setTaskDesc(e.target.value)}
                      onKeyDown={handleKeyDown}
                      minRows={2}
                      maxRows={6}
                      size="md"
                      sx={{ minHeight: 240 }}
                      required
                      endDecorator={
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 'var(--Textarea-paddingBlock)',
                            pt: 'var(--Textarea-paddingBlock)',
                            borderTop: '1px solid',
                            borderColor: 'divider',
                            flex: 'auto',
                          }}
                        >
                          <Button
                            variant="plain"
                            color="neutral"
                            onClick={() => setPersonaModalOpen(true)}
                            startDecorator={<FaceRetouchingNatural fontSize="small" />}
                          >
                            {/* if persona is empty, Button label is "Persona". If set use persona text and truncate the text */}
                            {personaDesc
                              ? personaDesc.length > 12
                                ? `${personaDesc.slice(0, 12)}...`
                                : personaDesc
                              : 'Persona'}
                          </Button>
                          <Button
                            color="primary"
                            variant="solid"
                            onClick={handleExplore}
                            disabled={!taskDesc || isLoading}
                            loading={isLoading}
                            loadingIndicator="Loading…"
                            startDecorator={<AutoAwesome fontSize="small" />}
                            size="sm"
                            sx={{ ml: 'auto' }}
                          >
                            Submit
                          </Button>
                        </Box>
                      }
                    />
                  </CardContent>
                </>
              )}
            </Card>
          </Step>
          <Step
            active={activeStep === 2}
            completed={activeStep > 2}
            indicator={
              <StepIndicator variant={activeStep === 2 ? 'solid' : 'soft'} color="primary">
                {activeStep > 2 ? <CheckRounded /> : <PhotoFilterOutlined />}
              </StepIndicator>
            }
          >
            <Typography level="title-md">Step 3</Typography>

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
                  <Button color="neutral" variant="plain" onClick={handleBack} disabled={isLoading} size="sm">
                    Reset
                  </Button>
                </Box>
              </CardOverflow>

              {activeStep === 2 && (
                <>
                  <CardContent>
                    {data ? (
                      <>
                        <Player autoplay loop src={Animation} style={{ height: '160px', width: '160px' }} />
                        <Typography
                          component="pre"
                          level="body-sm"
                          color="neutral"
                          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}
                        >
                          {data.message}
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Player autoplay loop src={Animation} style={{ height: '160px', width: '160px' }} />
                        <Typography component="pre" level="body-sm">
                          &nbsp;
                        </Typography>
                      </>
                    )}
                    <br />
                    <Button color="neutral" variant="outlined" onClick={handleStatus} sx={{ margin: 'auto', borderRadius: '16px' }}>
                      Check Status
                    </Button>
                  </CardContent>
                </>
              )}
            </Card>
          </Step>
        </Stepper>

        <Modal open={openModal} onClose={() => setOpenModal(false)}>
          <ModalDialog>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogContent>Stop the current exploration, and return to the initial step?</DialogContent>
            <DialogActions>
              <Button variant="solid" color="danger" onClick={handleConfirmBack}>
                Confirm
              </Button>
              <Button variant="plain" color="neutral" onClick={() => setOpenModal(false)}>
                Cancel
              </Button>
            </DialogActions>
          </ModalDialog>
        </Modal>
        <Modal open={personaModalOpen} onClose={() => setPersonaModalOpen(false)}>
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
                  onChange={(e) => setPersonaDesc(e.target.value)}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button
                color="primary"
                variant="soft"
                onClick={() => {
                  setPersonaModalOpen(false);
                }}
              >
                Set Persona
              </Button>
              <Button
                variant="plain"
                color="neutral"
                onClick={() => {
                  setPersonaDesc('');
                  setPersonaModalOpen(false);
                }}
              >
                Reset
              </Button>
            </DialogActions>
          </ModalDialog>
        </Modal>
      </Box>
    </CssVarsProvider>
  );
};

export default App;
