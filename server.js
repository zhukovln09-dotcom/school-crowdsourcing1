// server.js - версия с авторизацией и ролями
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('./database-mongo.js'); // Импорт MongoDB

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Сессии
app.use(session({
    secret: process.env.SESSION_SECRET || 'school-crowdsourcing-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000, // 24 часа
        secure: process.env.NODE_ENV === 'production'
    }
}));

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Настройка email для верификации
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

// Middleware для проверки авторизации
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    next();
};

// Middleware для проверки ролей
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }
        if (!roles.includes(req.session.user.role)) {
            return res.status(403).json({ error: 'Недостаточно прав' });
        }
        next();
    };
};

// Получить IP пользователя
const getClientIp = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.ip || 
           req.connection.remoteAddress;
};

// ==================== API РОУТЫ ДЛЯ АВТОРИЗАЦИИ ====================

// Регистрация
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, username } = req.body;
        
        // Валидация
        if (!email || !password || !username) {
            return res.status(400).json({ error: 'Заполните все поля' });
        }
        
        if (!email.includes('@')) {
            return res.status(400).json({ error: 'Некорректный email' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
        }
        
        // Проверяем, существует ли пользователь
        const existingUser = await db.User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }
        
        // Хешируем пароль
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Генерируем код верификации
        const verificationCode = crypto.randomInt(100000, 999999).toString();
        
        // Создаем пользователя
        const user = new db.User({
            email,
            passwordHash: hashedPassword,
            username,
            role: 'user',
            verificationCode,
            verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 часа
            emailVerified: false
        });
        
        await user.save();
        
        // Отправляем email с кодом верификации
        const mailOptions = {
            from: process.env.EMAIL_USER || 'noreply@school-project.ru',
            to: email,
            subject: 'Код подтверждения регистрации',
            html: `
                <h2>Добро пожаловать в нашу школьную платформу!</h2>
                <p>Ваш код подтверждения: <strong>${verificationCode}</strong></p>
                <p>Код действителен в течение 24 часов.</p>
                <p>Если вы не регистрировались на нашем сайте, проигнорируйте это письмо.</p>
            `
        };
        
        await emailTransporter.sendMail(mailOptions);
        
        res.json({ 
            success: true, 
            message: 'Регистрация успешна! Проверьте email для подтверждения.',
            userId: user._id
        });
        
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Ошибка регистрации' });
    }
});

// Верификация email
app.post('/api/auth/verify', async (req, res) => {
    try {
        const { email, code } = req.body;
        
        const user = await db.User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        if (user.emailVerified) {
            return res.status(400).json({ error: 'Email уже подтвержден' });
        }
        
        if (user.verificationCode !== code) {
            return res.status(400).json({ error: 'Неверный код подтверждения' });
        }
        
        if (user.verificationExpires < new Date()) {
            return res.status(400).json({ error: 'Код подтверждения истек' });
        }
        
        user.emailVerified = true;
        user.verificationCode = null;
        user.verificationExpires = null;
        await user.save();
        
        res.json({ 
            success: true, 
            message: 'Email успешно подтвержден! Теперь вы можете войти.'
        });
        
    } catch (error) {
        console.error('Ошибка верификации:', error);
        res.status(500).json({ error: 'Ошибка верификации' });
    }
});

// Вход
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await db.User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        
        if (!user.emailVerified) {
            return res.status(401).json({ error: 'Подтвердите email для входа' });
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        
        // Создаем сессию
        req.session.user = {
            id: user._id,
            email: user.email,
            username: user.username,
            role: user.role
        };
        
        // Обновляем время последнего входа
        user.lastLogin = new Date();
        await user.save();
        
        res.json({ 
            success: true, 
            message: 'Вход успешен',
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                role: user.role
            }
        });
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Ошибка входа' });
    }
});

// Вход по пригласительному коду (для модераторов и контент-менеджеров)
app.post('/api/auth/login-with-code', async (req, res) => {
    try {
        const { code } = req.body;
        
        // Ищем код
        const invitation = await db.InvitationCode.findOne({ code });
        if (!invitation) {
            return res.status(404).json({ error: 'Неверный пригласительный код' });
        }
        
        if (invitation.expiresAt && invitation.expiresAt < new Date()) {
            return res.status(400).json({ error: 'Срок действия кода истек' });
        }
        
        if (invitation.maxUses && invitation.useCount >= invitation.maxUses) {
            return res.status(400).json({ error: 'Код использован максимальное количество раз' });
        }
        
        // Создаем временную сессию
        req.session.tempUser = {
            role: invitation.role,
            invitationId: invitation._id
        };
        
        res.json({ 
            success: true, 
            message: 'Код принят',
            role: invitation.role
        });
        
    } catch (error) {
        console.error('Ошибка входа по коду:', error);
        res.status(500).json({ error: 'Ошибка входа по коду' });
    }
});

