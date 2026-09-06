# 🔐 VPN Guard - Мобильное VPN Приложение

Полнофункциональное мобильное VPN приложение для Android и iOS с защитой от DDoS.

## 📋 Возможности

✅ Быстрое подключение/отключение VPN  
✅ Выбор серверов из разных стран  
✅ Мониторинг скорости и трафика в реальном времени  
✅ Безопасное хранение токенов (SecureStore)  
✅ Поддержка iOS и Android  
✅ Темная тема интерфейса  
✅ Настройки (Kill Switch, блокировка рекламы)  
✅ Регистрация и вход в аккаунт  
✅ Native модули для оптимальной производительности  

## 🚀 Установка и запуск

### Требования
- Node.js >= 14
- Expo CLI
- iOS/Android SDK (для нативных модулей)

### Установка

```bash
# Клонируем репозиторий
git clone https://github.com/alexoilan73-coder/vpn-mobile-app-complete.git
cd vpn-mobile-app-complete

# Устанавливаем зависимости
npm install

# Для iOS
cd ios && pod install && cd ..

# Для Android
cd android && ./gradlew build && cd ..
```

### Запуск

```bash
# Общее (Expo)
npm start

# На iOS
npm run ios

# На Android
npm run android

# На Web
npm run web
```

## 📁 Структура проекта

```
.
├── App.js                          # Главное приложение
├── screens/
│   └── AuthScreen.js              # Экран аутентификации
├── utils/
│   └── vpnNative.js               # Native VPN модули
├── ios/
│   ├── VPNModule.swift            # iOS VPN модуль
│   └── Info.plist                 # Конфигурация iOS
├── android/
│   ├── VPNModule.kt               # Android VPN модуль
│   ├── VPNService.kt              # Android сервис
│   └── AndroidManifest.xml        # Конфигурация Android
├── backend/
│   ├── server.js                  # Основной VPN сервер
│   └── cloudflare-protection.js   # DDoS защита
├── package.json                   # Зависимости
└── README.md                      # Этот файл
```

## 🔧 Конфигурация

### Backend

Отредактируйте `API_URL` в файлах:
- `App.js`
- `screens/AuthScreen.js`

```javascript
const API_URL = 'https://your-vpn-server.com';
```

### iOS

Обновите `Info.plist` с вашими данными для VPN.

### Android

Обновите `AndroidManifest.xml` и `VPNService.kt` для вашего сервера.

## 🔐 Безопасность

- ✅ TLS 1.3 шифрование
- ✅ AES-256 для IPSec
- ✅ Безопасное хранение токенов
- ✅ Rate limiting против DDoS
- ✅ Двухфакторная аутентификация (готово)

## 📱 Системные требования

**iOS:**
- iOS 13.0 и выше
- VPN разрешения в Info.plist

**Android:**
- Android 8.0 (API 26) и выше
- VPN разрешения в AndroidManifest.xml

## 🤝 Вклад

Приветствуются pull requests! Для серьезных изменений сначала откройте issue.

## 📄 Лицензия

MIT

## 📞 Поддержка

Если у вас возникли проблемы, откройте issue на GitHub.
