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
import { Player } from '@lottiefiles/react-lottie-player';
import Animation from '../assets/Animation.json';
import { handlePluginError } from '../../utils/messageHandlers';

const App = () => {
  const [activeStep, setActiveStep] = React.useState(0);
  const [url, setUrl] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [taskDesc, setTaskDesc] = React.useState('');
  const [openModal, setOpenModal] = React.useState(false);
  const [personaModalOpen, setPersonaModalOpen] = React.useState(false);
  const [personaDesc, setPersonaDesc] = React.useState('');
  const [data, setData] = React.useState<any>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const ws = React.useRef<WebSocket | null>(null);
  const [targetNodeId, setTargetNodeId] = React.useState<string>('');

  // targetNodeId 변경 모니터링
  React.useEffect(() => {
    console.log('Current target node ID:', targetNodeId);
  }, [targetNodeId]);

  React.useEffect(() => {
    // WebSocket 연결 설정
    ws.current = new WebSocket('ws://localhost:8080');

    ws.current.onmessage = (event) => {
      const response = JSON.parse(event.data);
      console.log('WebSocket response:', response); // 디버깅용

      if (response.type === 'INIT') {
        setIsConnecting(false);  // 연결 상태 해제

        if (response.status === 'success') {
          console.log('Setting target node ID to:', response.payload.nodeId);
          setTargetNodeId(response.payload.nodeId);
          setActiveStep(1);  // 다음 단계로 이동
          // 필요한 데이터 저장
          setData(response.payload);
          console.log('Data:', response.payload);
        } else {
          // 에러 처리
          handlePluginError(response.payload.message || 'Initialization failed');
        }
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnecting(false);
      handlePluginError('WebSocket connection error');
    };

    // 플러그인으로부터의 메시지 처리
    window.onmessage = (event) => {
      if (event.data.pluginMessage) {
        const msg = event.data.pluginMessage;
        if (msg.type === 'websocket-send' && ws.current) {
          ws.current.send(JSON.stringify(msg.data));
        } else if (msg.type === 'websocket-close' && ws.current) {
          ws.current.close();
        }
      }
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const handleInit = async () => {
    if (isConnecting) return;

    const nodeIdMatch = url.match(/node-id=([^&]+)/);
    if (!nodeIdMatch) {
      handlePluginError('Failed to extract node ID from URL');
      return;
    }

    const matchedNodeId = decodeURIComponent(nodeIdMatch[1]);

    setIsConnecting(true);

    // 플러그인으로 메시지 전송
    parent.postMessage({
      pluginMessage: {
        type: 'init',
        url: url,
        password: password,
        nodeId: matchedNodeId
      }
    }, '*');
  };

  const handleExplore = () => {
    setIsConnecting(true);
    parent.postMessage({
      pluginMessage: {
        type: 'request-screenshot'
      }
    }, '*');
  };

  const handleBack = () => {
    setOpenModal(true);
  };

  const handleConfirmBack = () => {
    try {
      if (ws.current) {
        ws.current.send(JSON.stringify({
          type: 'CLOSE',
          payload: {}
        }));
      }
      resetState();
    } catch (error) {
      console.error('Failed to reset:', error);
      handlePluginError('Failed to reset application state');
    }
  };

  const resetState = () => {
    setOpenModal(false);
    setActiveStep(0);
    setUrl('');
    setPassword('');
    setIsConnecting(false);
    setData(null);
    setTargetNodeId('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleExplore();
    }
  };

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
                  <Button color="neutral" variant="plain" onClick={handleBack} disabled={isConnecting} size="sm">
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
                        disabled={isConnecting}
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
                        disabled={isConnecting}
                      />
                    </FormControl>
                  </CardContent>
                  <CardActions>
                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                      <Button size="sm" onClick={handleInit} loading={isConnecting} disabled={!url || isConnecting}>
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
                  <Button color="neutral" variant="plain" onClick={handleBack} disabled={isConnecting} size="sm">
                    Reset
                  </Button>
                </Box>
              </CardOverflow>
              {activeStep === 1 && (
                <>
                  <CardContent>
                    <Textarea
                      placeholder="Please enter the description of the task you want to test"
                      disabled={isConnecting}
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
                            variant="solid"
                            onClick={handleExplore}
                            disabled={!taskDesc || isConnecting}
                            loading={isConnecting}
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
                  <Button color="neutral" variant="plain" onClick={handleBack} disabled={isConnecting} size="sm">
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
