import {
  UIElement,
  ImageDimensions,
  ScreenshotInfo,
  TaskData,
  ExploreResponse,
} from '../typings/types';

// Basic UI creation utilities
export function createText(
  characters: string, 
  fontSize: number, 
  fontStyle: 'Regular' | 'Bold',
  color: string | { r: number; g: number; b: number; } = '#000000'  // 헥스 코드나 RGB 객체 모두 받을 수 있음
): TextNode {
  const rgbColor = typeof color === 'string' ? hexToRgb(color) : color;

  const text = figma.createText();
  text.characters = characters;
  text.fontSize = fontSize;
  text.fontName = { family: 'Inter', style: fontStyle };
  text.textAutoResize = 'WIDTH_AND_HEIGHT';
  text.fills = [{ type: 'SOLID', color: rgbColor }];

  return text;
}

// Hex to RGB color converter
export function hexToRgb(hex: string) {
  try {
    hex = hex.replace(/^#/, '');
    const r = Math.min(parseInt(hex.substring(0, 2), 16) / 255, 1);
    const g = Math.min(parseInt(hex.substring(2, 4), 16) / 255, 1);
    const b = Math.min(parseInt(hex.substring(4, 6), 16) / 255, 1);

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      throw new Error('Invalid hex color');
    }

    const color = {
      r: Math.max(0, Math.min(r, 1)),
      g: Math.max(0, Math.min(g, 1)),
      b: Math.max(0, Math.min(b, 1))
    };

    return color;
  } catch (error) {
    console.error('Error in hexToRgb:', error);
    return { r: 0, g: 0, b: 0 };
  }
}

export function createTextFrame(
  title: string, 
  content: string,
  color: string | { r: number; g: number; b: number; } = '#000000'  // 헥스 코드나 RGB 객체 모두 받을 수 있음
): FrameNode {
  // 컬러 처리
  const rgbColor = typeof color === 'string' ? hexToRgb(color) : color;

  const frame = figma.createFrame();
  frame.name = title;

  const titleText = createText(title, 32, 'Bold', rgbColor);
  const decodedContent = content.replace(/\\(.)/g, '$1');
  const contentText = createText(decodedContent, 24, 'Regular', rgbColor);

  frame.appendChild(titleText);
  frame.appendChild(contentText);

  frame.layoutMode = 'VERTICAL';
  frame.itemSpacing = 16;
  frame.counterAxisSizingMode = 'FIXED';
  frame.resize(1000, frame.height);
  frame.primaryAxisSizingMode = 'AUTO';
  frame.fills = [];

  titleText.layoutSizingHorizontal = 'FILL';
  contentText.layoutSizingHorizontal = 'FILL';

  return frame;
}

export function createPreviewFrame(roundCount: number): FrameNode {
  const frame = figma.createFrame();
  frame.name = `preview_${roundCount}`;
  frame.layoutMode = 'HORIZONTAL';
  frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 64;
  frame.itemSpacing = 64;
  
  const bgColor = hexToRgb('#000000');
  frame.fills = [{ type: 'SOLID', color: bgColor }];
  
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';

  const titleText = createText(`Round ${roundCount}`, 48, 'Bold', '#FFFFFF');
  frame.appendChild(titleText);

  return frame;
}

export async function createImageFrame(
  imageData: string,
  name: string,
  dimensions?: ImageDimensions
): Promise<FrameNode> {
  const frame = figma.createFrame();
  frame.name = name;
  if (dimensions) {
    frame.resize(dimensions.width, dimensions.height);
  } else {
    // if dimensions is not provided, get dimensions from figma clientStorage
    const dimensions = await figma.clientStorage.getAsync('dimensions');
    frame.resize(dimensions.width, dimensions.height);
  }

  const imageHash = (await figma.createImageAsync(imageData)).hash;
  frame.fills = [
    {
      type: 'IMAGE',
      imageHash: imageHash,
      scaleMode: 'FILL',
    },
  ];

  return frame;
}

export function createBoundingBox(selectedElem: UIElement): RectangleNode {
  const bboxRect = figma.createRectangle();
  bboxRect.x = selectedElem.bbox.x;
  bboxRect.y = selectedElem.bbox.y;
  bboxRect.resize(selectedElem.bbox.width, selectedElem.bbox.height);
  bboxRect.strokeWeight = 4;
  bboxRect.strokes = [{ type: 'SOLID', color: { r: 1, g: 1, b: 0 } }];
  bboxRect.fills = [];
  return bboxRect;
}

