import { 
  TaskData, 
  TaskFrameResult, 
  PreviewFrameResult, 
  UIElement, 
  ImageDimensions 
} from '../typings/types';

// Constants
const VALID_UI_ELEMENT_TYPES = ['FRAME', 'INSTANCE', 'COMPONENT', 'GROUP'] as const;
type ValidUIElementType = typeof VALID_UI_ELEMENT_TYPES[number];

// Error handling utility
const createError = (message: string, details?: any) => {
  console.error(`Error: ${message}`, details);
  return new Error(message);
};

async function loadImageBytes(imageData: string): Promise<Image> {
  if (!imageData) {
    throw new Error('Image data is required');
  }

  try {
    // figma.createImageAsync를 사용하여 이미지 생성
    const image = await figma.createImageAsync(imageData);
    console.log('Image created successfully');
    return image;
  } catch (e) {
    console.error('Error creating image:', e);
    throw e;
  }
}

export async function createImageFrame(
  imageData: string | Image,
  name: string,
  dimensions: ImageDimensions
): Promise<FrameNode> {
  const frame = figma.createFrame();
  try {
    frame.name = name;
    frame.layoutMode = 'NONE';
    frame.clipsContent = true;
    frame.fills = [];
    frame.resize(dimensions.width, dimensions.height);

    // 이미지 데이터 처리
    const imageHash = typeof imageData === 'string' 
      ? (await figma.createImageAsync(imageData)).hash 
      : imageData.hash;

    frame.fills = [{
      type: 'IMAGE',
      imageHash: imageHash,
      scaleMode: 'FILL'
    }];

    return frame;
  } catch (error) {
    frame.remove();
    throw createError('Failed to create image frame', error);
  }
}

export function createText(characters: string, fontSize: number, fontStyle: 'Regular' | 'Bold'): TextNode {
  const text = figma.createText();
  text.characters = characters;
  text.fontSize = fontSize;
  text.fontName = { family: 'Inter', style: fontStyle };
  text.textAutoResize = 'WIDTH_AND_HEIGHT';
  return text;
}

function createTaskFrame(taskName: string): FrameNode {
  const frame = figma.createFrame();
  frame.name = taskName;
  frame.layoutMode = 'VERTICAL';
  frame.itemSpacing = 64;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  return frame;
}

function createNameFrame(nodeName: string): FrameNode {
  const frame = figma.createFrame();
  frame.name = 'Name';
  frame.layoutMode = 'HORIZONTAL';
  frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 64;
  frame.cornerRadius = 16;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';

  const text = figma.createText();
  text.characters = nodeName;
  text.fontSize = 64;
  text.fontName = { family: 'Inter', style: 'Bold' };
  text.textAutoResize = 'WIDTH_AND_HEIGHT';
  frame.appendChild(text);

  return frame;
}

function createTaskDescFrame(taskDesc: string, personaDesc?: string): FrameNode {
  const frame = figma.createFrame();
  frame.name = 'task_desc';
  frame.layoutMode = 'VERTICAL';
  frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 64;
  frame.itemSpacing = 48;
  frame.cornerRadius = 16;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';

  const titleText = createText('Task Description', 48, 'Bold');
  frame.appendChild(titleText);

  const descText = createText(taskDesc, 24, 'Regular');
  frame.appendChild(descText);

  if (personaDesc) {
    const personaText = createText(`As a person who is ${personaDesc}`, 24, 'Regular');
    frame.appendChild(personaText);
  }

  return frame;
}

export function createAnatomyFrame(roundCount: number): FrameNode {
  const frame = figma.createFrame();
  frame.name = 'anatomy';
  frame.layoutMode = 'VERTICAL';
  frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 64;
  frame.itemSpacing = 32;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';

  const titleText = createText(`Round ${roundCount}`, 48, 'Bold');
  frame.appendChild(titleText);

  return frame;
}

export function createPreviewFrame(): FrameNode {
  const frame = figma.createFrame();
  frame.name = 'preview';
  frame.layoutMode = 'HORIZONTAL';
  frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 64;
  frame.itemSpacing = 64;
  frame.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  frame.cornerRadius = 16;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  return frame;
}