// Завершение регистрации по коду
app.post('/api/auth/complete-code-registration', async (req, res) => {
    try {
        const { email, password, username } = req.body;
        
        if (!req.session.tempUser) {
            return res.status(400).json({ error: 'Сессия истекла' });
        }
        
        // Валидация
        if (!email || !password || !username) {
            return res.status(400).json({ error: 'Заполните все поля' });
        }
        
        // Проверяем email
        const existingUser = await db.User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }
        
        // Хешируем пароль
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Создаем пользователя с ролью из приглашения
        const user = new db.User({
            email,
            passwordHash: hashedPassword,
            username,
            role: req.session.tempUser.role,
            emailVerified: true // Для специальных ролей подтверждение не требуется
        });
        
        await user.save();
        
        // Обновляем пригласительный код
        const invitation = await db.InvitationCode.findById(req.session.tempUser.invitationId);
        if (invitation) {
            invitation.usedBy = user._id;
            invitation.usedAt = new Date();
            invitation.useCount += 1;
            await invitation.save();
        }
        
        // Создаем постоянную сессию
        req.session.user = {
            id: user._id,
            email: user.email,
            username: user.username,
            role: user.role
        };
        
        // Очищаем временную сессию
        delete req.session.tempUser;
        
        res.json({ 
            success: true, 
            message: 'Регистрация успешна!',
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                role: user.role
            }
        });
        
    } catch (error) {
        console.error('Ошибка завершения регистрации:', error);
        res.status(500).json({ error: 'Ошибка регистрации' });
    }
});

// Выход
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Выход успешен' });
});

// Получить текущего пользователя
app.get('/api/auth/me', (req, res) => {
    if (req.session.user) {
        res.json({ 
            success: true, 
            user: req.session.user 
        });
    } else {
        res.json({ 
            success: false, 
            user: null 
        });
    }
});

// Проверка здоровья API
app.get('/api/health', async (req, res) => {
    try {
        const connectionStatus = await db.testConnection();
        
        res.json({ 
            status: 'healthy',
            database: connectionStatus.connected ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString(),
            mongo: connectionStatus
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'unhealthy',
            error: error.message 
        });
    }
});

// Получить статистику
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await db.getStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== API РОУТЫ ДЛЯ ИДЕЙ ====================

// Получить все идеи
app.get('/api/ideas', async (req, res) => {
    try {
        const ideas = await db.getAllIdeas();
        res.json(ideas);
    } catch (error) {
        console.error('Ошибка загрузки идей:', error);
        res.status(500).json({ error: 'Ошибка загрузки идей. Попробуйте позже.' });
    }
});

// Добавить новую идею
app.post('/api/ideas', requireAuth, async (req, res) => {
    try {
        const { title, description } = req.body;
        
        // Валидация
        if (!title || !description) {
            return res.status(400).json({ 
                error: 'Заполните все поля',
                details: 'Нужны название и описание идеи'
            });
        }
        
        if (title.length < 3) {
            return res.status(400).json({ 
                error: 'Название слишком короткое',
                details: 'Минимум 3 символа'
            });
        }
        
        if (description.length < 10) {
            return res.status(400).json({ 
                error: 'Описание слишком короткое',
                details: 'Минимум 10 символов'
            });
        }
        
        // Автор берется из сессии
        const author = req.session.user.username || req.session.user.email;
        
        const result = await db.addIdea(title, description, author, req.session.user.id);
        
        res.json({ 
            success: true, 
            message: 'Идея успешно добавлена!',
            id: result.id
        });
        
    } catch (error) {
        console.error('Ошибка добавления идеи:', error);
        
        if (error.message.includes('обязательно') || 
            error.message.includes('должно быть')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Не удалось добавить идею' });
        }
    }
});

// Проголосовать за идею
app.post('/api/ideas/:id/vote', requireAuth, async (req, res) => {
    try {
        const ideaId = req.params.id;
        
        if (!ideaId) {
            return res.status(400).json({ error: 'Не указан ID идеи' });
        }
        
        // Используем ID пользователя вместо IP
        const userId = req.session.user.id;
        
        await db.voteForIdea(ideaId, userId);
        
        res.json({ 
            success: true,
            message: 'Ваш голос учтен!'
        });
        
    } catch (error) {
        console.error('Ошибка голосования:', error);
        
        if (error.message.includes('уже голосовали')) {
            res.status(400).json({ error: error.message });
        } else if (error.message.includes('не найдена')) {
            res.status(404).json({ error: 'Идея не найдена' });
        } else {
            res.status(500).json({ error: 'Ошибка голосования' });
        }
    }
});

