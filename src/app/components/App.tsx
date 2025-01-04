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
  IconButton,
  Link,
} from '@mui/joy';
import {
  CheckRounded,
  DesignServicesOutlined,
  AddLinkOutlined,
  PhotoFilterOutlined,
  AutoAwesome,
  FaceRetouchingNatural,
  Delete,
  Key,
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
  const [apiKeyModalOpen, setApiKeyModalOpen] = React.useState(false);
  const [apiKey, setApiKey] = React.useState('');
  const [currentApiKey, setCurrentApiKey] = React.useState<string>('');
  const ws = React.useRef<WebSocket | null>(null);
  const [currentRound, setCurrentRound] = React.useState(1);


  React.useEffect(() => {
    // API 키 상태 초기화
    parent.postMessage({ pluginMessage: { type: 'getCurrentApiKey' } }, '*');

    // WebSocket 연결 설정
    ws.current = new WebSocket('ws://localhost:8080');

    // WebSocket 연결 상태 확인
    ws.current.onopen = () => {
      console.log('WebSocket connected');
    };

    // WebSocket 메시지 수신 처리
    ws.current.onmessage = (event) => {
      const response = JSON.parse(event.data);
      console.log('WebSocket response:', response);

      if (response.type === 'INIT') {
        setIsConnecting(false);
        if (response.status === 'success') {
          setActiveStep(1);
          setData(response.payload);
        } else {
          handlePluginError(response.payload.message || 'Initialization failed');
        }
      }
    };

    // WebSocket 에러 처리
    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnecting(false);
      handlePluginError('WebSocket connection error');
    };

    // 플러그인으로부터의 메시지 처리
    window.onmessage = (event) => {
      if (event.data.pluginMessage) {
        const msg = event.data.pluginMessage;
        if (msg.type === 'currentApiKey') {
          console.log('Setting current API key:', msg.message); // 디버깅 로그 추가
          setCurrentApiKey(msg.message);
        } else if (msg.type === 'websocket-send' && ws.current) {
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
    setIsConnecting(true);

    parent.postMessage({
      pluginMessage: {
        type: 'init',
        url: url,
        password: password
      }
    }, '*');
  };

  const handleExplore = async () => {
    if (!ws.current) return;
    setIsConnecting(true);

    try {
      ws.current.send(JSON.stringify({
        type: 'GET_SCREENSHOT',
        payload: {
          prefix: `${currentRound}_before`,
          round: currentRound
        }
      }));

      const handleScreenshotResponse = (event: MessageEvent) => {
        const response = JSON.parse(event.data);

        if (response.type === 'GET_SCREENSHOT') {
          ws.current?.removeEventListener('message', handleScreenshotResponse);

          if (response.status === 'success') {
            parent.postMessage({
              pluginMessage: {
                type: 'submit',
                data: {
                  taskData: {
                    taskDesc,
                    personaDesc
                  },
                  screenshotInfo: {
                    nodeId: response.payload.nodeId,
                    imageData: response.payload.imageData,
                    round: currentRound
                  }
                }
              }
            }, '*');
          } else {
            handlePluginError(response.payload.message || 'Screenshot capture failed');
            setIsConnecting(false);
          }
        }
      };

      ws.current.addEventListener('message', handleScreenshotResponse);
    } catch (error) {
      console.error('Error in handleExplore:', error);
      handlePluginError('Failed to process exploration');
      setIsConnecting(false);
    }
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
    setCurrentRound(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleExplore();
    }
  };

  // API 키 관리 함수들
  const handleApiKeySubmit = () => {
    if (apiKey.trim() !== '') {
      parent.postMessage({ pluginMessage: { type: 'saveApiKey', data: apiKey } }, '*');
      setApiKeyModalOpen(false);
      setApiKey('');
    }
  };

  const handleApiKeyDelete = () => {
    parent.postMessage({ pluginMessage: { type: 'deleteApiKey' } }, '*');
    setApiKey('');
    setCurrentApiKey('');
  };

  // API 키 모달 열 때 현재 키 값으로 초기화
  const handleOpenApiKeyModal = () => {
    setApiKey(currentApiKey); // 현재 API 키로 초기화
    setApiKeyModalOpen(true);
  };

  // 모달 닫을 때 초기화
  const handleCloseApiKeyModal = () => {
    setApiKeyModalOpen(false);
    setApiKey(''); // 입력 필드 초기화
  };

  return (
    <CssVarsProvider>
      <Box sx={{ maxWidth: 600, mx: 'auto', px: 2 }}>
        {/* Settings Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="outlined"
            color="neutral"
            onClick={handleOpenApiKeyModal}
            startDecorator={<Key />}
            size="sm"
          >
            {currentApiKey ? 'Manage API Key' : 'Set API Key'}
          </Button>
        </Box>

        {!currentApiKey ? (
          <Card variant="outlined">
            <CardContent>
              <Typography level="h2" sx={{ mb: 2 }}>
                OpenAI API Key Required
              </Typography>
              <Typography level="body-md" sx={{ mb: 2 }}>
                To use Figma Client, you need an OpenAI API key with a minimum of $5 credit balance. Here's how to get started:
              </Typography>
              <Stack spacing={2}>
                <Typography level="body-sm">
                  1. Visit the <Link href="https://platform.openai.com/signup" target="_blank">OpenAI Platform</Link>
                </Typography>
                <Typography level="body-sm">
                  2. Create an account or sign in
                </Typography>
                <Typography level="body-sm">
                  3. Go to <Link href="https://platform.openai.com/settings/organization/billing/overview" target="_blank">Billing settings</Link>
                </Typography>
                <Typography level="body-sm">
                  4. Add a payment method and purchase at least $5 in credits
                </Typography>
                <Typography level="body-sm">
                  5. Generate an API key from the <Link href="https://platform.openai.com/api-keys" target="_blank">API keys page</Link>
                </Typography>
              </Stack>
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="solid"
                  color="primary"
                  onClick={() => setApiKeyModalOpen(true)}
                  startDecorator={<Key />}
                >
                  Set API Key
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : (
          // API 키가 있을 때 보여줄 Stepper
          <Stepper orientation="vertical">
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
                        placeholder="Enter task description"
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
                              size="sm"
                            >
                              {personaDesc ? 'Edit Persona' : 'Set Persona'}
                            </Button>

                            <Button
                              variant="solid"
                              onClick={handleExplore}
                              disabled={!taskDesc}
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
        )}

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
                startDecorator={<FaceRetouchingNatural fontSize="small" />}
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
        <Modal open={apiKeyModalOpen} onClose={handleCloseApiKeyModal}>
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
                  onChange={(e) => setApiKey(e.target.value)}
                  endDecorator={
                    currentApiKey && (
                      <IconButton
                        onClick={handleApiKeyDelete}
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
                onClick={handleApiKeySubmit}
                disabled={!apiKey.trim()}
              >
                {currentApiKey === apiKey ? 'Close' : 'Save Key'}
              </Button>
              <Button
                variant="plain"
                color="neutral"
                onClick={handleCloseApiKeyModal}
              >
                Cancel
              </Button>
            </DialogActions>
          </ModalDialog>
        </Modal>
      </Box>
    </CssVarsProvider>
  );
};

export default App;
