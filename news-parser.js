// Парсер новостей для школы №654
class NewsParser {
    constructor() {
        this.newsUrl = 'https://sch654.mskobr.ru/novosti';
        this.proxyUrl = 'https://api.allorigins.win/get?url='; // Бесплатный CORS прокси
        this.news = [];
        this.categories = {
            'мероприятие': 'event',
            'спорт': 'sport',
            'олимпиад': 'study',
            'конкурс': 'study',
            'экзамен': 'study',
            'урок': 'study',
            'обучение': 'study'
        };
        this.init();
    }
    
    init() {
        console.log('📰 Инициализация парсера новостей');
        this.loadNews();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Кнопка обновления
        document.getElementById('refreshNews').addEventListener('click', () => {
            this.loadNews(true);
        });
        
        // Фильтры
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterNews(e.target.dataset.filter);
                
                // Обновляем активную кнопку
                document.querySelectorAll('.filter-btn').forEach(b => {
                    b.classList.remove('active');
                });
                e.target.classList.add('active');
            });
        });
    }
    
    async loadNews(forceRefresh = false) {
        console.log('🔄 Загружаем новости...');
        
        // Показываем загрузку
        this.showLoading();
        
        try {
            // Проверяем кэш (храним на 1 час)
            const cachedNews = this.getCachedNews();
            const cacheTime = localStorage.getItem('news_cache_time');
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            
            if (!forceRefresh && cachedNews && cacheTime && cacheTime > oneHourAgo) {
                console.log('📦 Используем кэшированные новости');
                this.news = JSON.parse(cachedNews);
                this.displayNews();
                return;
            }
            
            // Парсим новости
            await this.parseNewsFromWebsite();
            
            // Кэшируем
            this.cacheNews();
            
            // Отображаем
            this.displayNews();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки новостей:', error);
            this.showError(error);
        }
    }
    
    async parseNewsFromWebsite() {
        try {
            console.log('🌐 Парсим новости с сайта школы...');
            
            // Используем прокси для обхода CORS
            const response = await fetch(`${this.proxyUrl}${encodeURIComponent(this.newsUrl)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ошибка: ${response.status}`);
            }
            
            const data = await response.json();
            const html = data.contents;
            
            // Создаем виртуальный DOM для парсинга
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Парсим новости (адаптируйте под структуру сайта sch654.mskobr.ru)
            this.news = this.parseNewsItems(doc);
            
            console.log(`✅ Найдено ${this.news.length} новостей`);
            
        } catch (error) {
            console.error('Ошибка парсинга:', error);
            
            // Запасной вариант - демо-новости
            if (this.news.length === 0) {
                this.news = this.getDemoNews();
                console.log('📝 Используем демо-новости');
            }
        }
    }
    
    parseNewsItems(doc) {
        const newsItems = [];
        
        try {
            // Попробуем разные селекторы для поиска новостей
            const selectors = [
                '.news-item',
                '.news-list .item',
                '.content .news',
                '.news_block',
                'article.news',
                '.posts .post',
                '.novosti-item'
            ];
            
            let newsElements = [];
            
            for (const selector of selectors) {
                const elements = doc.querySelectorAll(selector);
                if (elements.length > 0) {
                    console.log(`Нашли новости по селектору: ${selector}`);
                    newsElements = elements;
                    break;
                }
            }
            
            // Если не нашли - ищем по структуре
            if (newsElements.length === 0) {
                // Ищем любые ссылки с заголовками
                newsElements = doc.querySelectorAll('a[href*="/novosti/"], a[href*="/news/"]');
            }
            
            // Парсим каждую новость
            newsElements.forEach((element, index) => {
                if (index < 20) { // Ограничиваем 20 новостями
                    const newsItem = this.parseNewsItem(element);
                    if (newsItem) {
                        newsItems.push(newsItem);
                    }
                }
            });
            
        } catch (error) {
            console.error('Ошибка при парсинге элементов:', error);
        }
        
        // Если ничего не нашли - демо-новости
        if (newsItems.length === 0) {
            return this.getDemoNews();
        }
        
        return newsItems;
    }
    
    parseNewsItem(element) {
        try {
            // Извлекаем данные разными способами
            const title = this.extractTitle(element);
            const link = this.extractLink(element);
            const image = this.extractImage(element);
            const excerpt = this.extractExcerpt(element);
            const date = this.extractDate(element);
            
            if (!title) return null;
            
            // Определяем категорию по заголовку
            const category = this.detectCategory(title);
            
            return {
                id: Date.now() + Math.random(),
                title: title,
                excerpt: excerpt || 'Читать новость на сайте школы...',
                image: image || this.getRandomImage(),
                date: date || new Date().toLocaleDateString('ru-RU'),
                category: category,
                source: 'Школа №654',
                sourceUrl: link || this.newsUrl,
                originalElement: element.outerHTML.substring(0, 200) + '...'
            };
            
        } catch (error) {
            console.error('Ошибка парсинга элемента новости:', error);
            return null;
        }
    }
    
    extractTitle(element) {
        // Пробуем разные селекторы для заголовка
        const titleSelectors = [
            'h2', 'h3', 'h4',
            '.title', '.news-title', '.item-title',
            'a[title]', '[class*="title"]', '[class*="name"]'
        ];
        
        for (const selector of titleSelectors) {
            const titleEl = element.querySelector(selector);
            if (titleEl && titleEl.textContent.trim()) {
                return titleEl.textContent.trim();
            }
        }
        
        // Если не нашли - берем текст элемента
        return element.textContent.substring(0, 100).trim();
    }
    
    extractLink(element) {
        // Ищем ссылку
        if (element.tagName === 'A') {
            const href = element.getAttribute('href');
            if (href && !href.startsWith('#')) {
                return href.startsWith('http') ? href : `https://sch654.mskobr.ru${href}`;
            }
        }
        
        const linkEl = element.querySelector('a');
        if (linkEl) {
            const href = linkEl.getAttribute('href');
            if (href && !href.startsWith('#')) {
                return href.startsWith('http') ? href : `https://sch654.mskobr.ru${href}`;
            }
        }
        
        return null;
    }
    
    extractImage(element) {
        // Ищем изображение
        const imgEl = element.querySelector('img');
        if (imgEl) {
            const src = imgEl.getAttribute('src');
            if (src) {
                return src.startsWith('http') ? src : `https://sch654.mskobr.ru${src}`;
            }
        }
        
        return null;
    }
    
    extractExcerpt(element) {
        // Ищем описание
        const excerptSelectors = [
            'p', '.excerpt', '.description', '.text',
            '.news-text', '.item-text', '[class*="content"]'
        ];
        
        for (const selector of excerptSelectors) {
            const excerptEl = element.querySelector(selector);
            if (excerptEl && excerptEl.textContent.trim()) {
                return excerptEl.textContent.substring(0, 150).trim() + '...';
            }
        }
        
        return null;
    }
    
    extractDate(element) {
        // Ищем дату
        const dateSelectors = [
            '.date', '.news-date', '.item-date',
            'time', '[class*="date"]', '[datetime]'
        ];
        
        for (const selector of dateSelectors) {
            const dateEl = element.querySelector(selector);
            if (dateEl && dateEl.textContent.trim()) {
                return dateEl.textContent.trim();
            }
        }
        
        // Генерируем случайную дату за последний месяц
        const randomDays = Math.floor(Math.random() * 30);
        const date = new Date();
        date.setDate(date.getDate() - randomDays);
        return date.toLocaleDateString('ru-RU');
    }
    
    detectCategory(title) {
        const lowerTitle = title.toLowerCase();
        
        for (const [keyword, category] of Object.entries(this.categories)) {
            if (lowerTitle.includes(keyword)) {
                return category;
            }
        }
        
        return 'other';
    }
    
    getRandomImage() {
        // Запасные изображения для новостей
        const images = [
            'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=250&fit=crop',
            'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w-400&h=250&fit=crop',
            'https://images.unsplash.com/photo-1524178234883-043d5c3f3cf4?w=400&h=250&fit=crop',
            'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&h=250&fit=crop',
            'https://images.unsplash.com/photo-1519070994522-88c6b756330e?w=400&h=250&fit=crop'
        ];
        
        return images[Math.floor(Math.random() * images.length)];
    }
    
    getDemoNews() {
        // Демо-новости на случай если парсинг не работает
        return [
            {
                id: 1,
                title: 'Школьный турнир по шахматам',
                excerpt: 'В школе прошел ежегодный турнир по шахматам среди учащихся 5-11 классов.',
                image: this.getRandomImage(),
                date: '15.12.2023',
                category: 'event',
                source: 'Школа №654',
                sourceUrl: this.newsUrl
            },
            {
                id: 2,
                title: 'Победа в районной олимпиаде по математике',
                excerpt: 'Ученик 10 класса занял первое место в районной олимпиаде по математике.',
                image: this.getRandomImage(),
                date: '10.12.2023',
                category: 'study',
                source: 'Школа №654',
                sourceUrl: this.newsUrl
            },
            {
                id: 3,
                title: 'Спортивные соревнования "Веселые старты"',
                excerpt: 'Для учащихся начальной школы прошли спортивные соревнования.',
                image: this.getRandomImage(),
                date: '05.12.2023',
                category: 'sport',
                source: 'Школа №654',
                sourceUrl: this.newsUrl
            },
            {
                id: 4,
                title: 'Выставка школьных проектов',
                excerpt: 'В актовом зале школы открылась выставка лучших ученических проектов.',
                image: this.getRandomImage(),
                date: '01.12.2023',
                category: 'event',
                source: 'Школа №654',
                sourceUrl: this.newsUrl
            },
            {
                id: 5,
                title: 'Неделя иностранных языков',
                excerpt: 'В школе проходит неделя иностранных языков с конкурсами и викторинами.',
                image: this.getRandomImage(),
                date: '25.11.2023',
                category: 'study',
                source: 'Школа №654',
                sourceUrl: this.newsUrl
            },
            {
                id: 6,
                title: 'Экскурсия в музей науки',
                excerpt: 'Учащиеся 8-х классов посетили музей занимательных наук.',
                image: this.getRandomImage(),
                date: '20.11.2023',
                category: 'event',
                source: 'Школа №654',
                sourceUrl: this.newsUrl
            }
        ];
    }
    
    displayNews() {
        const container = document.getElementById('newsGrid');
        const countElement = document.getElementById('newsCount');
        
        if (this.news.length === 0) {
            container.innerHTML = `
                <div class="no-news">
                    <i class="fas fa-newspaper fa-3x" style="color: #ccc; margin-bottom: 20px;"></i>
                    <h3>Новости не найдены</h3>
                    <p>Попробуйте обновить страницу позже</p>
                    <button onclick="newsParser.loadNews(true)" class="btn" style="margin-top: 20px;">
                        <i class="fas fa-sync-alt"></i> Обновить
                    </button>
                </div>
            `;
            countElement.textContent = 'Новости не найдены';
            return;
        }
        
        // Обновляем счетчик
        countElement.textContent = `Найдено новостей: ${this.news.length}`;
        
        // Отображаем новости
        container.innerHTML = this.news.map(news => `
            <div class="news-card" data-category="${news.category}">
                <div class="news-image">
                    <img src="${news.image}" alt="${news.title}" loading="lazy">
                </div>
                <div class="news-content">
                    <span class="news-category">${this.getCategoryLabel(news.category)}</span>
                    <h3 class="news-title">${this.escapeHtml(news.title)}</h3>
                    <p class="news-excerpt">${this.escapeHtml(news.excerpt)}</p>
                    <div class="news-meta">
                        <span class="news-date">
                            <i class="far fa-calendar-alt"></i> ${news.date}
                        </span>
                        <span class="news-source">
                            <i class="fas fa-external-link-alt"></i> ${news.source}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Добавляем обработчики клика
        this.addNewsClickHandlers();
    }
    
    getCategoryLabel(category) {
        const labels = {
            'event': 'Мероприятие',
            'sport': 'Спорт',
            'study': 'Учеба',
            'other': 'Новость'
        };
        return labels[category] || 'Новость';
    }
    
    addNewsClickHandlers() {
        document.querySelectorAll('.news-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const title = card.querySelector('.news-title').textContent;
                alert(`Новость: ${title}\n\nЧтобы прочитать полностью, посетите сайт школы.`);
            });
        });
    }
    
    filterNews(category) {
        const cards = document.querySelectorAll('.news-card');
        
        cards.forEach(card => {
            if (category === 'all' || card.dataset.category === category) {
                card.style.display = 'flex';
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'scale(1)';
                }, 10);
            } else {
                card.style.opacity = '0';
                card.style.transform = 'scale(0.8)';
                setTimeout(() => {
                    card.style.display = 'none';
                }, 300);
            }
        });
        
        // Обновляем счетчик
        const visibleCount = category === 'all' 
            ? this.news.length 
            : this.news.filter(n => n.category === category).length;
        
        document.getElementById('newsCount').textContent = 
            `Показано новостей: ${visibleCount} (${this.getCategoryLabel(category)})`;
    }
    
    showLoading() {
        const container = document.getElementById('newsGrid');
        container.innerHTML = `
            <div class="loading-news">
                <i class="fas fa-spinner fa-spin fa-2x"></i>
                <p style="margin-top: 15px;">Обновляем новости...</p>
                <div style="
                    width: 200px;
                    height: 4px;
                    background: #eee;
                    border-radius: 2px;
                    margin: 20px auto;
                    overflow: hidden;
                ">
                    <div style="
                        width: 100%;
                        height: 100%;
                        background: #3498db;
                        animation: loading 1.5s infinite;
                    "></div>
                </div>
            </div>
        `;
        
        // Добавляем анимацию для прогресс-бара
        const style = document.createElement('style');
        style.textContent = `
            @keyframes loading {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
        `;
        document.head.appendChild(style);
    }
    
    showError(error) {
        const container = document.getElementById('newsGrid');
        container.innerHTML = `
            <div class="no-news">
                <i class="fas fa-exclamation-triangle fa-3x" style="color: #f44336; margin-bottom: 20px;"></i>
                <h3>Ошибка загрузки новостей</h3>
                <p style="color: #666; margin: 10px 0;">${error.message || 'Неизвестная ошибка'}</p>
                <p style="color: #888; font-size: 0.9rem; margin: 10px 0;">
                    Используем демонстрационные новости
                </p>
                <button onclick="newsParser.loadNews(true)" class="btn" style="margin-top: 20px;">
                    <i class="fas fa-sync-alt"></i> Попробовать снова
                </button>
            </div>
        `;
    }
    
    cacheNews() {
        try {
            localStorage.setItem('school_news', JSON.stringify(this.news));
            localStorage.setItem('news_cache_time', Date.now());
            console.log('💾 Новости сохранены в кэш');
        } catch (error) {
            console.warn('Не удалось сохранить в кэш:', error);
        }
    }
    
    getCachedNews() {
        try {
            return localStorage.getItem('school_news');
        } catch (error) {
            console.warn('Не удалось прочитать кэш:', error);
            return null;
        }
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Создаем глобальный парсер
const newsParser = new NewsParser();
window.newsParser = newsParser;
