import * as React from 'react';
import { CssVarsProvider } from '@mui/joy/styles';
import {
  Typography,
  Button,
  Stepper,
  Step,
  StepIndicator,
  Box
} from '@mui/joy';
import {
  DesignServicesOutlined,
  AddLinkOutlined,
  PhotoFilterOutlined,
  Key
} from '@mui/icons-material';
import { handlePluginError } from '../../utils/messageHandlers';
import { WSMessage, InitResponse, WSMessageType, ScreenshotInfo, TaskData, UIElement, ErrorPayload, PreviewFramesResult, ReflectionFramesResult } from '../../typings/types';
import { ApiKeyCard, InitStep, TaskStep, ReportStep } from './steps';
import { ConfirmModal, PersonaModal, ApiKeyModal } from './modals';
import { createPromptForTask, AIModel, parseExploreRsp, createPromptForReflection } from '../../plugin';
import { parseAction, parseReflectRsp } from '../../plugin/FigmaUtils';


const App = () => {
  const [activeStep, setActiveStep] = React.useState(0);
  const [data, setData] = React.useState<InitResponse | null>(null);
  const dataRef = React.useRef<InitResponse | null>(null);
  const [url, setUrl] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [taskDesc, setTaskDesc] = React.useState('');
  const [confirmResetModalOpen, setConfirmResetModalOpen] = React.useState(false);
  const [confirmStopModalOpen, setConfirmStopModalOpen] = React.useState(false);
  const [personaModalOpen, setPersonaModalOpen] = React.useState(false);
  const [personaDesc, setPersonaDesc] = React.useState('');
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = React.useState(false);
  const [apiKey, setApiKey] = React.useState('');
  const [currentApiKey, setCurrentApiKey] = React.useState<string>('');
  const [loadingMessage, setLoadingMessage] = React.useState<string>('');
  const [isInterviewing, setIsInterviewing] = React.useState(false);
  const ws = React.useRef<WebSocket | null>(null);
  const [modelInstance, setModelInstance] = React.useState<AIModel | null>(null);
  const nodeElemListCache = React.useRef<Map<string, UIElement[]>>(new Map());

  React.useEffect(() => {
    dataRef.current = data;
  }, [data]);

  React.useEffect(() => {
    if (!currentApiKey) {
      parent.postMessage({ pluginMessage: { type: 'getCurrentApiKey' } }, '*');
    } else {
      parent.postMessage({ pluginMessage: { type: 'get-model-instance' } }, '*');
    }
  }, [currentApiKey]);

  React.useEffect(() => {
    // WebSocket 연결 설정
    ws.current = new WebSocket('ws://localhost:8080');

    // WebSocket 연결 상태 확인
    ws.current.onopen = () => {
      console.log('WebSocket connected');
    };

    // 플러그인 메시지 처리
    const handlePluginMessage = (event) => {
      if (event.data.pluginMessage) {
        const msg = event.data.pluginMessage;

        if (msg.type === 'currentApiKey') {
          setCurrentApiKey(msg.message);
        } else if (msg.type === 'model-instance-created') {
          console.log('Creating model instance with config:', msg.payload);
          const model = new AIModel(msg.payload);  // AIModel 인스턴스 직접 생성
          setModelInstance(model);
          console.log('Model instance created:', model);
        } else if (msg.type === 'websocket-send') {
          // WebSocket 메시지 전송 처리
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            console.log('Sending WebSocket message:', msg.data);
            ws.current.send(JSON.stringify(msg.data));
          } else {
            console.error('WebSocket is not connected');
            handlePluginError('WebSocket is not connected');
          }
        }
      }
    };

      // WebSocket 메시지 수신 처리
      ws.current.onmessage = (event) => {
        const response = JSON.parse(event.data) as WSMessage;
        console.log('WebSocket message received:', response);

        if (response.type === "INIT") {
          setIsConnecting(false);
          if (response.status === 'success' && response.payload) {
            console.log('Init successful, setting activeStep to 1');
            const initResponse = response.payload as InitResponse;
            setData(initResponse);
            setActiveStep(1);
            
            // modelInstance 초기화 상태 로깅 추가
            console.log('Current modelInstance:', modelInstance);
            
            console.log('ActiveStep should now be 1');
          } else {
            console.log('Init failed:', response.payload);
            const payload = response.payload as ErrorPayload;
            const errorMessage = payload?.message || 'Initialization failed';
            handlePluginError(errorMessage);
          }
        }
      };

      // WebSocket 에러 처리
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnecting(false);
        handlePluginError('WebSocket connection error');
      };

      window.addEventListener('message', handlePluginMessage);
      return () => {
        window.removeEventListener('message', handlePluginMessage);
        ws.current?.close();
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

  const requestScreenshot = async (prefix: string): Promise<ScreenshotInfo> => {
    return new Promise((resolve, reject) => {
      if (!ws.current) return reject('No WebSocket connection');

      ws.current.send(JSON.stringify({
        type: WSMessageType.GET_SCREENSHOT,
        payload: { prefix }
      }));

      const handleResponse = (event: MessageEvent) => {
        const response = JSON.parse(event.data);
        if (response.type === WSMessageType.GET_SCREENSHOT) {
          ws.current?.removeEventListener('message', handleResponse);
          if (response.status === 'success') {
            resolve(response.payload as ScreenshotInfo);
          } else {
            reject(response.payload?.message || 'Screenshot failed');
          }
        }
      };

      ws.current.addEventListener('message', handleResponse);
    });
  };

  const parseAreaNumber = (args: string): { area: number; rest: string[] } => {
    const [areaNum, ...rest] = args.split(',').map(arg => arg.trim());
    const area = parseInt(areaNum) - 1;
    if (isNaN(area) || area < 0) {
      throw new Error('Invalid area number');
    }
    return {
      area: area,
      rest: rest
    };
  };

  const handleExplore = async () => {
    if (!ws.current) {
      handlePluginError('WebSocket connection not available');
      return;
    }

    if (!modelInstance) {
      handlePluginError('AI model not initialized');
      return;
    }

    setIsInterviewing(true);
    setLoadingMessage('Creating frames...');
    setActiveStep(2);

    try {
      // 1. Create task frame and anatomy frame
      parent.postMessage({
        pluginMessage: {
          type: 'create-task-frame',
          data: {
            taskDesc,
            personaDesc
          }
        }
      }, '*');

      // 2. Wait for anatomyFrameId
      const handleTaskFrameCreation = (event) => {
        if (event.data.pluginMessage?.type === 'task-frame-created') {
          const { anatomyFrameId } = event.data.pluginMessage.payload;
          console.log('Anatomy frame created:', anatomyFrameId);
          startExplorationRounds(anatomyFrameId);
        } else if (event.data.pluginMessage?.type === 'error') {
          throw new Error(event.data.pluginMessage.payload.message);
        }
      };

      window.addEventListener('message', handleTaskFrameCreation);

    } catch (error) {
      console.error('Error in exploration:', error);
      setLoadingMessage(`Error: ${error.message}`);
      setIsInterviewing(false);
    }
  };

  const getElemList = async (nodeId: string, uselessList: Set<string>): Promise<UIElement[]> => {
    console.log('Getting elemList:', {
      nodeId,
      uselessListSize: uselessList.size,
      cacheHit: nodeElemListCache.current.has(nodeId)
    });

    return new Promise((resolve, reject) => {
      if (nodeElemListCache.current.has(nodeId)) {
        const cachedList = nodeElemListCache.current.get(nodeId)!;
        const filteredList = cachedList.filter(elem => !uselessList.has(elem.id));
        resolve(filteredList);
        return;
      }
      
      const handleElemListCreation = (event: MessageEvent) => {
        if (event.data.pluginMessage?.type === 'elem-list-created') {
          window.removeEventListener('message', handleElemListCreation);
          const elemList = event.data.pluginMessage.payload.elemList;
          const filteredList = elemList.filter(elem => !uselessList.has(elem.id));
          nodeElemListCache.current.set(nodeId, elemList);
          resolve(filteredList);
        } else if (event.data.pluginMessage?.type === 'error') {
          window.removeEventListener('message', handleElemListCreation);
          reject(new Error(event.data.pluginMessage.payload.message));
        }
      };

      window.addEventListener('message', handleElemListCreation);
      
      parent.postMessage({
        pluginMessage: {
          type: 'create-elem-list',
          nodeId,
          uselessList: Array.from(uselessList)
        }
      }, '*');
    });
  };

  const startExplorationRounds = async (anatomyFrameId: string): Promise<void> => {
    try {
      let round = 1;
      let taskComplete = false;
      let lastAct = 'None';
      const maxRounds = modelInstance?.maxRounds || 30;
      const uselessList = new Set<string>();
      
      console.log('Starting exploration:', { round: 1, maxRounds });

      while (!taskComplete && round <= maxRounds) {
        // 1. Get initial screenshot
        setLoadingMessage(`Round ${round}: Getting initial screenshot...`);
        const beforeScreenshot = await requestScreenshot(`${round}_before`);
        
        // 2. Get elemList for current node
        const elemList = await getElemList(beforeScreenshot.nodeId, uselessList);

        // 3. Create preview frames
        setLoadingMessage(`Round ${round}: Creating preview frame...`);
        parent.postMessage({
          pluginMessage: {
            type: 'create-preview-frames',
            data: {
              anatomyFrameId,
              roundCount: round,
              screenshotInfo: beforeScreenshot,
              elemList: elemList 
            }
          }
        }, '*');

        // Wait for preview frames to be created
        const previewData = await new Promise<PreviewFramesResult>((resolve, reject) => {
          const handlePreviewCreation = (event) => {
            if (event.data.pluginMessage?.type === 'preview-frames-created') {
              window.removeEventListener('message', handlePreviewCreation);
              resolve(event.data.pluginMessage.payload);
            } else if (event.data.pluginMessage?.type === 'error') {
              window.removeEventListener('message', handlePreviewCreation);
              reject(new Error(event.data.pluginMessage.payload.message));
            }
          };
          window.addEventListener('message', handlePreviewCreation);
        });

        // 4. Create prompt and get AI response
        setLoadingMessage(`Round ${round}: Getting AI response...`);
        const taskData: TaskData = { taskDesc, personaDesc };

        // Create prompt and ask for AppAgent
        let prompt = createPromptForTask(taskData);
        prompt = prompt.replace('<last_act>', lastAct);
        const response = await modelInstance.getModelResponse(prompt, [previewData.labeledImageFrameBase64]);

        if (!response) {
          throw new Error('No response from AI model');
        }
        const res = await parseExploreRsp(JSON.stringify(response));
        console.log('Parsed response:', res);

        parent.postMessage({
          pluginMessage: {
            type: 'parse-explore-rsp',
            payload: {
              previewFrameId: previewData.previewFrameId,
              res: res,
              elemList: elemList,
              screenshotInfo: beforeScreenshot,
              roundCount: round,
            }
          }
        }, '*');

        // Parse action details
        const { actName: initialActName, args } = parseAction(res.action);
        let actName = initialActName;
        lastAct = res.summary;

        // if actName is swipe, change actName to v_swipe or h_swipe
        if (actName === "swipe") {
          const swipeDir = args.split(',')[1].trim();
          if (swipeDir === "up" || swipeDir === "down") {
            actName = "v_swipe";
          } else if (swipeDir === "left" || swipeDir === "right") {
            actName = "h_swipe";
          }
        }


        if (actName === "FINISH") {
          taskComplete = true;
          break;
        }

        if (["tap", "long_press", "swipe"].includes(actName)) {
          try {
            const { area, rest } = parseAreaNumber(args);
            const elem = elemList[area];
            
            if (!elem) {
              throw new Error(`Element not found at index ${area}`);
            }

            if (!data?.screenshotArea) {
              throw new Error('Screenshot area not initialized');
            }

            // Send the action to WebSocket for execution
            if (ws.current) {
              ws.current.send(JSON.stringify({
                type: WSMessageType.EXECUTE_ACTION,
                payload: {
                  action: actName,
                  bbox: elem.bbox,
                  screenshotArea: data.screenshotArea,  // InitResponse에서 받은 screenshotArea 추가
                  ...(actName === 'swipe' && {
                    direction: rest[0]?.toLowerCase(),
                    distance: rest[1] || 'medium'
                  })
                }
              }));

              // 액션 실행 후 잠시 대기
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (error) {
            console.error('Error executing action:', error);
            figma.notify('Failed to execute action: ' + error.message, { error: true });
          }
        }

        // Set delay for 1 seconds
        setLoadingMessage('Thinking about what to do in the next step...');
        await new Promise(resolve => setTimeout(resolve, 1000));


        setLoadingMessage(`Round ${round}: Reflecting result...`);
        const afterScreenshot: ScreenshotInfo = await requestScreenshot(`${round}_after`)

        // create reflection frame 
        parent.postMessage({
          pluginMessage: {
            type: 'create-reflection-frame',
            data: {
              previewFrameId: previewData.previewFrameId,
              screenshotInfo: afterScreenshot,
              roundCount: round,
              elemList: elemList
            }
          }
        }, '*');

        // wait for reflection frame to be created
        const reflectionData: ReflectionFramesResult = await new Promise((resolve, reject) => {
          const handleReflectionCreation = (event) => {
            if (event.data.pluginMessage?.type === 'reflection-frames-created') {
              window.removeEventListener('message', handleReflectionCreation);
              resolve(event.data.pluginMessage.payload);
            } else if (event.data.pluginMessage?.type === 'error') {
              window.removeEventListener('message', handleReflectionCreation);
              reject(new Error(event.data.pluginMessage.payload.message));
            }
          }
          window.addEventListener('message', handleReflectionCreation);
        });

        console.log('Reflection data:', reflectionData);

        // Create reflection AI prompt and get AI response
        let reflectionPrompt = createPromptForReflection(taskData);

        if (actName === "tap") {
          reflectionPrompt = reflectionPrompt.replace('<action>', 'tapping');
        } else if (actName === "text") {
          continue;
        } else if (actName === "long_press") {
          reflectionPrompt = reflectionPrompt.replace('<action>', 'long pressing');
        } else if (actName === "swipe") {
          const swipeDir = res[2];
          if (swipeDir === "up" || swipeDir === "down") {
            actName = "v_swipe";
          } else if (swipeDir === "left" || swipeDir === "right") {
            actName = "h_swipe";
          }
          reflectionPrompt = reflectionPrompt.replace('<action>', 'swiping');
        } else {
          console.error("ERROR: Undefined act!");
          break;
        }

        let area = parseAreaNumber(args).area;
        let resource_id = elemList[area].id;

        // 간단한 라운드 정보만 로깅
        console.log('Round:', {
          number: round,
          action: actName,
          elementId: resource_id,
          uselessListSize: uselessList.size
        });

        if (resource_id) {
          uselessList.add(resource_id);
        }

        reflectionPrompt = reflectionPrompt.replace('<ui_element>', area.toString());
        reflectionPrompt = reflectionPrompt.replace('<task_desc>', taskData.taskDesc);
        reflectionPrompt = reflectionPrompt.replace('<last_act>', lastAct || 'None');

        const reflectionResponse = await modelInstance.getModelResponse(reflectionPrompt, [
          previewData.labeledImageFrameBase64,
          reflectionData.labeledImageFrameBase64
        ]);

        if (!reflectionResponse) {
          throw new Error('No response from AI model for reflection');
        }

        try {
          const { decision, thought } = await parseReflectRsp(JSON.stringify(reflectionResponse));
          console.log('Parsed reflection response:', { decision, thought });

          if (!decision) {
            console.warn('Invalid reflection decision, defaulting to CONTINUE');
            // 기본값으로 CONTINUE 설정
            parent.postMessage({
              pluginMessage: {
                type: 'parse-reflect-rsp',
                payload: {
                  previewFrameId: previewData.previewFrameId,
                  decision: 'CONTINUE',
                  thought: thought || 'Unable to determine changes, continuing exploration'
                }
              }
            }, '*');
          } else {
            parent.postMessage({
              pluginMessage: {
                type: 'parse-reflect-rsp',
                payload: {
                  previewFrameId: previewData.previewFrameId,
                  decision,
                  thought
                }
              }
            }, '*');
          }

          // decision 처리 로직
          if (decision === "ERROR") {
            break;
          }
          if (decision === "INEFFECTIVE") {
            console.log('Adding element to uselessList:', resource_id);
            uselessList.add(resource_id);
            lastAct = "None";
          } else if (
            decision === "BACK" ||
            decision === "CONTINUE" ||
            decision === "SUCCESS"
          ) {
            if (decision === "BACK" || decision === "CONTINUE") {
              console.log('Adding element to uselessList:', resource_id);
              uselessList.add(resource_id);
              lastAct = "None";
              if (decision === "BACK") {
                // TODO: Handle back action
                if (ws.current) {
                  ws.current.send(JSON.stringify({
                    type: 'BACK',
                    payload: {}
                  }));
                }
              }
            }
          }

          // 다음 라운드에서 uselessList를 고려하여 prompt 수정
          prompt = createPromptForTask(taskData);
          prompt = prompt.replace('<last_act>', lastAct);
          // uselessList 정보를 prompt에 추가
          if (uselessList.size > 0) {
            prompt += `\nPreviously ineffective elements: ${Array.from(uselessList).join(', ')}`;
          }

          // 노드가 변경되었다면 캐시 초기화
          if (afterScreenshot.nodeId !== beforeScreenshot.nodeId) {
            console.log('Node changed:', {
              from: beforeScreenshot.nodeId,
              to: afterScreenshot.nodeId,
              cacheBefore: Array.from(nodeElemListCache.current.keys())
            });
            nodeElemListCache.current.delete(beforeScreenshot.nodeId);
            console.log('Cache after node change:', Array.from(nodeElemListCache.current.keys()));
          }

          // 액션 파싱 결과 로깅
          console.log('Action parsed:', {
            actName,
            args,
            selectedElement: elemList[area],
            elementId: resource_id
          });

          // uselessList 업데이트 로깅
          if (decision === "INEFFECTIVE" || decision === "BACK" || decision === "CONTINUE") {
            console.log('Adding to uselessList:', {
              elementId: resource_id,
              elementInfo: elemList[area],
              reason: decision
            });
            uselessList.add(resource_id);
            console.log('Updated uselessList:', Array.from(uselessList));
          }

          round++;
        } catch (error) {
          console.error('Error parsing reflection response:', error);
          // 에러 발생 시 CONTINUE로 처리
          parent.postMessage({
            pluginMessage: {
              type: 'parse-reflect-rsp',
              payload: {
                previewFrameId: previewData.previewFrameId,
                decision: 'CONTINUE',
                thought: 'Error parsing reflection response, continuing exploration'
              }
            }
          }, '*');
        }
      }

      setLoadingMessage('Exploration complete!');
    } catch (error) {
      console.error('Error in exploration:', error);
      setLoadingMessage(`Error: ${error.message}`);
      setIsInterviewing(false);
    }
  };

  const resetState = () => {
    setConfirmResetModalOpen(false);
    setConfirmStopModalOpen(false);
    setActiveStep(0);
    setUrl('');
    setPassword('');
    setIsConnecting(false);
    setData(null);
  };

  const handleBack = () => {
    if (isInterviewing) {
      setConfirmStopModalOpen(true);
    } else {
      setConfirmResetModalOpen(true);
    }
  };

  const handleConfirmReset = () => {
    resetState();
    if (ws.current) {
      ws.current.send(JSON.stringify({ 
        type: 'CLOSE',
        payload: {}
      }));
    }
    setConfirmResetModalOpen(false);
    setConfirmStopModalOpen(false);
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

  const handleOpenApiKeyModal = () => {
    setApiKey(currentApiKey);
    setApiKeyModalOpen(true);
  };

  const handleCloseApiKeyModal = () => {
    setApiKeyModalOpen(false);
    setApiKey('');
  };

  return (
    <CssVarsProvider>
      <Box sx={{ maxWidth: 600, mx: 'auto', px: 2 }}>
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
          <ApiKeyCard onSetApiKey={() => setApiKeyModalOpen(true)} />
        ) : (
          <Stepper orientation="vertical">
            <Step
              active={activeStep === 0}
              completed={activeStep > 0}
              indicator={
                <StepIndicator variant={activeStep === 0 ? 'solid' : 'soft'} color="primary">
                  <AddLinkOutlined />
                </StepIndicator>
              }
            >
              <Typography level="title-md">Step 1</Typography>
              {activeStep === 0 && (
                <InitStep
                  url={url}
                  password={password}
                  isConnecting={isConnecting}
                  onUrlChange={setUrl}
                  onPasswordChange={setPassword}
                  onInit={handleInit}
                  onBack={handleBack}
                />
              )}
            </Step>

            <Step
              active={activeStep === 1}
              completed={activeStep > 1}
              indicator={
                <StepIndicator variant={activeStep === 1 ? 'solid' : 'soft'} color="primary">
                  <DesignServicesOutlined />
                </StepIndicator>
              }
            >
              <Typography level="title-md">Step 2</Typography>
              {activeStep === 1 && (
                <TaskStep
                  taskDesc={taskDesc}
                  personaDesc={personaDesc}
                  isConnecting={isConnecting}
                  onTaskDescChange={setTaskDesc}
                  onPersonaClick={() => setPersonaModalOpen(true)}
                  onExplore={handleExplore}
                  onBack={handleBack}
                  onKeyDown={handleKeyDown}
                />
              )}
            </Step>

            <Step
              active={activeStep === 2}
              completed={activeStep > 2}
              indicator={
                <StepIndicator variant={activeStep === 2 ? 'solid' : 'soft'} color="primary">
                  <PhotoFilterOutlined />
                </StepIndicator>
              }
            >
              <Typography level="title-md">Step 3</Typography>
              {activeStep === 2 && (
                <ReportStep
                  isInterviewing={isInterviewing}
                  loadingMessage={loadingMessage}
                  onBack={handleBack}
                  onReset={handleConfirmReset}
                />
              )}
            </Step>
          </Stepper>
        )}

        <ConfirmModal
          open={confirmResetModalOpen}
          onClose={() => setConfirmResetModalOpen(false)}
          onConfirm={handleConfirmReset}
          title="Reset Confirmation"
          content="Are you sure you want to reset and go back to the initial step?"
        />

        <ConfirmModal
          open={confirmStopModalOpen}
          onClose={() => setConfirmStopModalOpen(false)}
          onConfirm={handleConfirmReset}
          title="Stop Confirmation"
          content="Are you sure you want to stop the current exploration?"
        />

        <PersonaModal
          open={personaModalOpen}
          personaDesc={personaDesc}
          onClose={() => setPersonaModalOpen(false)}
          onChange={(e) => setPersonaDesc(e)}
          onReset={() => {
            setPersonaDesc('');
            setPersonaModalOpen(false);
          }}
        />

        <ApiKeyModal
          open={apiKeyModalOpen}
          apiKey={apiKey}
          currentApiKey={currentApiKey}
          onClose={handleCloseApiKeyModal}
          onChange={(e) => setApiKey(e)}
          onSubmit={handleApiKeySubmit}
          onDelete={handleApiKeyDelete}
        />
      </Box>
    </CssVarsProvider>
  );
};

export default App;
