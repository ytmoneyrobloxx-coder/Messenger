const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Отключаем кэширование
app.use((req, res, next) => {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    next();
});

// Раздача статических файлов
app.use(express.static('public'));
app.use(express.static(path.join(__dirname)));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Хранилище
const users = new Map(); // userId → {name, ws}
const GENERAL_CHAT_ID = 'general'; // Общий чат для всех
const generalChat = {
    id: GENERAL_CHAT_ID,
    name: 'Общий чат',
    messages: []
};

// Обработка WebSocket подключений
wss.on('connection', (ws) => {
    let userId = null;

    console.log('[WebSocket] Новое подключение');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('[Message]', data.type, data);

            switch (data.type) {
                // Регистрация пользователя
                case 'register':
                    userId = Date.now() + Math.random();
                    users.set(userId, { name: data.name, ws, id: userId });
                    
                    ws.send(JSON.stringify({ 
                        type: 'registered', 
                        userId,
                        chatId: GENERAL_CHAT_ID,
                        chatName: generalChat.name
                    }));
                    
                    broadcastOnlineCount();
                    console.log('[Register] Пользователь:', data.name, 'ID:', userId);
                    break;

                // Отправка сообщения
                case 'sendMessage':
                    if (data.chatId === GENERAL_CHAT_ID) {
                        const sender = users.get(userId);
                        
                        if (!sender) {
                            console.error('[SendMessage] Отправитель не найден');
                            return;
                        }

                        const messageObj = {
                            id: Date.now(),
                            senderName: sender.name,
                            senderId: userId,
                            text: data.text,
                            timestamp: new Date().toISOString()
                        };

                        // Сохраняем сообщение
                        generalChat.messages.push(messageObj);

                        // Отправляем всем пользователям
                        wss.clients.forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({
                                    type: 'message',
                                    chatId: GENERAL_CHAT_ID,
                                    senderName: sender.name,
                                    text: data.text,
                                    timestamp: messageObj.timestamp
                                }));
                            }
                        });

                        console.log('[SendMessage] Сообщение отправлено в общий чат');
                    }
                    break;
            }
        } catch (e) {
            console.error('[Error] Ошибка при обработке сообщения:', e);
        }
    });

    ws.on('close', () => {
        if (userId) {
            users.delete(userId);
            console.log('[Close] Пользователь отключился:', userId);
            broadcastOnlineCount();
        }
    });

    ws.on('error', (error) => {
        console.error('[WebSocket Error]', error);
    });
});

// Рассылка количества онлайн
function broadcastOnlineCount() {
    const count = users.size;
    const message = JSON.stringify({ type: 'onlineCount', count });
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
    console.log("Server started on port " + PORT);
});
