// database-mongo.js - для MongoDB Atlas с авторизацией
const mongoose = require('mongoose');

// Строка подключения к MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 
    'mongodb+srv://Leonid:yzF-UgN-teN-TQ8@cluster0.52cmiku.mongodb.net/?appName=Cluster0&serverSelectionTimeoutMS=5000&socketTimeoutMS=45000';

// Подключение к MongoDB
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ Успешно подключено к MongoDB Atlas');
}).catch((error) => {
    console.error('❌ Ошибка подключения к MongoDB:', error.message);
});

// ==================== СХЕМЫ ====================

// Схема пользователей
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email обязателен'],
        unique: true,
        lowercase: true,
        trim: true
    },
    passwordHash: {
        type: String,
        required: [true, 'Пароль обязателен']
    },
    username: {
        type: String,
        required: [true, 'Имя пользователя обязательно'],
        minlength: [3, 'Имя должно быть минимум 3 символа'],
        maxlength: [50, 'Имя должно быть максимум 50 символов']
    },
    role: {
        type: String,
        enum: ['user', 'moderator', 'content_manager', 'admin'],
        default: 'user'
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    verificationCode: String,
    verificationExpires: Date,
    lastLogin: Date,
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Схема сессий
const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    ipAddress: String,
    userAgent: String,
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 }
    }
}, {
    timestamps: true
});

// Схема пригласительных кодов
const invitationCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    role: {
        type: String,
        enum: ['moderator', 'content_manager'],
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    usedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    usedAt: Date,
    maxUses: {
        type: Number,
        default: 1
    },
    useCount: {
        type: Number,
        default: 0
    },
    expiresAt: Date
}, {
    timestamps: true
});

// Определяем схему для Идей (обновленная)
const ideaSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Название идеи обязательно'],
        minlength: [3, 'Название должно быть минимум 3 символа']
    },
    description: {
        type: String,
        required: [true, 'Описание идеи обязательно'],
        minlength: [10, 'Описание должно быть минимум 10 символов']
    },
    author: {
        type: String,
        required: [true, 'Автор обязателен'],
        default: 'Аноним'
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    votes: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'in_progress', 'completed', 'featured'],
        default: 'pending'
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: Date,
    reviewNotes: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Определяем схему для Комментариев
