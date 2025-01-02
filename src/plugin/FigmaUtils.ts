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
  frame.itemSpacing = 64;
  frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 64;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  frame.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]; // Black background
  frame.cornerRadius = 16; // Add rounded corners

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
