class CrowdsourcingApp {
    constructor() {
        this.currentIdeaId = null;
        this.apiBaseUrl = window.location.origin; // Автоматически определяем URL сервера
        this.init();
    }

    init() {
        console.log('Инициализация приложения...');
        console.log('API Base URL:', this.apiBaseUrl);
        
        // Загружаем идеи при загрузке страницы
        this.loadIdeas();
        
        // Настраиваем обработчики событий
        this.setupEventListeners();
        
        // Проверяем соединение с сервером
        this.checkConnection();
    }

    setupEventListeners() {
        // Форма добавления идеи
        const ideaForm = document.getElementById('ideaForm');
        if (ideaForm) {
            ideaForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitIdea();
            });
        } else {
            console.error('Форма идеи не найдена');
        }

        // Модальное окно
        const modal = document.getElementById('commentModal');
        const closeBtn = document.querySelector('.close');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        if (modal) {
            window.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }

        // Форма комментария
        const commentForm = document.getElementById('commentForm');
        if (commentForm) {
            commentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitComment();
            });
        }

        // Кнопка обновления списка
        const refreshBtn = document.createElement('button');
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Обновить';
        refreshBtn.className = 'btn refresh-btn';
        refreshBtn.style.marginLeft = '10px';
        refreshBtn.style.marginTop = '10px';
        refreshBtn.onclick = () => this.loadIdeas();
        
        const ideasListSection = document.querySelector('.ideas-list h2');
        if (ideasListSection) {
            ideasListSection.appendChild(refreshBtn);
        }
    }

    async checkConnection() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/ideas`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                console.log('Соединение с сервером установлено');
            } else {
                console.warn('Сервер ответил с ошибкой:', response.status);
            }
        } catch (error) {
            console.error('Нет соединения с сервером:', error.message);
            this.showError('Не удалось подключиться к серверу. Проверьте подключение к интернету.');
        }
    }

    async loadIdeas() {
        const container = document.getElementById('ideasContainer');
        
        // Показываем индикатор загрузки
        container.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> Загрузка идей...
            </div>
        `;

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/ideas`);
            
            if (!response.ok) {
                throw new Error(`HTTP ошибка: ${response.status}`);
            }
            
            const ideas = await response.json();
            this.displayIdeas(ideas);
        } catch (error) {
            console.error('Ошибка загрузки идей:', error);
            
            // Показываем понятное сообщение об ошибке
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Не удалось загрузить идеи</h3>
                    <p>${error.message}</p>
                    <button onclick="app.loadIdeas()" class="btn">
                        <i class="fas fa-redo"></i> Попробовать снова
                    </button>
                </div>
            `;
        }
    }

    displayIdeas(ideas) {
        const container = document.getElementById('ideasContainer');
        
        if (!Array.isArray(ideas)) {
            console.error('Получены некорректные данные:', ideas);
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Ошибка данных</h3>
                    <p>Сервер вернул некорректные данные</p>
                </div>
            `;
            return;
        }

        if (ideas.length === 0) {
            container.innerHTML = `
                <div class="no-ideas">
                    <i class="fas fa-inbox fa-3x" style="color: #ccc; margin-bottom: 20px;"></i>
                    <h3>Пока нет идей</h3>
                    <p>Будьте первым, кто предложит идею для улучшения школы!</p>
                    <button onclick="document.getElementById('title').focus()" class="btn" style="margin-top: 20px;">
                        <i class="fas fa-plus"></i> Предложить идею
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = ideas.map(idea => `
            <div class="idea-card" data-id="${idea.id}">
                <div class="idea-header">
                    <h3 class="idea-title">${this.escapeHtml(idea.title)}</h3>
                    <span class="idea-status">${this.getStatusBadge(idea.status)}</span>
                </div>
                <div class="idea-meta">
                    <span class="idea-author">
                        <i class="fas fa-user"></i> ${this.escapeHtml(idea.author)}
                    </span>
                    <span class="idea-date">
                        <i class="far fa-clock"></i> ${this.formatDate(idea.created_at)}
                    </span>
                </div>
                <p class="idea-description">${this.escapeHtml(idea.description)}</p>
                <div class="idea-stats">
                    <span class="stat-item">
                        <i class="fas fa-thumbs-up"></i> ${idea.vote_count || 0} голосов
                    </span>
                    <span class="stat-item">
                        <i class="fas fa-comments"></i> ${idea.comment_count || 0} комментариев
                    </span>
                </div>
                <div class="idea-footer">
                    <div class="vote-section">
                        <button class="vote-btn" onclick="app.voteForIdea(${idea.id})" 
                                title="Проголосовать за эту идею">
                            <i class="fas fa-thumbs-up"></i> Поддержать
                        </button>
                    </div>
                    <div>
                        <button class="comment-btn" 
                                onclick="app.showComments(${idea.id}, '${this.escapeHtml(idea.title)}')"
                                title="Показать комментарии">
                            <i class="fas fa-comments"></i> Обсудить
                            <span class="comment-count">${idea.comment_count || 0}</span>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Добавляем CSS для новых элементов
        this.addCustomStyles();
    }

    async submitIdea() {
        const title = document.getElementById('title').value.trim();
        const description = document.getElementById('description').value.trim();
        const author = document.getElementById('author').value.trim();

        // Валидация
        if (!title || !description || !author) {
            this.showError('Заполните все поля');
            return;
        }

        if (title.length < 5) {
            this.showError('Название идеи должно быть не менее 5 символов');
            return;
        }

        if (description.length < 10) {
            this.showError('Описание должно быть не менее 10 символов');
            return;
        }

        // Показываем индикатор загрузки
        const submitBtn = document.querySelector('#ideaForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
        submitBtn.disabled = true;

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/ideas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    title, 
                    description, 
                    author: author || 'Аноним' 
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Ошибка сервера');
            }

            if (result.success) {
                // Очищаем форму
                document.getElementById('ideaForm').reset();
                
                // Показываем сообщение об успехе
                this.showMessage('Идея успешно добавлена! Она появится в списке после обновления.', 'success');
                
                // Обновляем список идей
                setTimeout(() => this.loadIdeas(), 1000);
            } else {
                this.showError(result.error || 'Ошибка при добавлении идеи');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError(error.message || 'Не удалось добавить идею. Проверьте подключение к интернету.');
        } finally {
            // Восстанавливаем кнопку
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async voteForIdea(ideaId) {
        // Показываем подтверждение
        if (!confirm('Вы уверены, что хотите проголосовать за эту идею?')) {
            return;
        }

        // Блокируем кнопку голосования
        const voteBtn = document.querySelector(`.idea-card[data-id="${ideaId}"] .vote-btn`);
        if (voteBtn) {
            voteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Голосую...';
            voteBtn.disabled = true;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/ideas/${ideaId}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Ошибка сервера');
            }

            if (result.success) {
                this.showMessage('Спасибо за ваш голос!', 'success');
                
                // Обновляем список идей
                setTimeout(() => this.loadIdeas(), 500);
            } else {
                this.showError(result.error || 'Не удалось проголосовать');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError(error.message || 'Вы уже голосовали за эту идею или произошла ошибка');
        }
    }

    async showComments(ideaId, title) {
        this.currentIdeaId = ideaId;
        
        // Устанавливаем заголовок
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) {
            modalTitle.textContent = `Комментарии: ${title}`;
        }
        
        // Очищаем предыдущие комментарии
        const commentsContainer = document.getElementById('commentsContainer');
        if (commentsContainer) {
            commentsContainer.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i> Загрузка комментариев...
                </div>
            `;
        }
        
        // Показываем модальное окно
        const modal = document.getElementById('commentModal');
        if (modal) {
            modal.style.display = 'block';
        }
        
        // Загружаем комментарии
        await this.loadComments(ideaId);
    }

    async loadComments(ideaId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/ideas/${ideaId}/comments`);
            
            if (!response.ok) {
                throw new Error(`HTTP ошибка: ${response.status}`);
            }
            
            const comments = await response.json();
            this.displayComments(comments);
        } catch (error) {
            console.error('Ошибка загрузки комментариев:', error);
            
            const container = document.getElementById('commentsContainer');
            if (container) {
                container.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Не удалось загрузить комментарии</h3>
                        <p>${error.message}</p>
                        <button onclick="app.loadComments(${ideaId})" class="btn">
                            <i class="fas fa-redo"></i> Попробовать снова
                        </button>
                    </div>
                `;
            }
        }
    }

    displayComments(comments) {
        const container = document.getElementById('commentsContainer');
        
        if (!container) return;
        
        if (!Array.isArray(comments) || comments.length === 0) {
            container.innerHTML = `
                <div class="no-comments">
                    <i class="fas fa-comment-slash fa-2x" style="color: #ccc; margin-bottom: 15px;"></i>
                    <p>Пока нет комментариев. Будьте первым!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = comments.map(comment => `
            <div class="comment">
                <div class="comment-header">
                    <div class="comment-author">
                        <i class="fas fa-user-circle"></i> ${this.escapeHtml(comment.author)}
                    </div>
                    <div class="comment-date">
                        ${this.formatDate(comment.created_at)}
                    </div>
                </div>
                <p class="comment-text">${this.escapeHtml(comment.text)}</p>
            </div>
        `).join('');
    }

    async submitComment() {
        const authorInput = document.getElementById('commentAuthor');
        const textInput = document.getElementById('commentText');
        
        const author = authorInput ? authorInput.value.trim() : '';
        const text = textInput ? textInput.value.trim() : '';

        // Валидация
        if (!author || !text) {
            this.showError('Заполните все поля');
            return;
        }

        if (text.length < 3) {
            this.showError('Комментарий должен быть не менее 3 символов');
            return;
        }

        // Показываем индикатор загрузки
        const submitBtn = document.querySelector('#commentForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
        submitBtn.disabled = true;

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/ideas/${this.currentIdeaId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    author: author || 'Аноним', 
                    text 
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Ошибка сервера');
            }

            if (result.success) {
                // Очищаем форму
                if (authorInput) authorInput.value = '';
                if (textInput) textInput.value = '';
                
                // Показываем сообщение об успехе
                this.showMessage('Комментарий добавлен!', 'success');
                
                // Обновляем комментарии
                await this.loadComments(this.currentIdeaId);
                
                // Обновляем список идей (чтобы обновить счетчик комментариев)
                setTimeout(() => this.loadIdeas(), 500);
            } else {
                this.showError(result.error || 'Ошибка при добавлении комментария');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError(error.message || 'Не удалось добавить комментарий');
        } finally {
            // Восстанавливаем кнопку
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    getStatusBadge(status) {
        const badges = {
            'pending': '<span class="badge badge-pending"><i class="fas fa-clock"></i> На рассмотрении</span>',
            'approved': '<span class="badge badge-approved"><i class="fas fa-check"></i> Одобрено</span>',
            'rejected': '<span class="badge badge-rejected"><i class="fas fa-times"></i> Отклонено</span>',
            'in_progress': '<span class="badge badge-in-progress"><i class="fas fa-cog"></i> В работе</span>',
            'completed': '<span class="badge badge-completed"><i class="fas fa-flag-checkered"></i> Реализовано</span>'
        };
        
        return badges[status] || badges['pending'];
    }

    formatDate(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        
        // Проверяем валидность даты
        if (isNaN(date.getTime())) {
            return 'недавно';
        }
        
        const now = new Date();
        const diff = now - date;
        
        // Если меньше минуты назад
        if (diff < 60000) {
            return 'только что';
        }
        
        // Если меньше часа назад
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes} ${this.pluralize(minutes, 'минуту', 'минуты', 'минут')} назад`;
        }
        
        // Если сегодня
        if (date.toDateString() === now.toDateString()) {
            return `сегодня в ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
        }
        
        // Если вчера
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return `вчера в ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
        }
        
        // Если в этом году
        if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString('ru-RU', { 
                day: 'numeric', 
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        // Для более старых дат
        return date.toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    pluralize(number, one, two, five) {
        let n = Math.abs(number);
        n %= 100;
        if (n >= 5 && n <= 20) {
            return five;
        }
        n %= 10;
        if (n === 1) {
            return one;
        }
        if (n >= 2 && n <= 4) {
            return two;
        }
        return five;
    }

    showMessage(text, type = 'info') {
        // Удаляем предыдущие сообщения
        const existingMessages = document.querySelectorAll('.app-message');
        existingMessages.forEach(msg => msg.remove());
        
        // Создаем элемент для сообщения
        const message = document.createElement('div');
        message.className = `app-message message-${type}`;
        message.innerHTML = `
            <div class="message-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${text}</span>
                <button class="message-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(message);
        
        // Автоматическое скрытие через 5 секунд (кроме ошибок)
        if (type !== 'error') {
            setTimeout(() => {
                if (message.parentElement) {
                    message.style.opacity = '0';
                    setTimeout(() => {
                        if (message.parentElement) {
                            message.remove();
                        }
                    }, 300);
                }
            }, 5000);
        }
    }

    showError(text) {
        this.showMessage(text, 'error');
    }

    escapeHtml(text) {
        if (!text) return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    addCustomStyles() {
        // Проверяем, не добавлены ли стили уже
        if (document.getElementById('app-custom-styles')) {
            return;
        }
        
        const styles = document.createElement('style');
        styles.id = 'app-custom-styles';
        styles.textContent = `
            .app-message {
                position: fixed;
                top: 20px;
                right: 20px;
                min-width: 300px;
                max-width: 500px;
                z-index: 10000;
                animation: slideInRight 0.3s ease;
            }
            
            .message-content {
                background: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                gap: 12px;
                border-left: 4px solid #4b6cb7;
            }
            
            .message-success .message-content {
                border-left-color: #4CAF50;
            }
            
            .message-error .message-content {
                border-left-color: #f44336;
            }
            
            .message-content i {
                font-size: 1.2rem;
            }
            
            .message-success .message-content i {
                color: #4CAF50;
            }
            
            .message-error .message-content i {
                color: #f44336;
            }
            
            .message-close {
                background: none;
                border: none;
                color: #666;
                cursor: pointer;
                margin-left: auto;
                padding: 5px;
            }
            
            .message-close:hover {
                color: #333;
            }
            
            .badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.8rem;
                font-weight: bold;
            }
            
            .badge-pending {
                background: #fff3cd;
                color: #856404;
            }
            
            .badge-approved {
                background: #d4edda;
                color: #155724;
            }
            
            .badge-rejected {
                background: #f8d7da;
                color: #721c24;
            }
            
            .badge-in-progress {
                background: #d1ecf1;
                color: #0c5460;
            }
            
            .badge-completed {
                background: #e2e3e5;
                color: #383d41;
            }
            
            .idea-meta {
                display: flex;
                gap: 15px;
                margin-bottom: 10px;
                color: #666;
                font-size: 0.9rem;
            }
            
            .idea-meta i {
                margin-right: 5px;
            }
            
            .idea-stats {
                display: flex;
                gap: 20px;
                margin-bottom: 15px;
                color: #666;
            }
            
            .stat-item {
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .refresh-btn {
                font-size: 0.9rem;
                padding: 5px 10px;
            }
            
            .no-ideas, .no-comments, .error-message {
                text-align: center;
                padding: 40px 20px;
                background: white;
                border-radius: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .no-ideas h3, .error-message h3 {
                margin-bottom: 10px;
                color: #333;
            }
            
            .no-ideas p, .error-message p {
                color: #666;
                margin-bottom: 20px;
            }
            
            .loading {
                text-align: center;
                padding: 40px;
                color: #666;
            }
            
            .fa-spin {
                animation: fa-spin 2s infinite linear;
            }
            
            .comment-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .comment-author {
                font-weight: bold;
                color: #4b6cb7;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .comment-date {
                font-size: 0.8rem;
                color: #888;
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes fa-spin {
                0% {
                    transform: rotate(0deg);
                }
                100% {
                    transform: rotate(360deg);
                }
            }
            
            /* Адаптивные стили */
            @media (max-width: 768px) {
                .app-message {
                    left: 20px;
                    right: 20px;
                    min-width: auto;
                }
                
                .idea-meta {
                    flex-direction: column;
                    gap: 5px;
                }
                
                .idea-stats {
                    flex-wrap: wrap;
                    gap: 10px;
                }
                
                .idea-footer {
                    flex-direction: column;
                    gap: 10px;
                }
                
                .vote-section, .idea-footer > div {
                    width: 100%;
                }
                
                .vote-btn, .comment-btn {
                    width: 100%;
                    justify-content: center;
                }
            }
            
            /* Темная тема */
            @media (prefers-color-scheme: dark) {
                .idea-card, .modal-content, .no-ideas, .error-message {
                    background: #2d2d2d;
                    color: #e0e0e0;
                }
                
                form input, form textarea {
                    background: #3d3d3d;
                    color: #e0e0e0;
                    border-color: #555;
                }
                
                .comment {
                    background: #3d3d3d;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
}

// Инициализация приложения при загрузке страницы
let app;

document.addEventListener('DOMContentLoaded', () => {
    try {
        app = new CrowdsourcingApp();
        console.log('Приложение успешно инициализировано');
        
        // Делаем app глобальной для использования в onclick
        window.app = app;
        
        // Добавляем глобальные обработчики ошибок
        window.addEventListener('error', (event) => {
            console.error('Глобальная ошибка:', event.error);
            if (app && app.showError) {
                app.showError('Произошла ошибка в приложении');
            }
        });
        
        // Обработка обещаний без catch
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Необработанное обещание:', event.reason);
            if (app && app.showError) {
                app.showError('Произошла ошибка при выполнении операции');
            }
        });
        
    } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
        
        // Показываем сообщение об ошибке загрузки
        const container = document.getElementById('ideasContainer');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle fa-3x" style="color: #f44336; margin-bottom: 20px;"></i>
                    <h3>Ошибка загрузки приложения</h3>
                    <p>Пожалуйста, обновите страницу или попробуйте позже.</p>
                    <button onclick="window.location.reload()" class="btn">
                        <i class="fas fa-redo"></i> Обновить страницу
                    </button>
                </div>
            `;
        }
    }
});

// Функция для ручного обновления (может быть вызвана из консоли)
window.refreshApp = function() {
    if (app && app.loadIdeas) {
        app.loadIdeas();
        app.showMessage('Приложение обновлено', 'success');
    }
};

// Отображение информации о приложении
console.log('Школьный Краудсорсинг v1.0');
console.log('Для отладки используйте:');
console.log('- app.loadIdeas() - загрузить идеи заново');
console.log('- window.refreshApp() - обновить приложение');
