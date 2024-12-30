import { PluginMessage } from '../typings/types';

export const sendPluginMessage = (type: PluginMessage['type'], payload?: any) => {
    parent.postMessage({ 
        pluginMessage: { type, ...payload }
    }, '*');
};

export const handlePluginError = (message: string) => {
    console.error(message);
    sendPluginMessage('error', { message });
}; 