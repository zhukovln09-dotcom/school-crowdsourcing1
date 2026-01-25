// Глобальная переменная для приложения
let app;

// Класс приложения
class CrowdsourcingApp {
    constructor() {
        this.currentIdeaId = null;
        this.apiBaseUrl = window.location.origin;
        this.init();
    }

    init() {
        console.log('🚀 Приложение инициализировано');
        
        // Загружаем идеи
        this.loadIdeas();
        
        // Настраиваем обработчики
        this.setupEventListeners();
        
        // Делаем глобально доступным
        window.app = this;
    }

    setupEventListeners() {
        // Форма добавления идеи
        document.getElementById('ideaForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitIdea();
        });

        // Форма комментария
        document.getElementById('commentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitComment();
        });

        // Закрытие модального окна
        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('commentModal').style.display = 'none';
        });

        // Закрытие по клику вне окна
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('commentModal');
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    async loadIdeas() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/ideas`);
            const ideas = await response.json();
            this.displayIdeas(ideas);
        } catch (error) {
            console.error('Ошибка загрузки идей:', error);
            this.showError('Не удалось загрузить идеи');
        }
    }

    displayIdeas(ideas) {
        const container = document.getElementById('ideasContainer');
        
        if (!ideas || ideas.length === 0) {
            container.innerHTML = `
                <div class="no-ideas">
                    <i class="fas fa-inbox"></i>
                    <h3>Пока нет идей</h3>
                    <p>Будьте первым, кто предложит идею для улучшения школы!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = ideas.map(idea => {
            const safeTitle = this.escapeHtml(idea.title || '');
            const safeAuthor = this.escapeHtml(idea.author || 'Аноним');
            const safeDescription = this.escapeHtml(idea.description || '');
            
            return `
                <div class="idea-card" data-id="${idea.id}">
                    <div class="idea-header">
                        <h3 class="idea-title">${safeTitle}</h3>
                        <span class="idea-status">${this.getStatusBadge(idea.status)}</span>
                    </div>
                    <p class="idea-author">Автор: ${safeAuthor}</p>
                    <p class="idea-description">${safeDescription}</p>
                    
                    <div class="idea-stats">
                        <span><i class="fas fa-thumbs-up"></i> ${idea.vote_count || 0} голосов</span>
                        <span><i class="fas fa-comments"></i> ${idea.comment_count || 0} комментариев</span>
                    </div>
                    
                    <div class="idea-footer">
                        <div class="vote-section">
                            <button class="vote-btn" onclick="app.voteForIdea(${idea.id})">
                                <i class="fas fa-thumbs-up"></i> Поддержать
                            </button>
                            <span class="vote-count">${idea.votes || 0}</span>
                        </div>
                        <div>
                            <!-- ИСПРАВЛЕННАЯ КНОПКА "ОБСУДИТЬ" -->
                            <button class="comment-btn" onclick="app.openComments(${idea.id}, '${safeTitle.replace(/'/g, "\\'")}')">
                                <i class="fas fa-comments"></i> Обсудить
                                <span class="comment-count">${idea.comment_count || 0}</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ========== ИСПРАВЛЕННАЯ ФУНКЦИЯ ДЛЯ КНОПКИ "ОБСУДИТЬ" ==========
    async openComments(ideaId, title) {
        console.log('✅ Кнопка "Обсудить" нажата!', ideaId, title);
        
        this.currentIdeaId = ideaId;
        
        // Обновляем заголовок
        document.getElementById('modalTitle').textContent = `Комментарии: ${title}`;
        
        // Очищаем старые комментарии
        const commentsContainer = document.getElementById('commentsContainer');
        commentsContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> Загрузка комментариев...
            </div>
        `;
        
        // Показываем модальное окно
        document.getElementById('commentModal').style.display = 'block';
        
        // Загружаем комментарии
        await this.loadComments(ideaId);
        
        // Фокусируемся на поле ввода
        setTimeout(() => {
            document.getElementById('commentAuthor')?.focus();
        }, 100);
    }

    async loadComments(ideaId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/ideas/${ideaId}/comments`);
            const comments = await response.json();
            this.displayComments(comments);
        } catch (error) {
            console.error('Ошибка загрузки комментариев:', error);
            
            const container = document.getElementById('commentsContainer');
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Не удалось загрузить комментарии</p>
                    <button onclick="app.loadComments(${ideaId})" class="btn">
                        Попробовать снова
                    </button>
                </div>
            `;
        }
    }

    displayComments(comments) {
        const container = document.getElementById('commentsContainer');
        
        if (!comments || comments.length === 0) {
            container.innerHTML = `
                <div class="no-comments">
                    <i class="fas fa-comment-slash"></i>
                    <p>Пока нет комментариев. Будьте первым!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = comments.map(comment => `
            <div class="comment">
                <div class="comment-author">
                    <i class="fas fa-user"></i> ${this.escapeHtml(comment.author || 'Аноним')}
                </div>
                <p class="comment-text">${this.escapeHtml(comment.text)}</p>
                <div class="comment-date">
                    ${new Date(comment.created_at).toLocaleString('ru-RU')}
                </div>
            </div>
        `).join('');
    }

    async submitIdea() {
        const title = document.getElementById('title').value.trim();
        const description = document.getElementById('description').value.trim();
        const author = document.getElementById('author').value.trim();

        if (!title || !description) {
            this.showError('Заполните все поля');
            return;
        }

        // Показываем загрузку
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

            if (result.success) {
                // Очищаем форму
                document.getElementById('ideaForm').reset();
                
                // Показываем сообщение
                this.showMessage('Идея успешно добавлена!', 'success');
                
                // Обновляем список
                setTimeout(() => this.loadIdeas(), 500);
            } else {
                this.showError(result.error || 'Ошибка при добавлении идеи');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError('Не удалось добавить идею');
        } finally {
            // Восстанавливаем кнопку
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async voteForIdea(ideaId) {
        if (!confirm('Поддержать эту идею?')) return;

        // Блокируем кнопку
        const voteBtn = document.querySelector(`.idea-card[data-id="${ideaId}"] .vote-btn`);
        if (voteBtn) {
            voteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Голосую...';
            voteBtn.disabled = true;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/ideas/${ideaId}/vote`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                this.showMessage('Спасибо за ваш голос!', 'success');
                setTimeout(() => this.loadIdeas(), 500);
            } else {
                this.showError(result.error || 'Не удалось проголосовать');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError(error.message || 'Ошибка голосования');
        }
    }

    async submitComment() {
        if (!this.currentIdeaId) {
            this.showError('Не выбрана идея для комментария');
            return;
        }

        const author = document.getElementById('commentAuthor').value.trim();
        const text = document.getElementById('commentText').value.trim();

        if (!text) {
            this.showError('Введите текст комментария');
            return;
        }

        // Показываем загрузку
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

            if (result.success) {
                // Очищаем форму
                document.getElementById('commentText').value = '';
                
                // Показываем сообщение
                this.showMessage('Комментарий добавлен!', 'success');
                
                // Обновляем комментарии
                await this.loadComments(this.currentIdeaId);
                
                // Обновляем список идей
                setTimeout(() => this.loadIdeas(), 500);
            } else {
                this.showError(result.error || 'Ошибка при добавлении комментария');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError('Не удалось добавить комментарий');
        } finally {
            // Восстанавливаем кнопку
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

    getStatusBadge(status) {
        const badges = {
            'pending': '<span style="color: #ff9800;"><i class="fas fa-clock"></i> На рассмотрении</span>',
            'approved': '<span style="color: #4CAF50;"><i class="fas fa-check"></i> Одобрено</span>',
            'rejected': '<span style="color: #f44336;"><i class="fas fa-times"></i> Отклонено</span>'
        };
        return badges[status] || badges['pending'];
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showMessage(text, type = 'info') {
        // Удаляем старые сообщения
        const oldMessages = document.querySelectorAll('.flash-message');
        oldMessages.forEach(msg => msg.remove());
        
        // Создаем новое сообщение
        const message = document.createElement('div');
        message.className = `flash-message ${type}`;
        message.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${text}</span>
        `;
        
        // Стили
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            border-radius: 5px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
            z-index: 9999;
            animation: slideIn 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        document.body.appendChild(message);
        
        // Удаляем через 3 секунды
        setTimeout(() => {
            message.style.opacity = '0';
            setTimeout(() => message.remove(), 300);
        }, 3000);
    }

    showError(text) {
        this.showMessage(text, 'error');
    }
}

// ========== АВАРИЙНЫЙ ФИКС НА СЛУЧАЙ ОШИБКИ ==========

// Простая функция которая точно работает
window.openCommentsEmergency = function(ideaId, title) {
    alert(`💬 Комментарии для идеи: "${title}"\n\nID: ${ideaId}\n\nЧтобы видеть реальные комментарии, убедитесь что:\n1. Сервер работает\n2. API доступен по адресу: /api/ideas/${ideaId}/comments`);
    
    // Создаем простое модальное окно
    const modal = document.createElement('div');
    modal.id = 'emergencyModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        ">
            <h3 style="color: #4b6cb7; margin-bottom: 20px;">
                💬 Комментарии: ${title}
            </h3>
            
            <div style="
                background: #f5f5f5;
                padding: 20px;
                border-radius: 5px;
                margin-bottom: 20px;
                color: #666;
            ">
                <p><strong>ID идеи:</strong> ${ideaId}</p>
                <p><em>Функция комментариев в разработке...</em></p>
            </div>
            
            <form onsubmit="event.preventDefault(); alert('Комментарий отправлен (тестовый режим)'); document.getElementById('emergencyModal').remove();">
                <input type="text" 
                       placeholder="Ваше имя" 
                       style="width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 5px;">
                <textarea placeholder="Ваш комментарий..." 
                          rows="3"
                          style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 5px; resize: vertical;"></textarea>
                <button type="submit" style="
                    background: #4b6cb7;
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                ">
                    Отправить комментарий
                </button>
                <button type="button" 
                        onclick="document.getElementById('emergencyModal').remove()"
                        style="
                            background: #666;
                            color: white;
                            padding: 10px 20px;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            margin-left: 10px;
                        ">
                    Закрыть
                </button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
};

// ========== ЗАПУСК ПРИЛОЖЕНИЯ ==========

document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 Документ загружен, запускаем приложение...');
    
    try {
        // Создаем экземпляр приложения
        app = new CrowdsourcingApp();
        
        // Делаем доступным глобально
        window.app = app;
        
        console.log('✅ Приложение успешно запущено');
        console.log('📍 Доступно как window.app');
        console.log('📍 Кнопка "Обсудить" доступна как app.openComments()');
        
        // Для отладки - добавляем тестовую кнопку
        const debugBtn = document.createElement('button');
        debugBtn.innerHTML = '🔧 Тест комментариев';
        debugBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9998;
            padding: 10px 15px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        `;
        debugBtn.onclick = () => {
            if (app && app.openComments) {
                app.openComments(1, 'Тестовая идея');
            } else {
                window.openCommentsEmergency(1, 'Тестовая идея');
            }
        };
        document.body.appendChild(debugBtn);
        
    } catch (error) {
        console.error('❌ Ошибка запуска приложения:', error);
        
        // Показываем сообщение об ошибке
        document.getElementById('ideasContainer').innerHTML = `
            <div class="error-message">
                <h3><i class="fas fa-exclamation-triangle"></i> Ошибка загрузки</h3>
                <p>${error.message}</p>
                <button onclick="location.reload()" class="btn">
                    <i class="fas fa-redo"></i> Перезагрузить страницу
                </button>
            </div>
        `;
        
        // Аварийный режим
        window.app = {
            openComments: window.openCommentsEmergency
        };
    }
});

// ========== ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ ONCLICK ==========

// Эти функции будут доступны из HTML через onclick
window.voteForIdea = function(ideaId) {
    if (window.app && window.app.voteForIdea) {
        window.app.voteForIdea(ideaId);
    } else {
        alert('Приложение не загружено. Перезагрузите страницу.');
    }
};

window.openComments = function(ideaId, title) {
    if (window.app && window.app.openComments) {
        window.app.openComments(ideaId, title);
    } else {
        // Используем аварийную версию
        window.openCommentsEmergency(ideaId, title);
    }
};
