// server.js - версия для MongoDB
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database-mongo.js'); // Изменили импорт!
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Маршруты для страниц
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// указываем маршрут для news.html
app.get('/news', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'news.html'));
});

app.get('/news.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'news.html'));
});

// API для парсинга новостей
app.get('/api/news', async (req, res) => {
    try {
        console.log('📰 Запрос новостей...');
        
        // Пытаемся спарсить с сайта школы
        const news = await parseSchoolNews();
        
        res.json({
            success: true,
            news: news,
            count: news.length,
            source: 'Школа №654',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Ошибка парсинга новостей:', error);
}

async function parseSchoolNews() {
    try {
        const url = 'https://sch654.mskobr.ru/novosti';
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer': 'https://www.google.com/'
            },
            timeout: 10000
        });
        
        const $ = cheerio.load(response.data);
        const newsItems = [];
        
        // Пробуем разные селекторы (адаптируйте под структуру сайта)
        const selectors = [
            '.news-item',
            '.news-list > div',
            'article',
            '.item',
            '.post',
            '.novosti'
        ];
        
        let foundElements = [];
        
        for (const selector of selectors) {
            const elements = $(selector);
            if (elements.length > 0) {
                console.log(`Нашли элементы по селектору: ${selector}`);
                foundElements = elements;
                break;
            }
        }
        
        // Если не нашли по селекторам, ищем любые блоки с контентом
        if (foundElements.length === 0) {
            foundElements = $('div').filter((i, el) => {
                return $(el).find('h2, h3, h4').length > 0;
            });
        }
        
        // Парсим найденные элементы
        foundElements.each((index, element) => {
            if (index < 12) { // Ограничиваем количество
                const $el = $(element);
                
                const title = $el.find('h2, h3, h4').first().text().trim() || 
                             $el.find('[class*="title"]').first().text().trim();
                
                if (title && title.length > 5) {
                    const link = $el.find('a').first().attr('href');
                    const image = $el.find('img').first().attr('src');
                    const excerpt = $el.find('p').first().text().trim().substring(0, 150) + '...';
                    const date = $el.find('[class*="date"], time').first().text().trim();
                    
                    // Определяем категорию
                    let category = 'school';
                    const lowerTitle = title.toLowerCase();
                    if (lowerTitle.includes('спорт') || lowerTitle.includes('соревн')) {
                        category = 'sport';
                    } else if (lowerTitle.includes('олимпиад') || lowerTitle.includes('конкурс')) {
                        category = 'study';
                    } else if (lowerTitle.includes('мероприят') || lowerTitle.includes('фестиваль')) {
                        category = 'event';
                    }
                    
                    newsItems.push({
                        id: Date.now() + index,
                        title: title,
                        excerpt: excerpt || 'Читать подробнее на сайте школы...',
                        image: image ? `https://sch654.mskobr.ru${image}` : getRandomImage(),
                        date: date || getRandomDate(),
                        category: category,
                        source: 'Школа №654',
                        sourceUrl: link ? `https://sch654.mskobr.ru${link}` : url
                    });
                }
            }
        });
        
        // Если ничего не нашли - возвращаем демо-новости
        if (newsItems.length === 0) {
            console.log('Не удалось спарсить новости, возвращаем демо');
            return getDemoNews();
        }
        
        console.log(`✅ Спарсено ${newsItems.length} новостей`);
        return newsItems;
        
    } catch (error) {
        console.error('Ошибка парсинга:', error);
        throw error;
    }
}
    
// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Получить IP пользователя
const getClientIp = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.ip || 
           req.connection.remoteAddress;
};

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
app.post('/api/ideas', async (req, res) => {
    try {
        const { title, description, author } = req.body;
        
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
        
        const result = await db.addIdea(title, description, author);
        
        res.json({ 
            success: true, 
            message: 'Идея успешно добавлена!',
            id: result.id
        });
        
    } catch (error) {
        console.error('Ошибка добавления идеи:', error);
        
        // Более понятные ошибки для пользователя
        if (error.message.includes('обязательно') || 
            error.message.includes('должно быть')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Не удалось добавить идею' });
        }
    }
});

// Проголосовать за идею
app.post('/api/ideas/:id/vote', async (req, res) => {
    try {
        const ideaId = req.params.id;
        const userIp = getClientIp(req);
        
        if (!ideaId) {
            return res.status(400).json({ error: 'Не указан ID идеи' });
        }
        
        await db.voteForIdea(ideaId, userIp);
        
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
app.post('/api/ideas/:id/comments', async (req, res) => {
    try {
        const ideaId = req.params.id;
        const { author, text } = req.body;
        
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

// Очистить базу данных (ТОЛЬКО ДЛЯ ТЕСТИРОВАНИЯ!)
app.delete('/api/admin/clear', async (req, res) => {
    // Защита: только в режиме разработки
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    try {
        const result = await db.clearDatabase();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
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

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Сайт: http://localhost:${PORT}`);
    console.log(`📊 MongoDB: ${process.env.MONGODB_URI ? 'Настроен' : 'Используется локальная строка'}`);
});





