// server-minimal.js - минимальный рабочий сервер
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // Для загрузки .env файлов

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Простой маршрут для проверки
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        message: 'Сервер работает',
        timestamp: new Date().toISOString(),
        node_version: process.version
    });
});

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Простой API (без базы данных)
app.get('/api/ideas', (req, res) => {
    const ideas = [
        {
            id: 1,
            title: 'Добро пожаловать на сайт!',
            description: 'Это демонстрационная версия сайта. База данных настраивается.',
            author: 'Администрация',
            votes: 10,
            status: 'pending',
            created_at: new Date().toISOString(),
            comment_count: 3,
            vote_count: 10
        },
        {
            id: 2,
            title: 'Как пользоваться сайтом',
            description: '1. Предложите свою идею\n2. Голосуйте за понравившиеся\n3. Обсуждайте в комментариях',
            author: 'Система',
            votes: 5,
            status: 'pending',
            created_at: new Date().toISOString(),
            comment_count: 2,
            vote_count: 5
        }
    ];
    res.json(ideas);
});

// Простая форма для добавления идеи (сохраняет в памяти)
let tempIdeas = [];
app.post('/api/ideas', (req, res) => {
    const { title, description, author } = req.body;
    
    if (!title || !description) {
        return res.status(400).json({ error: 'Заполните все поля' });
    }
    
    const newIdea = {
        id: Date.now(),
        title,
        description,
        author: author || 'Аноним',
        votes: 0,
        status: 'pending',
        created_at: new Date().toISOString(),
        comment_count: 0,
        vote_count: 0
    };
    
    tempIdeas.push(newIdea);
    res.json({ success: true, id: newIdea.id });
});

// Голосование
app.post('/api/ideas/:id/vote', (req, res) => {
    const ideaId = parseInt(req.params.id);
    const idea = tempIdeas.find(i => i.id === ideaId);
    
    if (idea) {
        idea.votes += 1;
        idea.vote_count += 1;
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Идея не найдена' });
    }
});

// Комментарии
app.get('/api/ideas/:id/comments', (req, res) => {
    res.json([
        {
            id: 1,
            idea_id: parseInt(req.params.id),
            author: 'Тестовый пользователь',
            text: 'Это тестовый комментарий',
            created_at: new Date().toISOString()
        }
    ]);
});

app.post('/api/ideas/:id/comments', (req, res) => {
    const { author, text } = req.body;
    
    if (!text) {
        return res.status(400).json({ error: 'Введите текст комментария' });
    }
    
    res.json({ 
        success: true, 
        id: Date.now(),
        message: 'Комментарий добавлен (демо-режим)'
    });
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ error: 'Страница не найдена' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err);
    res.status(500).json({ 
        error: 'Внутренняя ошибка сервера',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Сайт: http://localhost:${PORT}`);
    console.log(`🔧 Режим: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Временных идей: ${tempIdeas.length}`);
});
