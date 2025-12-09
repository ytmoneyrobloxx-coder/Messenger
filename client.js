const express = require('express');
const path = require('path');

const app = express();

// Отключаем кэширование
app.use((req, res, next) => {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    next();
});

// Сервируем статические файлы
app.use(express.static(path.join(__dirname)));

// Запускаем сервер на порту 3000
app.listen(3000, () => {
    console.log('HTTP сервер запущен на порту 3000');
});
