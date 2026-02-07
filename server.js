// server.js для MongoDB Atlas
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config(); // Для загрузки переменных окружения

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== ПОДКЛЮЧЕНИЕ К MONGODB ATLAS ====================

// Строка подключения из переменных окружения или локальная
const MONGODB_URI = process.env.MONGODB_URI || 
    'mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/school?retryWrites=true&w=majority';

console.log('🔄 Подключаюсь к MongoDB Atlas...');

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // 5 секунд на подключение
    socketTimeoutMS: 45000, // 45 секунд таймаут
})
.then(() => {
    console.log('✅ Успешно подключено к MongoDB Atlas!');
})
.catch((error) => {
    console.error('❌ Ошибка подключения к MongoDB:', error.message);
    console.log('💡 Проверьте:');
    console.log('1. Правильный ли пароль в строке подключения?');
    console.log('2. Добавили ли IP 0.0.0.0/0 в Network Access?');
    console.log('3. Работает ли интернет?');
});

// ==================== СХЕМЫ MONGODB ====================

// Схема для идей
const ideaSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Название идеи обязательно'],
        minlength: [3, 'Название должно быть минимум 3 символа'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Описание идеи обязательно'],
        minlength: [10, 'Описание должно быть минимум 10 символов'],
        trim: true
    },
    author: {
        type: String,
        required: [true, 'Автор обязателен'],
        default: 'Аноним',
        trim: true
    },
    votes: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'in_progress', 'completed'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // Добавляет createdAt и updatedAt автоматически
});

