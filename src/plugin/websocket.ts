import { WSMessageType, TestConfig } from '../typings/types';

export class WebSocketClient {
    private testConfig: Partial<TestConfig> = {};

    constructor() {
        this.init();
    }

    private init() {
        // 초기화 메시지 전송
        figma.ui.postMessage({
            type: WSMessageType.INIT,
            payload: { status: 'connected' }
        });
    }

    // Step 1: URL 설정
    public setInitialConfig(url: string, password?: string) {
        this.testConfig = { url, password };
        figma.ui.postMessage({
            type: 'config-set',
            payload: this.testConfig
        });
    }

    // Step 2: 테스트 시작
    public startTest(taskDesc: string, personaDesc?: string) {
        if (!this.testConfig.url) {
            throw new Error('URL is not set. Please complete Step 1 first.');
        }

        const config: TestConfig = {
            ...this.testConfig as TestConfig,
            taskDesc,
            personaDesc
        };

        figma.ui.postMessage({
            type: WSMessageType.START_TEST,
            payload: config
        });
    }

    public stopTest() {
        figma.ui.postMessage({
            type: WSMessageType.STOP_TEST
        });
    }

    public getStatus() {
        figma.ui.postMessage({
            type: WSMessageType.GET_STATUS
        });
    }

    public close() {
        figma.ui.postMessage({
            type: WSMessageType.STOP_TEST,
            payload: { status: 'disconnected' }
        });
    }
}