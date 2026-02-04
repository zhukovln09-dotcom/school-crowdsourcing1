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

function getDemoNews() {
    return [
        {
            id: 1,
            title: 'Школьная научная конференция',
            excerpt: 'Состоялась ежегодная научная конференция школьников.',
            image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&h=250&fit=crop',
            date: '20.12.2023',
            category: 'event',
            source: 'Школа №654',
            sourceUrl: 'https://sch654.mskobr.ru/novosti'
        },
        {
            id: 2,
            title: 'Новые достижения в робототехнике',
            excerpt: 'Команда школы заняла призовое место в соревнованиях по робототехнике.',
            image: 'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=400&h=250&fit=crop',
            date: '18.12.2023',
            category: 'study',
            source: 'Школа №654',
            sourceUrl: 'https://sch654.mskobr.ru/novosti'
        },
        {
            id: 3,
            title: 'Турнир по баскетболу',
            excerpt: 'Прошел товарищеский турнир по баскетболу между классами.',
            image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=250&fit=crop',
            date: '15.12.2023',
            category: 'sport',
            source: 'Школа №654',
            sourceUrl: 'https://sch654.mskobr.ru/novosti'
        },
        {
            id: 4,
            title: 'Выставка творческих работ',
            excerpt: 'Открылась выставка лучших творческих работ учащихся.',
            image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=250&fit=crop',
            date: '12.12.2023',
            category: 'event',
            source: 'Школа №654',
            sourceUrl: 'https://sch654.mskobr.ru/novosti'
        },
        {
            id: 5,
            title: 'Уроки программирования',
            excerpt: 'В школе начались дополнительные занятия по программированию.',
            image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=250&fit=crop',
            date: '10.12.2023',
            category: 'study',
            source: 'Школа №654',
            sourceUrl: 'https://sch654.mskobr.ru/novosti'
        },
        {
            id: 6,
            title: 'Подготовка к Новому году',
            excerpt: 'Школа готовится к празднованию Нового года.',
            image: 'https://images.unsplash.com/photo-1542370285-b8eb8317691c?w=400&h=250&fit=crop',
            date: '05.12.2023',
            category: 'event',
            source: 'Школа №654',
            sourceUrl: 'https://sch654.mskobr.ru/novosti'
        }
    ];
}

module.exports = router;