// UT Reports frame 관련 함수들
export async function getOrCreateUTReportsFrame(): Promise<FrameNode> {
  let frame = figma.currentPage.findOne(
    (n) => n.type === 'FRAME' && n.name === 'UT Reports'
  ) as FrameNode;
  
  if (!frame) {
    frame = createUTReportsFrame();
    figma.currentPage.appendChild(frame);
  }
  return frame;
}

function createUTReportsFrame(): FrameNode {
  const frame = figma.createFrame();
  frame.name = 'UT Reports';
  frame.layoutMode = 'HORIZONTAL';
  frame.itemSpacing = 128;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  frame.cornerRadius = 16;

  // Find the rightmost position of all nodes in the current page
  const maxX = figma.currentPage.children.reduce(
    (max, node) => Math.max(max, node.x + node.width),
    0
  );

  // Position the frame 100px to the right of the rightmost element
  frame.x = maxX + 100;
  frame.y = 0;  // Always at the top of the page

  return frame;
}

export async function createTaskFrameWithNameAndDesc(data: TaskData): Promise<TaskFrameResult> {
  try {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });

    // Get or create the UT Reports frame
    const utReportsFrame = await getOrCreateUTReportsFrame();
    
    // Generate timestamp-based name
    const now = new Date();
    const taskName = `self_explore_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    
    // Create task frame
    const taskFrame = createTaskFrame(taskName);
    utReportsFrame.appendChild(taskFrame);

    // Create and append name frame
    const nameFrame = createNameFrame(taskName);
    taskFrame.appendChild(nameFrame);

    // Create and append task description frame
    const taskDescFrame = createTaskDescFrame(data.taskDesc, data.personaDesc);
    taskFrame.appendChild(taskDescFrame);

    return { taskFrame };
  } catch (error) {
    throw createError('Failed to create task frame', error);
  }
}

export async function createPreviewAndImageFrames(
  nodeId: string,
  taskFrame: FrameNode,
  round: number,
  imageData: string,
  dimensions: ImageDimensions
): Promise<PreviewFrameResult> {
  try {
    const anatomyFrame = createAnatomyFrame(round);
    taskFrame.appendChild(anatomyFrame);

    const previewFrame = createPreviewFrame();
    anatomyFrame.appendChild(previewFrame);

    const imageBytes = await loadImageBytes(imageData);
    const originalImage = await createImageFrame(
      imageBytes,
      `Original ${round}`,
      dimensions
    );

    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error('Node not found');
    }

    const elemList = await createElemList(node);
    const labeledImage = await createImageFrame(
      imageBytes,
      `Labeled ${round}`,
      dimensions
    );

    await addLabelsToImage(
      labeledImage, 
      elemList, 
      elemList[0].bbox.x, 
      elemList[0].bbox.y
    );

    previewFrame.appendChild(originalImage);
    previewFrame.appendChild(labeledImage);

    return { 
      previewFrame,
      originalImage,
      labeledImage
    };
  } catch (error) {
    console.error('Failed to create preview frames:', error);
    throw error;
  }
}

async function addLabelsToImage(frame: FrameNode, elements: UIElement[], elementStartX: number, elementStartY: number) {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  
  elements.forEach((elem, index) => {
    const elemFrame = figma.createFrame();
    elemFrame.name = elem.name;
    elemFrame.layoutMode = 'HORIZONTAL';
    elemFrame.paddingTop = elemFrame.paddingBottom = elemFrame.paddingLeft = elemFrame.paddingRight = 4;
    elemFrame.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 }, opacity: 0.5 }];
    elemFrame.primaryAxisSizingMode = 'AUTO';
    elemFrame.counterAxisSizingMode = 'AUTO';

    // Use elementStartX and elementStartY to calculate relative position
    const bbox = elem.bbox;
    elemFrame.x = (bbox.x - elementStartX) + bbox.width / 2 - 8;
    elemFrame.y = (bbox.y - elementStartY) + bbox.height / 2 - 8;

    // Create and style the label text
    const textNode = figma.createText();
    textNode.characters = (index + 1).toString();
    textNode.fontSize = 12;
    textNode.fontName = { family: 'Inter', style: 'Regular' };
    textNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; // White color

    elemFrame.appendChild(textNode);
    frame.appendChild(elemFrame);
  });
}

export async function createElemList(node: BaseNode): Promise<UIElement[]> {
  if (!('visible' in node) || !node.visible || !('absoluteBoundingBox' in node)) {
    return [];
  }

  const bbox = node.absoluteBoundingBox;
  if (!bbox) return [];

  const elements: UIElement[] = [];

  if (VALID_UI_ELEMENT_TYPES.includes(node.type as ValidUIElementType)) {
    elements.push({
      id: node.id,
      type: node.type,
      name: node.name,
      bbox: {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height
      }
    });
  }

  if ('children' in node) {
    for (const child of node.children) {
      const childElements = await createElemList(child);
      elements.push(...childElements);
    }
  }

  return elements;
}

export async function sendNodeInfoToUI() {
  const node = figma.currentPage.selection[0];
  if (!node) {
    figma.ui.postMessage({ type: 'clear' });
    return;
  }

  if ('layoutMode' in node && node.type === 'FRAME' && node.layoutMode !== 'HORIZONTAL') {
    figma.ui.postMessage({
      type: 'nodeInfo',
      message: {
        name: node.name,
        id: node.id,
      },
    });
  } else {
    figma.notify('Please select a vertical frame to continue.', { timeout: 2000 });
  }
}

export async function checkTrialStatus() {
  const secondsSinceFirstRun = figma.payments.getUserFirstRanSecondsAgo();
  const hoursSinceFirstRun = secondsSinceFirstRun / (60 * 60);
  const trialHoursLeft = Math.max(0, 48 - hoursSinceFirstRun);

  figma.ui.postMessage({ 
    type: 'trialStatus', 
    message: { 
      isTrialActive: hoursSinceFirstRun <= 48,
      trialHoursLeft,
      isPaid: figma.payments.status.type === "PAID"
    } 
  });

  return true;
}

// Add this function to convert FrameNode to base64 image
export async function getImageBase64(node: FrameNode): Promise<string> {
  try {
    // Export the frame as PNG bytes
    const bytes = await node.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 2 }
    });

    // Convert bytes to base64
    return figma.base64Encode(bytes);
  } catch (error) {
    console.error('Error converting frame to base64:', error);
    throw new Error('Failed to convert frame to base64 image');
  }
}

// 전역 상태 관리를 위한 타입과 객체
type ExplorationState = {
  elemList: UIElement[];
  elementStartX: number;
  elementStartY: number;
  currentNodeId: string | null;
};

let explorationState: ExplorationState = {
  elemList: [],
  elementStartX: 0,
  elementStartY: 0,
  currentNodeId: null
};

// elemList와 좌표를 초기화/업데이트하는 함수
export async function updateExplorationState(nodeId: string) {
  if (nodeId === explorationState.currentNodeId) {
    return; // 같은 노드면 재계산하지 않음
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error('Node not found');
  }

  // 타입 체크 추가
  if (!('visible' in node) || !node.visible || !('absoluteBoundingBox' in node)) {
    throw new Error('Invalid node type or node not visible');
  }

  // elemList 생성
  const elemList = await createElemList(node);
  if (elemList.length === 0) {
    throw new Error('No UI elements found');
  }

  // 첫 번째 요소의 좌표를 기준점으로 사용
  const elementStartX = elemList[0].bbox.x;
  const elementStartY = elemList[0].bbox.y;

  explorationState = {
    elemList,
    elementStartX,
    elementStartY,
    currentNodeId: nodeId
  };
}

// processAIResponseAndCreateFrames 함수 수정
export async function processAIResponseAndCreateFrames(
  aiResponse: string,
  previewFrame: FrameNode,
  originalImage: FrameNode,
): Promise<{ actionType: string; actionParams: any; summary: string }> {
  try {
    const parsedResponse = parseModelResponse(aiResponse);
    if (!parsedResponse) {
      throw new Error('Failed to parse AI response');
    }

    const { observation, thought, action, summary } = parsedResponse;

    // Create action image frame (복제본에 액션 시각화)
    const actionImageFrame = originalImage.clone();
    actionImageFrame.name = 'Action Image';

    // Action에 따른 시각화 요소 추가
    if (action.includes('tap') || action.includes('long_press')) {
      const area = parseInt(action.match(/\((.*?)\)/)[1]);
      const selectedElem = explorationState.elemList[area - 1];

      const bboxRect = createBoundingBox(selectedElem, explorationState.elementStartX, explorationState.elementStartY);
      const touchPoint = createTouchPoint(selectedElem, explorationState.elementStartX, explorationState.elementStartY);
      
      actionImageFrame.appendChild(bboxRect);
      actionImageFrame.appendChild(touchPoint);
    }
    // ... 다른 액션 타입들에 대한 처리도 유사하게 진행

    // Create model response frame
    const modelResponseFrame = createModelResponseFrame(observation, thought, action, summary);

    // Add frames to preview frame
    previewFrame.appendChild(actionImageFrame);
    previewFrame.appendChild(modelResponseFrame);

    return {
      actionType: action.split('(')[0],
      actionParams: parseActionParams(action),
      summary
    };
  } catch (error) {
    console.error('Error in processAIResponseAndCreateFrames:', error);
    throw error;
  }
}

// Action 파라미터 파싱 함수
function parseActionParams(action: string) {
  const match = action.match(/\((.*?)\)/);
  if (!match) return null;
  
  const params = match[1].split(',').map(p => p.trim());
  return params;
}

// 응답 텍스트 추가 함수
async function addResponseText(frame: FrameNode, observation: string, thought: string, action: string, summary: string) {
  // 폰트 로드
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  const textNode = figma.createText();
  textNode.fontName = { family: "Inter", style: "Regular" };
  textNode.fontSize = 12;
  textNode.x = 16;
  textNode.y = 16;
  textNode.textAutoResize = "HEIGHT";
  textNode.characters = `Observation: ${observation}\n\nThought: ${thought}\n\nAction: ${action}\n\nSummary: ${summary}`;

  frame.appendChild(textNode);
}

// Action 시각화 함수
function visualizeAction(
  action: string,
  frame: FrameNode,
  elemList: any[],
  elementStartX: number,
  elementStartY: number
) {
  if (action.includes('tap') || action.includes('long_press')) {
    const area = parseInt(action.match(/\((.*?)\)/)[1]);
    const selectedElem = elemList[area - 1];

    // 바운딩 박스 생성
    const bboxRect = createBoundingBox(selectedElem, elementStartX, elementStartY);
    
    // 터치 포인트 생성
    const touchPoint = createTouchPoint(selectedElem, elementStartX, elementStartY);

    frame.appendChild(bboxRect);
    frame.appendChild(touchPoint);
  } 
  else if (action.includes('swipe')) {
    const params = action.match(/swipe\((.*?)\)/)[1].split(',');
    const area = parseInt(params[0]);
    const direction = params[1].trim();
    const distance = params[2]?.trim() || '100';
    const selectedElem = elemList[area - 1];

    // 바운딩 박스 생성
    const bboxRect = createBoundingBox(selectedElem, elementStartX, elementStartY);
    
    // 스와이프 화살표 생성
    const swipeLine = createSwipeArrow(selectedElem, direction, distance, elementStartX, elementStartY);

    frame.appendChild(bboxRect);
    frame.appendChild(swipeLine);
  }
  else if (action.includes('text')) {
    const match = action.match(/text\((.*?)\)/);
    if (!match) return;
    
    const params = match[1].split(',');
    const area = parseInt(params[0]);
    const inputText = params[1]?.trim().slice(1, -1) || '';
    const selectedElem = elemList[area - 1];

    // 바운딩 박스 생성
    const bboxRect = createBoundingBox(selectedElem, elementStartX, elementStartY);
    
    // 텍스트 입력 표시 생성
    const textBubble = createTextInputBubble(selectedElem, inputText, elementStartX, elementStartY);

    frame.appendChild(bboxRect);
    frame.appendChild(textBubble);
  }
}

function parseModelResponse(
  rsp: string
): { observation: string; thought: string; action: string; summary: string } | null {
  const observationMatch = rsp.match(/Observation: ([\s\S]*?)(?:\n\nThought:|$)/);
  const thoughtMatch = rsp.match(/Thought: ([\s\S]*?)(?:\n\nAction:|$)/);
  const actionMatch = rsp.match(/Action: ([\s\S]*?)(?:\n\nSummary:|$)/);
  const summaryMatch = rsp.match(/Summary: ([\s\S]*?)(?="$|$)/);

  if (!observationMatch || !thoughtMatch || !actionMatch || !summaryMatch) {
    console.error('ERROR: Failed to parse the model response', rsp);
    return null;
  }

  return {
    observation: observationMatch[1],
    thought: thoughtMatch[1],
    action: actionMatch[1],
    summary: summaryMatch[1],
  };
}

// Helper functions for visualization
function createBoundingBox(selectedElem: any, x: number, y: number): RectangleNode {
  const bboxRect = figma.createRectangle();
  bboxRect.x = selectedElem.bbox.x + (x || 0);
  bboxRect.y = selectedElem.bbox.y + (y || 0);
  bboxRect.resize(selectedElem.bbox.width, selectedElem.bbox.height);
  bboxRect.strokeWeight = 4;
  bboxRect.strokes = [{ type: 'SOLID', color: { r: 1, g: 1, b: 0 } }]; // Yellow color
  bboxRect.fills = [];
  return bboxRect;
}

function createTouchPoint(selectedElem: any, x: number, y: number): EllipseNode {
  const touchPoint = figma.createEllipse();
  touchPoint.x = selectedElem.bbox.x + selectedElem.bbox.width / 2 + (x || 0);
  touchPoint.y = selectedElem.bbox.y + selectedElem.bbox.height / 2 + (y || 0);
  touchPoint.resize(10, 10);
  touchPoint.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]; // Red color
  return touchPoint;
}

function createSwipeArrow(selectedElem: any, direction: string, distance: string, x: number, y: number): LineNode {
  const line = figma.createLine();
  const startX = selectedElem.bbox.x + selectedElem.bbox.width / 2 + (x || 0);
  const startY = selectedElem.bbox.y + selectedElem.bbox.height / 2 + (y || 0);
  const dist = parseInt(distance) || 100;

  line.x = startX;
  line.y = startY;
  
  switch(direction.toLowerCase()) {
    case 'right': line.resize(dist, 0); break;
    case 'left': line.resize(-dist, 0); break;
    case 'up': line.resize(0, -dist); break;
    case 'down': line.resize(0, dist); break;
  }

  line.strokeWeight = 3;
  line.strokes = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
  
  return line;
}

async function createTextInputBubble(selectedElem: any, inputText: string, x: number, y: number): Promise<GroupNode> {
  // 폰트 로드
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });

  // 말풍선 배경 생성
  const bubble = figma.createRectangle();
  bubble.x = selectedElem.bbox.x + selectedElem.bbox.width + 10 + (x || 0);
  bubble.y = selectedElem.bbox.y + (y || 0);
  bubble.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; // White background
  bubble.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]; // Black border
  bubble.strokeWeight = 1;
  bubble.cornerRadius = 8;

  // 텍스트 노드 생성
  const text = figma.createText();
  text.characters = inputText;
  text.fontSize = 14;
  text.x = bubble.x + 8;
  text.y = bubble.y + 8;
  text.fontName = { family: "Inter", style: "Regular" };

  // 말풍선 크기 조정
  bubble.resize(text.width + 16, text.height + 16);

  // 그룹으로 묶기
  const group = figma.group([bubble, text], figma.currentPage);
  group.name = "Text Input Bubble";

  return group;
}