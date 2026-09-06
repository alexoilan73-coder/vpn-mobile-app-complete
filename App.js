import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://your-vpn-server.com';

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [vpnStats, setVpnStats] = useState({
    speed: '0 Mbps',
    dataUsed: '0 MB',
    uptime: '0s',
  });
  const [userIP, setUserIP] = useState('Loading...');

  useEffect(() => {
    loadServers();
    loadUserData();
    setupVPNMonitoring();
  }, []);

  const loadServers = async () => {
    try {
      const response = await axios.get(`${API_URL}/servers`);
      setServers(response.data);
      if (response.data.length > 0) {
        setSelectedServer(response.data[0]);
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось загрузить список серверов');
      console.error(error);
    }
  };

  const loadUserData = async () => {
    try {
      const token = await SecureStore.getItemAsync('vpn_token');
      if (token) {
        const response = await axios.get(`${API_URL}/user/ip`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserIP(response.data.ip);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных пользователя:', error);
    }
  };

  const setupVPNMonitoring = () => {
    const interval = setInterval(() => {
      if (isConnected) {
        setVpnStats((prev) => ({
          ...prev,
          speed: (Math.random() * 100 + 20).toFixed(1) + ' Mbps',
          dataUsed: (Math.random() * 500 + 50).toFixed(0) + ' MB',
          uptime: String(
            parseInt(prev.uptime.split('s')[0]) + 1
          ) + 's',
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  };

  const connectVPN = async () => {
    if (!selectedServer) {
      Alert.alert('Ошибка', 'Выберите сервер');
      return;
    }

    setIsLoading(true);
    try {
      const token = await SecureStore.getItemAsync('vpn_token');
      const response = await axios.post(
        `${API_URL}/vpn/connect`,
        { serverId: selectedServer.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setIsConnected(true);
        setVpnStats({
          speed: '0 Mbps',
          dataUsed: '0 MB',
          uptime: '0s',
        });
        Alert.alert('Успех', `Подключено к ${selectedServer.country}`);
      }
    } catch (error) {
      Alert.alert('Ошибка подключения', error.response?.data?.message || 'Попробуйте снова');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectVPN = async () => {
    setIsLoading(true);
    try {
      const token = await SecureStore.getItemAsync('vpn_token');
      await axios.post(
        `${API_URL}/vpn/disconnect`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsConnected(false);
      Alert.alert('Отключено', 'VPN отключен');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось отключиться');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVPN = () => {
    if (isConnected) {
      disconnectVPN();
    } else {
      connectVPN();
    }
  };

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.scrollView}>
        {/* Заголовок */}
        <View style={styles.header}>
          <Text style={styles.title}>🔐 VPN Guard</Text>
          <Text style={styles.subtitle}>Защищенный интернет</Text>
        </View>

        {/* Статус подключения */}
        <View style={styles.statusCard}>
          <LinearGradient
            colors={
              isConnected ? ['#4CAF50', '#45a049'] : ['#2196F3', '#1976D2']
            }
            style={styles.statusGradient}
          >
            <Text style={styles.statusText}>
              {isConnected ? '✓ ПОДКЛЮЧЕНО' : '✗ ОТКЛЮЧЕНО'}
            </Text>
            <Text style={styles.serverName}>
              {selectedServer ? `${selectedServer.country} - ${selectedServer.region}` : 'Нет выбора'}
            </Text>
          </LinearGradient>
        </View>

        {/* Большая кнопка подключения */}
        <TouchableOpacity
          style={[
            styles.powerButton,
            isConnected && styles.powerButtonActive,
          ]}
          onPress={toggleVPN}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color="white" />
          ) : (
            <Text style={styles.powerButtonText}>
              {isConnected ? '⊘' : '◉'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Статистика */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Скорость</Text>
            <Text style={styles.statValue}>{vpnStats.speed}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Данные</Text>
            <Text style={styles.statValue}>{vpnStats.dataUsed}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Время</Text>
            <Text style={styles.statValue}>{vpnStats.uptime}</Text>
          </View>
        </View>

        {/* IP адрес */}
        <View style={styles.ipCard}>
          <Text style={styles.ipLabel}>Ваш IP адрес:</Text>
          <Text style={styles.ipValue}>{userIP}</Text>
        </View>

        {/* Выбор серверов */}
        <View style={styles.serversSection}>
          <Text style={styles.sectionTitle}>Доступные серверы</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.serversScroll}
          >
            {servers.map((server) => (
              <TouchableOpacity
                key={server.id}
                style={[
                  styles.serverCard,
                  selectedServer?.id === server.id && styles.serverCardActive,
                ]}
                onPress={() => setSelectedServer(server)}
              >
                <Text style={styles.serverFlag}>
                  {getCountryFlag(server.country)}
                </Text>
                <Text style={styles.serverText}>{server.country}</Text>
                <Text style={styles.serverRegion}>{server.region}</Text>
                <Text style={styles.serverLoad}>Load: {server.load}%</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Настройки */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Параметры</Text>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Автоподключение</Text>
            <Switch
              style={styles.switch}
              trackColor={{ false: '#3e3e3e', true: '#4CAF50' }}
              thumbColor={true ? '#4CAF50' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Блокировка рекламы</Text>
            <Switch
              style={styles.switch}
              trackColor={{ false: '#3e3e3e', true: '#4CAF50' }}
              thumbColor={true ? '#4CAF50' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Kill Switch</Text>
            <Switch
              style={styles.switch}
              trackColor={{ false: '#3e3e3e', true: '#4CAF50' }}
              thumbColor={false ? '#4CAF50' : '#f4f3f4'}
            />
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

// Функция для получения флага страны
function getCountryFlag(country) {
  const flags = {
    US: '🇺🇸',
    DE: '🇩🇪',
    JP: '🇯🇵',
    UK: '🇬🇧',
    FR: '🇫🇷',
    RU: '🇷🇺',
    CN: '🇨🇳',
    AU: '🇦🇺',
  };
  return flags[country] || '🌍';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
  },
  statusCard: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 15,
    overflow: 'hidden',
  },
  statusGradient: {
    paddingVertical: 25,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  serverName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  powerButton: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  powerButtonActive: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
  },
  powerButtonText: {
    fontSize: 50,
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 25,
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  ipCard: {
    marginHorizontal: 20,
    marginBottom: 30,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  ipLabel: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 8,
  },
  ipValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'monospace',
  },
  serversSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 20,
    marginBottom: 15,
  },
  serversScroll: {
    paddingHorizontal: 20,
  },
  serverCard: {
    width: 100,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  serverCardActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#1a2a3a',
  },
  serverFlag: {
    fontSize: 32,
    marginBottom: 8,
  },
  serverText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  serverRegion: {
    fontSize: 11,
    color: '#aaa',
    marginBottom: 6,
  },
  serverLoad: {
    fontSize: 10,
    color: '#4CAF50',
  },
  settingsSection: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#16213e',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  settingLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  switch: {
    transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
  },
});