// server-news.js - серверный парсер новостей
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const router = express.Router();

// Роут для получения новостей
router.get('/api/news', async (req, res) => {
    try {
        console.log('Получение новостей с сайта школы...');
        
        const response = await axios.get('https://sch654.mskobr.ru/novosti', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });
        
        const $ = cheerio.load(response.data);
        const news = [];
        
        // Парсим новости - адаптируйте под структуру сайта
        $('.news-item, .novosti-item, article').each((index, element) => {
            if (index < 15) { // Ограничиваем количество
                const title = $(element).find('h2, h3, .title').first().text().trim();
                const link = $(element).find('a').first().attr('href');
                const image = $(element).find('img').first().attr('src');
                const excerpt = $(element).find('p, .excerpt').first().text().trim();
                const date = $(element).find('.date, time').first().text().trim();
                
                if (title) {
                    news.push({
                        id: index + 1,
                        title: title,
                        excerpt: excerpt || 'Читать полностью на сайте школы...',
                        image: image ? `https://sch654.mskobr.ru${image}` : null,
                        date: date || new Date().toLocaleDateString('ru-RU'),
                        category: 'school',
                        source: 'Школа №654',
                        sourceUrl: link ? `https://sch654.mskobr.ru${link}` : 'https://sch654.mskobr.ru/novosti'
                    });
                }
            }
        });
        
        // Если не нашли новости - возвращаем демо
        if (news.length === 0) {
            news.push(...getDemoNews());
        }
        
        res.json({
            success: true,
            count: news.length,
            news: news,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Ошибка парсинга новостей:', error);
        
        // Возвращаем демо-новости в случае ошибки
        res.json({
            success: true,
            count: 6,
            news: getDemoNews(),
            cached: true,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
