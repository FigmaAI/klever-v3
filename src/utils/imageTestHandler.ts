export const createTestFrame = async (base64Image: string) => {
    try {
        // 필요한 폰트 로드
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        
        // Base64 디자열에서 데이터 부분만 추출 (헤더가 있는 경우 제거)
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
        
        // Base64 디코딩 (웹 환경에서 안전한 방법)
        try {
            // base64 문자열을 바이너리 문자열로 변환
            const binaryString = window.atob(base64Data);
            
            // 바이너리 문자열을 Uint8Array로 변환
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            console.log("Image data length:", bytes.length);
            
            // 이미지 생성
            const image = await figma.createImage(bytes);
            
            // 프레임 생성
            const frame = figma.createFrame();
            frame.name = "Screenshot Test " + new Date().toISOString();
            
            // 이미지 크기로 프레임 크기 설정
            frame.resize(500, 500);
            
            // 이미지 채우기 설정
            frame.fills = [{
                type: 'IMAGE',
                imageHash: image.hash,
                scaleMode: 'FILL'
            }];
            
            // 뷰포트 중앙에 배치
            const viewport = figma.viewport.center;
            frame.x = viewport.x - frame.width / 2;
            frame.y = viewport.y - frame.height / 2;
            
            // 선택 및 뷰포트 포커스
            figma.currentPage.selection = [frame];
            figma.viewport.scrollAndZoomIntoView([frame]);
            
            return { success: true, message: "Test frame created successfully" };
        } catch (decodeError) {
            console.error("Failed to decode base64:", decodeError);
            throw new Error("Invalid base64 image data");
        }
    } catch (error) {
        console.error("Failed to create test frame:", error);
        return { success: false, message: error.message };
    }
}; 