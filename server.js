const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Получить IP пользователя
const getClientIp = (req) => {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
};

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes

// Получить все идеи
app.get('/api/ideas', (req, res) => {
    db.getAllIdeas((err, ideas) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(ideas);
        }
    });
});

// Добавить новую идею
app.post('/api/ideas', (req, res) => {
    const { title, description, author } = req.body;
    
    if (!title || !description || !author) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }

    db.addIdea(title, description, author, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ 
                success: true, 
                id: this.lastID 
            });
        }
    });
});

// Проголосовать за идею
app.post('/api/ideas/:id/vote', (req, res) => {
    const ideaId = parseInt(req.params.id);
    const userIp = getClientIp(req);

    db.voteForIdea(ideaId, userIp, (err) => {
        if (err) {
            res.status(400).json({ error: err.message });
        } else {
            res.json({ success: true });
        }
    });
});

// Добавить комментарий
app.post('/api/ideas/:id/comments', (req, res) => {
    const ideaId = parseInt(req.params.id);
    const { author, text } = req.body;

    if (!author || !text) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }

    db.addComment(ideaId, author, text, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ 
                success: true, 
                id: this.lastID 
            });
        }
    });
});

// Получить комментарии для идеи
app.get('/api/ideas/:id/comments', (req, res) => {
    const ideaId = parseInt(req.params.id);
    
    db.getComments(ideaId, (err, comments) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(comments);
        }
    });
});

process.on('SIGTERM', () => {
    console.log('Сервер останавливается, создаем финальный бэкап...');
    if (db.createBackup) {
        db.createBackup();
    }
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Сервер прерывается, создаем финальный бэкап...');
    if (db.createBackup) {
        db.createBackup();
    }
    process.exit(0);
});
// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Откройте в браузере: http://localhost:${PORT}`);

});
