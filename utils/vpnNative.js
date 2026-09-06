import { NativeModules, Platform } from 'react-native';

const VPNModule = NativeModules.VPNModule;

export const VPNNative = {
  async connect(serverAddress) {
    try {
      const result = await VPNModule.startVPN(serverAddress);
      return result;
    } catch (error) {
      console.error('Ошибка подключения:', error);
      throw error;
    }
  },

  async disconnect() {
    try {
      const result = await VPNModule.stopVPN();
      return result;
    } catch (error) {
      console.error('Ошибка отключения:', error);
      throw error;
    }
  },

  async getStatus() {
    try {
      const result = await VPNModule.getVPNStatus();
      return result.status;
    } catch (error) {
      console.error('Ошибка получения статуса:', error);
      throw error;
    }
  },
};