// Error handling utility
export function errorMessageHandler(errorMessage: string) {
  console.error('Error:', errorMessage);
  figma.notify(errorMessage, { error: true });
}

export async function loadFonts() {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
}

export function createAnatomyFrame(): FrameNode {
  const frame = figma.createFrame();
  frame.name = 'anatomy';
  frame.layoutMode = 'VERTICAL';
  frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 64;
  frame.itemSpacing = 32; // 상호 간격 설정
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';

  return frame;
}

export async function createElemList(
  node: SceneNode,
  elemList: UIElement[] = [],
  root: SceneNode = node
): Promise<UIElement[]> {
  if (!node.visible) {
    return elemList;
  }

  if (['FRAME', 'INSTANCE', 'COMPONENT'].includes(node.type)) {
    if (node.absoluteBoundingBox !== null && root.absoluteBoundingBox !== null) {
      const { x, y, width, height } = node.absoluteBoundingBox;
      elemList.push({
        id: node.id,
        type: node.type,
        name: node.name,
        bbox: {
          x: x - root.absoluteBoundingBox.x,
          y: y - root.absoluteBoundingBox.y,
          width,
          height,
        },
      });
    }
  }

  if ('children' in node) {
    for (const child of node.children) {
      await createElemList(child, elemList, root);
    }
  }

  return elemList;
}

export async function createLabeledImageFrame(
  elemList: UIElement[],
  imageData: string,
  dimensions: ImageDimensions,
  roundCount: number
) {
  const labeledFrame = figma.createFrame();
  labeledFrame.name = `${roundCount}_after_labeled`;
  labeledFrame.resize(dimensions.width, dimensions.height);

  const imageHash = (await figma.createImageAsync(imageData)).hash;
  labeledFrame.fills = [
    {
      type: 'IMAGE',
      scaleMode: 'FILL',
      imageHash: imageHash,
    },
  ];

  elemList.forEach((elem, index) => {
    const elemFrame = figma.createFrame();
    elemFrame.name = elem.name;
    elemFrame.layoutMode = 'HORIZONTAL';
    elemFrame.paddingTop = elemFrame.paddingBottom = elemFrame.paddingLeft = elemFrame.paddingRight = 4;
    elemFrame.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 }, opacity: 0.5 }];

    elemFrame.primaryAxisSizingMode = 'AUTO';
    elemFrame.counterAxisSizingMode = 'AUTO';

    // 요소의 위치 계산 (offset 없이 직접 bbox 값 사용)
    elemFrame.x = elem.bbox.x + elem.bbox.width / 2 - 8;
    elemFrame.y = elem.bbox.y + elem.bbox.height / 2 - 8;

    const textNode = figma.createText();
    textNode.characters = (index + 1).toString();
    textNode.fontSize = 12;
    textNode.fontName = { family: 'Inter', style: 'Regular' };
    textNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

    elemFrame.appendChild(textNode);
    labeledFrame.appendChild(elemFrame);
  });

  return labeledFrame;
}