// Добавить комментарий
app.post('/api/ideas/:id/comments', requireAuth, async (req, res) => {
    try {
        const ideaId = req.params.id;
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({ 
                error: 'Введите текст комментария'
            });
        }
        
        if (text.length < 2) {
            return res.status(400).json({ 
                error: 'Комментарий слишком короткий'
            });
        }
        
        // Автор берется из сессии
        const author = req.session.user.username || req.session.user.email;
        
        const result = await db.addComment(ideaId, author, text);
        
        res.json({ 
            success: true,
            message: 'Комментарий добавлен!',
            id: result.id
        });
        
    } catch (error) {
        console.error('Ошибка добавления комментария:', error);
        
        if (error.message.includes('не найдена')) {
            res.status(404).json({ error: 'Идея не найдена' });
        } else {
            res.status(500).json({ error: 'Не удалось добавить комментарий' });
        }
    }
});

// Получить комментарии для идеи
app.get('/api/ideas/:id/comments', async (req, res) => {
    try {
        const ideaId = req.params.id;
        const comments = await db.getComments(ideaId);
        
        res.json(comments);
        
    } catch (error) {
        console.error('Ошибка загрузки комментариев:', error);
        res.status(500).json({ error: 'Не удалось загрузить комментарии' });
    }
});

// ==================== API РОУТЫ ДЛЯ МОДЕРАТОРОВ ====================

// Удалить идею (только модератор)
app.delete('/api/ideas/:id', requireRole('moderator', 'admin'), async (req, res) => {
    try {
        const ideaId = req.params.id;
        
        const result = await db.deleteIdea(ideaId);
        
        res.json({ 
            success: true,
            message: 'Идея удалена'
        });
        
    } catch (error) {
        console.error('Ошибка удаления идеи:', error);
        res.status(500).json({ error: 'Не удалось удалить идею' });
    }
});

// Удалить комментарий (только модератор)
app.delete('/api/comments/:id', requireRole('moderator', 'admin'), async (req, res) => {
    try {
        const commentId = req.params.id;
        
        const result = await db.deleteComment(commentId);
        
        res.json({ 
            success: true,
            message: 'Комментарий удален'
        });
        
    } catch (error) {
        console.error('Ошибка удаления комментария:', error);
        res.status(500).json({ error: 'Не удалось удалить комментарий' });
    }
});

// Получить всех пользователей (только админ)
app.get('/api/admin/users', requireRole('admin'), async (req, res) => {
    try {
        const users = await db.User.find({}, '-passwordHash -verificationCode');
        res.json(users);
    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        res.status(500).json({ error: 'Ошибка получения пользователей' });
    }
});

// Создать пригласительный код (только админ)
app.post('/api/admin/invitation-codes', requireRole('admin'), async (req, res) => {
    try {
        const { role, maxUses, expiresInHours } = req.body;
        
        if (!role || !['moderator', 'content_manager'].includes(role)) {
            return res.status(400).json({ error: 'Некорректная роль' });
        }
        
        // Генерируем код
        const code = crypto.randomBytes(8).toString('hex').toUpperCase();
        
        const invitation = new db.InvitationCode({
            code,
            role,
            createdBy: req.session.user.id,
            maxUses: maxUses || 1,
            expiresAt: expiresInHours ? 
                new Date(Date.now() + expiresInHours * 60 * 60 * 1000) : 
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней по умолчанию
        });
        
        await invitation.save();
        
        res.json({ 
            success: true,
            message: 'Код создан',
            code: invitation.code,
            expiresAt: invitation.expiresAt
        });
        
    } catch (error) {
        console.error('Ошибка создания кода:', error);
        res.status(500).json({ error: 'Ошибка создания кода' });
    }
});

// ==================== API РОУТЫ ДЛЯ КОНТЕНТ-МЕНЕДЖЕРОВ ====================

// Промодерировать идею (контент-менеджер)
app.put('/api/ideas/:id/moderate', requireRole('content_manager', 'admin'), async (req, res) => {
    try {
        const ideaId = req.params.id;
        const { status, reviewNotes, isFeatured } = req.body;
        
        const result = await db.moderateIdea(
            ideaId, 
            req.session.user.id, 
            status, 
            reviewNotes, 
            isFeatured
        );
        
        res.json({ 
            success: true,
            message: 'Идея промодерирована'
        });
        
    } catch (error) {
        console.error('Ошибка модерации идеи:', error);
        res.status(500).json({ error: 'Ошибка модерации' });
    }
});

// Получить идеи для модерации
app.get('/api/ideas/for-moderation', requireRole('content_manager', 'admin'), async (req, res) => {
    try {
        const ideas = await db.getIdeasForModeration();
        res.json(ideas);
    } catch (error) {
        console.error('Ошибка получения идей:', error);
        res.status(500).json({ error: 'Ошибка получения идей' });
    }
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ error: 'Страница не найдена' });
});

// Обработка ошибок
app.use((error, req, res, next) => {
    console.error('Глобальная ошибка:', error);
    res.status(500).json({ 
        error: 'Внутренняя ошибка сервера',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Сайт: http://localhost:${PORT}`);
    console.log(`📊 MongoDB: ${process.env.MONGODB_URI ? 'Настроен' : 'Используется локальная строка'}`);
});