const commentSchema = new mongoose.Schema({
    ideaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Idea',
        required: true
    },
    author: {
        type: String,
        required: true,
        default: 'Аноним'
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    text: {
        type: String,
        required: [true, 'Текст комментария обязателен'],
        minlength: [2, 'Комментарий должен быть минимум 2 символа']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Определяем схему для Голосов
const voteSchema = new mongoose.Schema({
    ideaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Idea',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Уникальный индекс для голосов (один пользователь - один голос)
voteSchema.index({ ideaId: 1, userId: 1 }, { unique: true });

// Создаем модели на основе схем
const User = mongoose.model('User', userSchema);
const Session = mongoose.model('Session', sessionSchema);
const InvitationCode = mongoose.model('InvitationCode', invitationCodeSchema);
const Idea = mongoose.model('Idea', ideaSchema);
const Comment = mongoose.model('Comment', commentSchema);
const Vote = mongoose.model('Vote', voteSchema);

class Database {
    constructor() {
        console.log('📊 Инициализация MongoDB базы данных...');
        this.User = User;
        this.Session = Session;
        this.InvitationCode = InvitationCode;
        this.Idea = Idea;
        this.Comment = Comment;
        this.Vote = Vote;
        
        // Создаем администратора по умолчанию, если его нет
        this.createDefaultAdmin();
    }
    
    async createDefaultAdmin() {
        try {
            const adminEmail = process.env.ADMIN_EMAIL || 'admin@school.ru';
            const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
            
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            
            const existingAdmin = await User.findOne({ email: adminEmail });
            if (!existingAdmin) {
                const admin = new User({
                    email: adminEmail,
                    passwordHash: hashedPassword,
                    username: 'Администратор',
                    role: 'admin',
                    emailVerified: true
                });
                
                await admin.save();
                console.log('✅ Администратор по умолчанию создан');
            }
        } catch (error) {
            console.error('❌ Ошибка создания администратора:', error);
        }
    }

    // Получить все идеи с количеством голосов и комментариев
    async getAllIdeas() {
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
                        isFeatured: -1,
                        votes: -1,
                        createdAt: -1
                    }
                }
            ]);

            return ideas.map(idea => ({
                id: idea._id,
                title: idea.title,
                description: idea.description,
                author: idea.author,
                authorId: idea.authorId,
                votes: idea.votes,
                status: idea.status,
                isFeatured: idea.isFeatured,
                created_at: idea.createdAt,
                comment_count: idea.comment_count,
                vote_count: idea.vote_count
            }));

        } catch (error) {
            console.error('❌ Ошибка получения идей:', error);
            throw error;
        }
    }

    // Получить идеи для модерации
    async getIdeasForModeration() {
        try {
            const ideas = await Idea.find({ status: 'pending' })
                .sort({ createdAt: 1 })
                .lean();
            
            return ideas;
        } catch (error) {
            console.error('❌ Ошибка получения идей для модерации:', error);
            throw error;
        }
    }

    // Добавить новую идею
    async addIdea(title, description, author, authorId = null) {
        try {
            const idea = new Idea({
                title,
                description,
                author: author || 'Аноним',
                authorId: authorId,
                status: 'pending'
            });

            const savedIdea = await idea.save();
            return { success: true, id: savedIdea._id };

        } catch (error) {
            console.error('❌ Ошибка добавления идеи:', error);
            
            if (error.errors?.title) {
                throw new Error(error.errors.title.message);
            }
            if (error.errors?.description) {
                throw new Error(error.errors.description.message);
            }
            
            throw new Error('Не удалось добавить идею');
        }
    }

    // Проголосовать за идею
    async voteForIdea(ideaId, userId) {
        const session = await mongoose.startSession();
        
        try {
            session.startTransaction();

            // Проверяем существование идеи
            const idea = await Idea.findById(ideaId).session(session);
            if (!idea) {
                throw new Error('Идея не найдена');
            }

            // Пытаемся добавить голос
            try {
                const vote = new Vote({
                    ideaId,
                    userId
                });
                await vote.save({ session });
            } catch (error) {
                if (error.code === 11000) {
                    throw new Error('Вы уже голосовали за эту идею');
                }
                throw error;
            }

            // Увеличиваем счетчик голосов
            idea.votes += 1;
            await idea.save({ session });

            await session.commitTransaction();
            return { success: true };

        } catch (error) {
            await session.abortTransaction();
            throw error;
            
        } finally {
            session.endSession();
        }
    }

    // Добавить комментарий
    async addComment(ideaId, author, text, authorId = null) {
        try {
            // Проверяем существование идеи
            const idea = await Idea.findById(ideaId);
            if (!idea) {
                throw new Error('Идея не найдена');
            }

            const comment = new Comment({
                ideaId,
                author: author || 'Аноним',
                authorId: authorId,
                text
            });

            const savedComment = await comment.save();
            return { success: true, id: savedComment._id };

        } catch (error) {
            console.error('❌ Ошибка добавления комментария:', error);
            
            if (error.errors?.text) {
                throw new Error(error.errors.text.message);
            }
            
            throw new Error('Не удалось добавить комментарий');
        }
    }

    // Получить комментарии для идеи
    async getComments(ideaId) {
        try {
            const comments = await Comment.find({ ideaId })
                .sort({ createdAt: 1 })
                .lean();
            
            return comments.map(comment => ({
                id: comment._id,
                idea_id: comment.ideaId,
                author: comment.author,
                authorId: comment.authorId,
                text: comment.text,
                created_at: comment.createdAt
            }));

        } catch (error) {
            console.error('❌ Ошибка получения комментариев:', error);
            throw error;
        }
    }

    // Модерация идеи
    async moderateIdea(ideaId, reviewerId, status, reviewNotes, isFeatured = false) {
        try {
            const idea = await Idea.findById(ideaId);
            if (!idea) {
                throw new Error('Идея не найдена');
            }

            idea.status = status || idea.status;
            idea.reviewedBy = reviewerId;
            idea.reviewedAt = new Date();
            idea.reviewNotes = reviewNotes || idea.reviewNotes;
            idea.isFeatured = isFeatured !== undefined ? isFeatured : idea.isFeatured;

            await idea.save();
            return { success: true };
        } catch (error) {
            console.error('❌ Ошибка модерации идеи:', error);
            throw error;
        }
    }

    // Удалить идею
    async deleteIdea(ideaId) {
        try {
            // Удаляем идею и все связанные комментарии и голоса
            const session = await mongoose.startSession();
            session.startTransaction();

            await Idea.findByIdAndDelete(ideaId).session(session);
            await Comment.deleteMany({ ideaId: ideaId }).session(session);
            await Vote.deleteMany({ ideaId: ideaId }).session(session);

            await session.commitTransaction();
            session.endSession();

            return { success: true };
        } catch (error) {
            console.error('❌ Ошибка удаления идеи:', error);
            throw error;
        }
    }

    // Удалить комментарий
    async deleteComment(commentId) {
        try {
            await Comment.findByIdAndDelete(commentId);
            return { success: true };
        } catch (error) {
            console.error('❌ Ошибка удаления комментария:', error);
            throw error;
        }
    }

    // Получить статистику
    async getStats() {
        try {
            const ideasCount = await Idea.countDocuments();
            const commentsCount = await Comment.countDocuments();
            const votesCount = await Vote.countDocuments();
            const usersCount = await User.countDocuments();
            
            return {
                ideas: ideasCount,
                comments: commentsCount,
                votes: votesCount,
                users: usersCount
            };
        } catch (error) {
            console.error('❌ Ошибка получения статистики:', error);
            return { ideas: 0, comments: 0, votes: 0, users: 0 };
        }
    }

    // Тест подключения
    async testConnection() {
        try {
            await mongoose.connection.db.admin().ping();
            return { connected: true };
        } catch (error) {
            return { connected: false, error: error.message };
        }
    }

    // Очистить базу данных (только для тестирования!)
    async clearDatabase() {
        if (process.env.NODE_ENV !== 'development') {
            throw new Error('Очистка БД разрешена только в режиме разработки');
        }
        
        await User.deleteMany({});
        await Idea.deleteMany({});
        await Comment.deleteMany({});
        await Vote.deleteMany({});
        await InvitationCode.deleteMany({});
        await Session.deleteMany({});
        
        console.log('🗑️ База данных очищена');
        return { success: true };
    }
}

// Экспортируем экземпляр базы данных
const database = new Database();
module.exports = database;