// Схема для комментариев
const commentSchema = new mongoose.Schema({
    ideaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Idea',
        required: [true, 'ID идеи обязателен']
    },
    author: {
        type: String,
        required: [true, 'Автор обязателен'],
        default: 'Аноним',
        trim: true
    },
    text: {
        type: String,
        required: [true, 'Текст комментария обязателен'],
        minlength: [2, 'Комментарий должен быть минимум 2 символа'],
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Схема для голосов
const voteSchema = new mongoose.Schema({
    ideaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Idea',
        required: [true, 'ID идеи обязателен']
    },
    userIp: {
        type: String,
        required: [true, 'IP пользователя обязателен']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Уникальный индекс для голосов (один человек - один голос)
voteSchema.index({ ideaId: 1, userIp: 1 }, { unique: true });

// Модели
const Idea = mongoose.model('Idea', ideaSchema);
const Comment = mongoose.model('Comment', commentSchema);
const Vote = mongoose.model('Vote', voteSchema);

// ==================== MIDDLEWARE ====================

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// ==================== ПОЛУЧЕНИЕ IP ПОЛЬЗОВАТЕЛЯ ====================

const getClientIp = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.ip || 
           req.connection.remoteAddress;
};

// ==================== ПРОВЕРКА ЗДОРОВЬЯ ====================

app.get('/api/health', async (req, res) => {
    try {
        const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        const ideasCount = await Idea.countDocuments();
        const commentsCount = await Comment.countDocuments();
        const votesCount = await Vote.countDocuments();
        
        res.json({
            status: 'healthy',
            database: dbStatus,
            mongodb: {
                connected: mongoose.connection.readyState === 1,
                host: mongoose.connection.host,
                name: mongoose.connection.name
            },
            stats: {
                ideas: ideasCount,
                comments: commentsCount,
                votes: votesCount
            },
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ==================== API ROUTES ====================

// 1. ПОЛУЧИТЬ ВСЕ ИДЕИ
app.get('/api/ideas', async (req, res) => {
    try {
        const ideas = await Idea.aggregate([
            {
                $lookup: {
                    from: 'comments',
                    localField: '_id',
                    foreignField: 'ideaId',
                    as: 'comments'
                }
            },
            {
                $lookup: {
                    from: 'votes',
                    localField: '_id',
                    foreignField: 'ideaId',
                    as: 'votes'
                }
            },
            {
                $addFields: {
                    comment_count: { $size: '$comments' },
                    vote_count: { $size: '$votes' }
                }
            },
            {
                $project: {
                    comments: 0,
                    votes: 0,
                    __v: 0
                }
            },
            {
                $sort: {
                    votes: -1,
                    createdAt: -1
                }
            }
        ]);

        // Преобразуем в формат, который ожидает фронтенд
        const formattedIdeas = ideas.map(idea => ({
            id: idea._id,
            title: idea.title,
            description: idea.description,
            author: idea.author,
            votes: idea.votes,
            status: idea.status,
            created_at: idea.createdAt,
            comment_count: idea.comment_count,
            vote_count: idea.vote_count
        }));

        res.json(formattedIdeas);
        
    } catch (error) {
        console.error('Ошибка получения идей:', error);
        res.status(500).json({ 
            error: 'Ошибка загрузки идей',
            message: error.message 
        });
    }
});

// 2. ДОБАВИТЬ НОВУЮ ИДЕЮ
app.post('/api/ideas', async (req, res) => {
    try {
        const { title, description, author } = req.body;

        // Валидация
        if (!title || !description) {
            return res.status(400).json({ 
                error: 'Все поля обязательны',
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

        const idea = new Idea({
            title: title.trim(),
            description: description.trim(),
            author: (author || 'Аноним').trim()
        });

        const savedIdea = await idea.save();

        res.status(201).json({
            success: true,
            message: 'Идея успешно добавлена!',
            id: savedIdea._id,
            idea: {
                id: savedIdea._id,
                title: savedIdea.title,
                author: savedIdea.author,
                status: savedIdea.status
            }
        });

    } catch (error) {
        console.error('Ошибка добавления идеи:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                error: 'Ошибка валидации',
                details: errors
            });
        }

        res.status(500).json({ 
            error: 'Не удалось добавить идею',
            message: error.message 
        });
    }
});

// 3. ПРОГОЛОСОВАТЬ ЗА ИДЕЮ
app.post('/api/ideas/:id/vote', async (req, res) => {
    try {
        const ideaId = req.params.id;
        const userIp = getClientIp(req);

        // Проверяем существование идеи
        const idea = await Idea.findById(ideaId);
        if (!idea) {
            return res.status(404).json({ 
                error: 'Идея не найдена',
                details: `Идея с ID ${ideaId} не существует`
            });
        }

        // Проверяем, не голосовал ли уже пользователь
        const existingVote = await Vote.findOne({ 
            ideaId: ideaId, 
            userIp: userIp 
        });

        if (existingVote) {
            return res.status(400).json({ 
                error: 'Вы уже голосовали за эту идею',
                details: 'Один пользователь может голосовать только один раз'
            });
        }

        // Начинаем транзакцию
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Создаем запись о голосовании
            const vote = new Vote({
                ideaId: ideaId,
                userIp: userIp
            });

            await vote.save({ session });

            // Увеличиваем счетчик голосов у идеи
            idea.votes += 1;
            await idea.save({ session });

            // Фиксируем транзакцию
            await session.commitTransaction();
            session.endSession();

            res.json({
                success: true,
                message: 'Ваш голос учтен!',
                votes: idea.votes
            });

        } catch (transactionError) {
            // Откатываем транзакцию при ошибке
            await session.abortTransaction();
            session.endSession();
            throw transactionError;
        }

    } catch (error) {
        console.error('Ошибка голосования:', error);
        
        if (error.code === 11000) { // Код дубликата в MongoDB
            return res.status(400).json({ 
                error: 'Вы уже голосовали за эту идею' 
            });
        }

        if (error.name === 'CastError') {
            return res.status(400).json({ 
                error: 'Неверный ID идеи',
                details: 'ID должен быть в формате MongoDB ObjectId'
            });
        }

        res.status(500).json({ 
            error: 'Не удалось проголосовать',
            message: error.message 
        });
    }
});

// 4. ДОБАВИТЬ КОММЕНТАРИЙ
app.post('/api/ideas/:id/comments', async (req, res) => {
    try {
        const ideaId = req.params.id;
        const { author, text } = req.body;

        // Проверяем существование идеи
        const idea = await Idea.findById(ideaId);
        if (!idea) {
            return res.status(404).json({ 
                error: 'Идея не найдена',
                details: `Идея с ID ${ideaId} не существует`
            });
        }

        // Валидация
        if (!text) {
            return res.status(400).json({ 
                error: 'Текст комментария обязателен' 
            });
        }

        if (text.length < 2) {
            return res.status(400).json({ 
                error: 'Комментарий слишком короткий',
                details: 'Минимум 2 символа'
            });
        }

        const comment = new Comment({
            ideaId: ideaId,
            author: (author || 'Аноним').trim(),
            text: text.trim()
        });

        const savedComment = await comment.save();

        res.status(201).json({
            success: true,
            message: 'Комментарий добавлен!',
            id: savedComment._id,
            comment: {
                id: savedComment._id,
                author: savedComment.author,
                text: savedComment.text,
                created_at: savedComment.createdAt
            }
        });

    } catch (error) {
        console.error('Ошибка добавления комментария:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                error: 'Ошибка валидации',
                details: errors
            });
        }

        if (error.name === 'CastError') {
            return res.status(400).json({ 
                error: 'Неверный ID идеи',
                details: 'ID должен быть в формате MongoDB ObjectId'
            });
        }

        res.status(500).json({ 
            error: 'Не удалось добавить комментарий',
            message: error.message 
        });
    }
});

// 5. ПОЛУЧИТЬ КОММЕНТАРИИ ДЛЯ ИДЕИ
app.get('/api/ideas/:id/comments', async (req, res) => {
    try {
        const ideaId = req.params.id;

        // Проверяем существование идеи
        const idea = await Idea.findById(ideaId);
        if (!idea) {
            return res.status(404).json({ 
                error: 'Идея не найдена',
                details: `Идея с ID ${ideaId} не существует`
            });
        }

        const comments = await Comment.find({ ideaId: ideaId })
            .sort({ createdAt: 1 })
            .select('-__v')
            .lean();

        // Форматируем для фронтенда
        const formattedComments = comments.map(comment => ({
            id: comment._id,
            idea_id: comment.ideaId,
            author: comment.author,
            text: comment.text,
            created_at: comment.createdAt
        }));

        res.json(formattedComments);

    } catch (error) {
        console.error('Ошибка получения комментариев:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ 
                error: 'Неверный ID идеи',
                details: 'ID должен быть в формате MongoDB ObjectId'
            });
        }

        res.status(500).json({ 
            error: 'Не удалось загрузить комментарии',
            message: error.message 
        });
    }
});

// 6. ПОЛУЧИТЬ СТАТИСТИКУ
app.get('/api/stats', async (req, res) => {
    try {
        const totalIdeas = await Idea.countDocuments();
        const totalComments = await Comment.countDocuments();
        const totalVotes = await Vote.countDocuments();
        
        // Самые популярные идеи
        const popularIdeas = await Idea.find()
            .sort({ votes: -1 })
            .limit(5)
            .select('title votes author')
            .lean();
        
        // Последние идеи
        const recentIdeas = await Idea.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('title createdAt author')
            .lean();

        res.json({
            total: {
                ideas: totalIdeas,
                comments: totalComments,
                votes: totalVotes
            },
            popular: popularIdeas.map(idea => ({
                title: idea.title,
                votes: idea.votes,
                author: idea.author
            })),
            recent: recentIdeas.map(idea => ({
                title: idea.title,
                created_at: idea.createdAt,
                author: idea.author
            })),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({ 
            error: 'Не удалось получить статистику',
            message: error.message 
        });
    }
});

// 7. ОБНОВИТЬ СТАТУС ИДЕИ (для админов)
app.patch('/api/ideas/:id/status', async (req, res) => {
    try {
        const ideaId = req.params.id;
        const { status } = req.body;
        
        const validStatuses = ['pending', 'approved', 'rejected', 'in_progress', 'completed'];
        
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ 
                error: 'Неверный статус',
                details: `Статус должен быть одним из: ${validStatuses.join(', ')}`
            });
        }

        const idea = await Idea.findByIdAndUpdate(
            ideaId,
            { status: status },
            { new: true, runValidators: true }
        );

        if (!idea) {
            return res.status(404).json({ 
                error: 'Идея не найдена' 
            });
        }

        res.json({
            success: true,
            message: `Статус обновлен на "${status}"`,
            idea: {
                id: idea._id,
                title: idea.title,
                status: idea.status
            }
        });

    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        res.status(500).json({ 
            error: 'Не удалось обновить статус',
            message: error.message 
        });
    }
});

// 8. УДАЛИТЬ ИДЕЮ (для админов)
app.delete('/api/ideas/:id', async (req, res) => {
    try {
        const ideaId = req.params.id;
        
        // Начинаем транзакцию
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Удаляем идею
            const deletedIdea = await Idea.findByIdAndDelete(ideaId, { session });
            
            if (!deletedIdea) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ 
                    error: 'Идея не найдена' 
                });
            }

            // Удаляем связанные комментарии
            await Comment.deleteMany({ ideaId: ideaId }, { session });
            
            // Удаляем связанные голоса
            await Vote.deleteMany({ ideaId: ideaId }, { session });

            // Фиксируем транзакцию
            await session.commitTransaction();
            session.endSession();

            res.json({
                success: true,
                message: 'Идея и все связанные данные удалены',
                deleted: {
                    idea: deletedIdea._id,
                    comments: 'все связанные',
                    votes: 'все связанные'
                }
            });

        } catch (transactionError) {
            await session.abortTransaction();
            session.endSession();
            throw transactionError;
        }

    } catch (error) {
        console.error('Ошибка удаления идеи:', error);
        res.status(500).json({ 
            error: 'Не удалось удалить идею',
            message: error.message 
        });
    }
});