export async function parseExploreRsp(rsp: string): Promise<ExploreResponse> {
  try {
    const observationMatch = rsp.match(/Observation: ([\s\S]*?)(?:\\n\\nThought:|$)/);
    const thoughtMatch = rsp.match(/Thought: ([\s\S]*?)(?:\\n\\nAction:|$)/);
    const actionMatch = rsp.match(/Action: ([\s\S]*?)(?:\\n\\nSummary:|$)/);
    const summaryMatch = rsp.match(/Summary: ([\s\S]*?)(?="$)/);

    if (!observationMatch || !thoughtMatch || !actionMatch || !summaryMatch) {
      throw new Error('Failed to parse model response');
    }

    return {
      observation: observationMatch[1],
      thought: thoughtMatch[1],
      action: actionMatch[1],
      summary: summaryMatch[1],
    };
  } catch (error) {
    console.error('Error in parseExploreRsp:', error);
    throw error;
  }
}

// 새로운 함수들
export function createModelResponseFrame(
  observation: string,
  thought: string,
  action: string,
  summary: string
): FrameNode {
  const modelResponseFrame = figma.createFrame();
  modelResponseFrame.fills = [];
  modelResponseFrame.name = 'Klever UT Response';
  modelResponseFrame.layoutMode = 'VERTICAL';
  modelResponseFrame.itemSpacing = 32;
  modelResponseFrame.primaryAxisSizingMode = 'AUTO';
  modelResponseFrame.counterAxisSizingMode = 'AUTO';

  modelResponseFrame.appendChild(createTextFrame('Observation', observation, '#ffffff'));
  modelResponseFrame.appendChild(createTextFrame('Thought', thought, '#ffffff'));
  modelResponseFrame.appendChild(createTextFrame('Action', action, '#ffffff'));
  modelResponseFrame.appendChild(createTextFrame('Summary', summary, '#ffffff'));

  return modelResponseFrame;
}

export async function createActionImageFrame(
  action: string,
  elemList: UIElement[],
  screenshotInfo: ScreenshotInfo,
  roundCount: number
): Promise<FrameNode> {
  const actionImageFrame = await createImageFrame(screenshotInfo.imageData, `${roundCount}_before_labeled_action`);

  if (action.includes('tap') || action.includes('long_press')) {
    const area = parseInt(action.match(/\((.*?)\)/)[1]);
    const selectedElem = elemList[area - 1];
    actionImageFrame.appendChild(createBoundingBox(selectedElem));
    actionImageFrame.appendChild(createTouchPoint(selectedElem));
  } else if (action.includes('swipe')) {
    const params = action.match(/swipe\((.*?)\)/)[1].split(',');
    const area = parseInt(params[0]);
    const direction = params[1].trim();
    const distance = params[2].trim();
    const selectedElem = elemList[area - 1];
    actionImageFrame.appendChild(createBoundingBox(selectedElem));
    actionImageFrame.appendChild(createSwipeArrow(selectedElem, direction, distance));
  } else if (action.includes('text')) {
    const match = action.match(/text\((.*?)\)/);
    if (!match) throw new Error('Invalid text action format');
    const params = match[1].split(',');
    const area = parseInt(params[0]);
    const inputStr = params[1].trim().slice(1, -1);
    const selectedElem = elemList[area - 1];
    actionImageFrame.appendChild(createBoundingBox(selectedElem));
    actionImageFrame.appendChild(createSpeechBubble(selectedElem, inputStr));
  }

  return actionImageFrame;
}

export function createSpeechBubble(selectedElem: UIElement, text: string): FrameNode {
  const bubble = figma.createFrame();
  bubble.name = 'Speech Bubble';
  bubble.layoutMode = 'VERTICAL';
  bubble.primaryAxisSizingMode = 'AUTO';
  bubble.counterAxisSizingMode = 'AUTO';
  bubble.paddingTop = bubble.paddingBottom = bubble.paddingLeft = bubble.paddingRight = 8;
  bubble.itemSpacing = 4;
  bubble.cornerRadius = 8;
  bubble.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; // White color
  bubble.x = selectedElem.bbox.x + selectedElem.bbox.width / 2;
  bubble.y = selectedElem.bbox.y + selectedElem.bbox.height / 2;

  const textNode = figma.createText();
  textNode.characters = text;
  textNode.fontSize = 12;
  textNode.fontName = { family: 'Inter', style: 'Regular' };
  textNode.textAutoResize = 'WIDTH_AND_HEIGHT';
  textNode.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]; // Black color

  bubble.appendChild(textNode);

  return bubble;
}

export function createSwipeArrow(selectedElem: UIElement, direction: string, distance: string): LineNode {
  direction = direction.replace(/\\/g, '').replace(/"/g, '');
  distance = distance.replace(/\\/g, '').replace(/"/g, '');

  const swipeLine = figma.createLine();
  let lineLength = distance === 'low' ? 40 : distance === 'high' ? 120 : 80;
  swipeLine.resize(lineLength, 0);

  swipeLine.strokeCap = 'ARROW_LINES';
  swipeLine.strokeWeight = 4;
  swipeLine.strokes = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
  swipeLine.x = selectedElem.bbox.x + selectedElem.bbox.width / 2;
  swipeLine.y = selectedElem.bbox.y + selectedElem.bbox.height / 2;

  switch (direction) {
    case 'up':
      swipeLine.rotation = -90;
      swipeLine.y -= lineLength / 2;
      break;
    case 'down':
      swipeLine.rotation = 90;
      swipeLine.y += lineLength / 2;
      break;
    case 'left':
      swipeLine.rotation = 180;
      swipeLine.x -= lineLength / 2;
      break;
    case 'right':
      swipeLine.rotation = 0;
      swipeLine.x += lineLength / 2;
      break;
  }
  return swipeLine;
}

export function createTouchPoint(selectedElem: UIElement): EllipseNode {
  const touchPoint = figma.createEllipse();
  touchPoint.x = selectedElem.bbox.x + selectedElem.bbox.width / 2;
  touchPoint.y = selectedElem.bbox.y + selectedElem.bbox.height / 2;
  touchPoint.resize(10, 10);
  touchPoint.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
  return touchPoint;
}

// UT Reports 프레임 생성 함수
function createUTReportsFrame(): FrameNode {
  const frame = figma.createFrame();
  frame.name = 'UT Reports';
  frame.layoutMode = 'VERTICAL';
  frame.itemSpacing = 32;
  frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 32;
  frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  return frame;
}

// UT Reports 프레임 가져오기 또는 생성 함수
export async function getOrCreateUTReportsFrame(): Promise<FrameNode> {
  // 현재 페이지에서 'UT Reports' 프레임 찾기
  const utReportsFrame = figma.currentPage.findChild(
    (node) => node.type === 'FRAME' && node.name === 'UT Reports'
  ) as FrameNode;

  // 없으면 새로 생성
  if (!utReportsFrame) {
    const frame = createUTReportsFrame();
    figma.currentPage.appendChild(frame);
    return frame;
  }

  return utReportsFrame;
}

// createTaskFrameWithNameAndDesc 함수 수정
export async function createTaskFrameWithNameAndDesc(taskData: TaskData): Promise<FrameNode> {
  // UT Reports 프레임 가져오기 또는 생성
  const utReportsFrame = await getOrCreateUTReportsFrame();

  // Generate timestamp-based name
  const now = new Date();
  const taskName = `self_explore_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(
    now.getSeconds()
  ).padStart(2, '0')}`;

  const taskFrame = createTaskFrame(taskName);

  // Task Frame을 UT Reports 프레임에 추가
  utReportsFrame.appendChild(taskFrame);

  // Node Name 추가
  const nameFrame = createNameFrame(taskName);
  taskFrame.appendChild(nameFrame);

  // Task Description 추가
  const taskDescFrame = createTaskDescFrame(taskData);
  taskFrame.appendChild(taskDescFrame);

  return taskFrame;
}

// export async function getGenerateReportPrompt(
//   taskData: TaskData,
//   screenshotInfo: ScreenshotInfo,
//   taskFrame: FrameNode,
//   dimensions?: ImageDimensions
// ) {
//   try {
//     // set initial variables (for the future use)
//     // let lastAct = 'None';

//     // request AI model and process response
//     const prompt = createPromptForTask(taskData);

//     // load dimensions if it is not provided
//     if (!dimensions) {
//       dimensions = await figma.clientStorage.getAsync('dimensions');
//     }
//     // create frames for the task and the image
//     const { previewFrameId, beforeImageFrameId, labeledImageFrameId, elemList } =
//       await createPreviewAndImageFrames(taskFrame, screenshotInfo, dimensions);

//     return {
//       prompt,
//       previewFrameId,
//       beforeImageFrameId,
//       labeledImageFrameId,
//       elemList
//     };
//   } catch (error) {
//     console.error('Error in generateReport:', error);
//     figma.notify('Failed to generate report', { timeout: 3000 });
//   }
// }

export async function createPreviewAndImageFrames(
  anatomyFrame: FrameNode,
  screenshotInfo: ScreenshotInfo,
  dimensions: ImageDimensions,
  roundCount: number
) {
  // Create preview frame
  const previewFrame = createPreviewFrame(roundCount);
  anatomyFrame.appendChild(previewFrame);

  // Create before image
  const beforeImageFrame = await createImageFrame(screenshotInfo.imageData, `${roundCount}_before`, dimensions);
  previewFrame.appendChild(beforeImageFrame);

  // Get element list
  const node = (await figma.getNodeByIdAsync(screenshotInfo.nodeId)) as SceneNode;
  if (!node) throw new Error('Node not found');
  const elemList = await createElemList(node);

  // Create labeled image
  const labeledImageFrame = await createLabeledImageFrame(elemList, screenshotInfo.imageData, dimensions, roundCount);
  // set time delay for the afterImage to load
  await delay(500);
  previewFrame.appendChild(labeledImageFrame);

  return {
    previewFrame: previewFrame,
    beforeImageFrame: beforeImageFrame,
    labeledImageFrame: labeledImageFrame,
    elemList: elemList,
  };
}

// export async function generateReportResult(
//   responseData: any,
//   previewFrameId: string,
//   elemList: UIElement[],
//   screenshotInfo: ScreenshotInfo,
//   taskFrame: FrameNode,
//   roundCount: number
// ) {
//   try {
//     if (responseData) {
//       console.log('Received response from AI');

//       // get the frames
//       const previewFrame = (await figma.getNodeByIdAsync(previewFrameId)) as FrameNode;

//       if (!previewFrame) {
//         throw new Error('Required frames not found');
//       }

//       const result = parseModelResponse(JSON.stringify(responseData));

//       if (!result) {
//         throw new Error('Failed to parse AI response');
//       }

//       console.log('AI Model Response:', result);

//       // Move focus to the task Frame report
//       figma.viewport.scrollAndZoomIntoView([taskFrame]);
//       console.log('Report generated successfully', taskFrame.id);

//       return result;
//     }
//   } catch (error) {
//     console.error('Error in generateReportResult:', error);
//     figma.notify('Failed to generate report', { timeout: 3000 });
//     return null;
//   }
// }

// export function parseModelResponse(
//   rsp: string
// ): { observation: string; thought: string; action: string; summary: string } | null {
//   try {
//     const observationMatch = rsp.match(/Observation: ([\s\S]*?)(?:\\n\\nThought:|$)/);
//     const thoughtMatch = rsp.match(/Thought: ([\s\S]*?)(?:\\n\\nAction:|$)/);
//     const actionMatch = rsp.match(/Action: ([\s\S]*?)(?:\\n\\nSummary:|$)/);
//     const summaryMatch = rsp.match(/Summary: ([\s\S]*?)(?="$)/);

//     console.log('rsp:', rsp);
//     console.log('Observation:', observationMatch);
//     console.log('Thought:', thoughtMatch);
  
//     if (!observationMatch || !thoughtMatch || !actionMatch || !summaryMatch) {
//       console.error('Failed to match one or more patterns:', {
//         observationMatch: !!observationMatch,
//         thoughtMatch: !!thoughtMatch,
//         actionMatch: !!actionMatch,
//         summaryMatch: !!summaryMatch,
//       });
//       console.error('Raw response:', rsp);
//       return null;
//     }

//     // 각 섹션의 내용을 트림하여 반환
//     return {
//       observation: observationMatch[1].trim(),
//       thought: thoughtMatch[1].trim(),
//       action: actionMatch[1].trim(),
//       summary: summaryMatch[1].trim(),
//     };
//   } catch (error) {
//     console.error('Error in parseModelResponse:', error);
//     return null;
//   }
// }

export async function getFrameImageBase64(node: SceneNode): Promise<string> {
  const imageBytes = await node.exportAsync({ format: 'JPG' });
  const base64Encode = figma.base64Encode(imageBytes);

  return base64Encode;
}

export function createTaskFrame(taskName: string) {
  const frame = figma.createFrame();
  frame.name = taskName;
  frame.layoutMode = 'VERTICAL';
  frame.itemSpacing = 64;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  return frame;
}

export function createNameFrame(nodeName: string) {
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

export function createTaskDescFrame(taskData: TaskData) {
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

  const descText = createText(taskData.taskDesc, 24, 'Regular');
  frame.appendChild(descText);

  if (taskData.personaDesc) {
    const personaText = createText(`As a person who is ${taskData.personaDesc}`, 24, 'Regular');
    frame.appendChild(personaText);
  }

  return frame;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseAction(action: string) {
  try {
    const actMatch = action.match(/(\w+)\((.*)\)/);
    if (!actMatch) {
      throw new Error('Invalid action format');
    }

    const [_, actName, args] = actMatch;
    return { actName, args };
  } catch (error) {
    console.error('Error in parseAction:', error);
    return { actName: 'FINISH', args: '' };
  }
}
