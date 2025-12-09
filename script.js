// Глобальные переменные
let userId = null;
let currentChatId = 'general'; // Общий чат для всех
let currentChatName = 'Общий чат';
let ws = null;

// DOM элементы
let registerScreen, mainScreen, userNameInput, registerButton, onlineCount,
    messages, messageInput, sendButton, chatTitle;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    // Получаем элементы DOM
    registerScreen = document.getElementById('registerScreen');
    mainScreen = document.getElementById('mainScreen');
    userNameInput = document.getElementById('userName');
    registerButton = document.getElementById('registerButton');
    onlineCount = document.getElementById('onlineCount');
    messages = document.getElementById('messages-area');
    messageInput = document.getElementById('messageInput');
    sendButton = document.getElementById('sendButton');
    chatTitle = document.getElementById('chatTitle');

    // Показываем регистрацию
    registerScreen.style.display = 'flex';
    mainScreen.style.display = 'none';

    // Подключаемся
    connectWebSocket();

    // Слушатели
    registerButton.addEventListener('click', registerUser);
    registerButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') registerUser();
    });
    
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    userNameInput.focus();
}

function connectWebSocket() {
    ws = new WebSocket('ws://localhost:3000');

    ws.onopen = () => {
        console.log('✅ Подключено к серверу');
    };

    ws.onerror = (err) => {
        console.error('❌ Ошибка:', err);
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('[Received]', data.type, data);

            switch (data.type) {
                case 'registered':
                    userId = data.userId;
                    currentChatId = data.chatId;
                    currentChatName = data.chatName;
                    
                    registerScreen.style.display = 'none';
                    mainScreen.style.display = 'flex';
                    
                    chatTitle.textContent = currentChatName;
                    messages.innerHTML = '';
                    
                    messageInput.focus();
                    console.log('✅ Вы зарегистрированы, ID:', userId);
                    break;

                case 'onlineCount':
                    onlineCount.textContent = data.count;
                    break;

                case 'message':
                    if (data.chatId === currentChatId) {
                        displayMessage(data.senderName, data.text, data.timestamp);
                    }
                    break;
            }
        } catch (e) {
            console.error('❌ Ошибка обработки:', e);
        }
    };

    ws.onclose = () => {
        console.log('⚠️ Отключено от сервера');
    };
}

function registerUser() {
    const name = userNameInput.value.trim();
    if (!name) {
        alert('Введите имя!');
        return;
    }

    console.log('[Register] Отправка:', { type: 'register', name });
    ws.send(JSON.stringify({
        type: 'register',
        name
    }));
}

function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    console.log('[SendMessage] Отправка:', { type: 'sendMessage', chatId: currentChatId, text });
    
    ws.send(JSON.stringify({
        type: 'sendMessage',
        chatId: currentChatId,
        text
    }));

    messageInput.value = '';
    messageInput.focus();
}

function displayMessage(senderName, text, timestamp) {
    const msg = document.createElement('div');
    const isSent = senderName === userNameInput.value.trim();
    msg.className = `message ${isSent ? 'sent' : 'received'}`;

    const time = new Date(timestamp).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });

    let html = '';
    if (!isSent) {
        html += `<div class="message-sender">${escapeHtml(senderName)}</div>`;
    }
    html += `<div class="message-text">${escapeHtml(text)}</div>`;
    html += `<div class="message-time">${time}</div>`;

    msg.innerHTML = html;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// При выходе
window.addEventListener('beforeunload', () => {
    if (ws) ws.close();
});