// ==================== СТАТИЧЕСКИЕ ФАЙЛЫ ====================

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Все остальные маршруты → index.html (для SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== ОБРАБОТКА ОШИБОК ====================

// 404 - маршрут не найден
app.use((req, res) => {
    res.status(404).json({
        error: 'Маршрут не найден',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Глобальный обработчик ошибок
app.use((error, req, res, next) => {
    console.error('🔥 Глобальная ошибка:', error);
    
    res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
    });
});

// ==================== ЗАПУСК СЕРВЕРА ====================

const server = app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Сайт доступен по адресу: http://localhost:${PORT}`);
    console.log(`📊 MongoDB Atlas: ${mongoose.connection.readyState === 1 ? 'Подключено' : 'Не подключено'}`);
    console.log(`🔧 Режим: ${process.env.NODE_ENV || 'development'}`);
});

// ==================== КОРРЕКТНОЕ ЗАВЕРШЕНИЕ РАБОТЫ ====================

const gracefulShutdown = async (signal) => {
    console.log(`\n⚠️  Получен сигнал ${signal}, завершаем работу...`);
    
    try {
        // Закрываем сервер
        server.close(() => {
            console.log('✅ Сервер остановлен');
        });
        
        // Закрываем подключение к MongoDB
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('✅ Подключение к MongoDB закрыто');
        }
        
        console.log('👋 Работа завершена корректно');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Ошибка при завершении работы:', error);
        process.exit(1);
    }
};

// Обработка сигналов завершения
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

// Обработка необработанных исключений
process.on('uncaughtException', (error) => {
    console.error('💥 Необработанное исключение:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Необработанный промис:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});
