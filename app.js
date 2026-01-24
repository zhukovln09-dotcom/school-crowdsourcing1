class CrowdsourcingApp {
    constructor() {
        this.currentIdeaId = null;
        this.init();
    }

    init() {
        // Загружаем идеи при загрузке страницы
        this.loadIdeas();
        
        // Настраиваем обработчики событий
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Форма добавления идеи
        document.getElementById('ideaForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitIdea();
        });

        // Модальное окно
        const modal = document.getElementById('commentModal');
        const closeBtn = document.querySelector('.close');
        
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Форма комментария
        document.getElementById('commentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitComment();
        });
    }

    async loadIdeas() {
        try {
            const response = await fetch('/api/ideas');
            const ideas = await response.json();
            this.displayIdeas(ideas);
        } catch (error) {
            console.error('Ошибка загрузки идей:', error);
            this.showError('Не удалось загрузить идеи');
        }
    }

    displayIdeas(ideas) {
        const container = document.getElementById('ideasContainer');
        
        if (ideas.length === 0) {
            container.innerHTML = `
                <div class="no-ideas">
                    <i class="fas fa-inbox"></i>
                    <h3>Пока нет идей</h3>
                    <p>Будьте первым, кто предложит идею для улучшения школы!</p>
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
                <p class="idea-author">Автор: ${this.escapeHtml(idea.author)}</p>
                <p class="idea-description">${this.escapeHtml(idea.description)}</p>
                <div class="idea-footer">
                    <div class="vote-section">
                        <button class="vote-btn" onclick="app.voteForIdea(${idea.id})">
                            <i class="fas fa-thumbs-up"></i> Поддержать
                        </button>
                        <span class="vote-count">${idea.vote_count || 0} голосов</span>
                    </div>
                    <div>
                        <button class="comment-btn" onclick="app.showComments(${idea.id}, '${this.escapeHtml(idea.title)}')">
                            <i class="fas fa-comments"></i> Комментарии
                            <span class="comment-count">${idea.comment_count || 0}</span>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async submitIdea() {
        const title = document.getElementById('title').value.trim();
        const description = document.getElementById('description').value.trim();
        const author = document.getElementById('author').value.trim();

        if (!title || !description || !author) {
            this.showError('Заполните все поля');
            return;
        }

        try {
            const response = await fetch('/api/ideas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title, description, author })
            });

            const result = await response.json();

            if (result.success) {
                // Очищаем форму
                document.getElementById('ideaForm').reset();
                
                // Показываем сообщение об успехе
                this.showMessage('Идея успешно добавлена!', 'success');
                
                // Обновляем список идей
                this.loadIdeas();
            } else {
                this.showError(result.error || 'Ошибка при добавлении идеи');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError('Не удалось добавить идею');
        }
    }

    async voteForIdea(ideaId) {
        try {
            const response = await fetch(`/api/ideas/${ideaId}/vote`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                this.showMessage('Ваш голос учтен!', 'success');
                this.loadIdeas();
            } else {
                this.showError(result.error || 'Вы уже голосовали за эту идею');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError('Не удалось проголосовать');
        }
    }

    async showComments(ideaId, title) {
        this.currentIdeaId = ideaId;
        
        // Устанавливаем заголовок
        document.getElementById('modalTitle').textContent = `Комментарии: ${title}`;
        
        // Загружаем комментарии
        await this.loadComments(ideaId);
        
        // Показываем модальное окно
        document.getElementById('commentModal').style.display = 'block';
    }

    async loadComments(ideaId) {
        try {
            const response = await fetch(`/api/ideas/${ideaId}/comments`);
            const comments = await response.json();
            
            this.displayComments(comments);
        } catch (error) {
            console.error('Ошибка загрузки комментариев:', error);
            this.showError('Не удалось загрузить комментарии');
        }
    }

    displayComments(comments) {
        const container = document.getElementById('commentsContainer');
        
        if (comments.length === 0) {
            container.innerHTML = `
                <div class="no-comments">
                    <p>Пока нет комментариев. Будьте первым!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = comments.map(comment => `
            <div class="comment">
                <div class="comment-author">
                    <i class="fas fa-user"></i> ${this.escapeHtml(comment.author)}
                </div>
                <p class="comment-text">${this.escapeHtml(comment.text)}</p>
                <div class="comment-date">
                    ${new Date(comment.created_at).toLocaleString('ru-RU')}
                </div>
            </div>
        `).join('');
    }

    async submitComment() {
        const author = document.getElementById('commentAuthor').value.trim();
        const text = document.getElementById('commentText').value.trim();

        if (!author || !text) {
            this.showError('Заполните все поля');
            return;
        }

        try {
            const response = await fetch(`/api/ideas/${this.currentIdeaId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ author, text })
            });

            const result = await response.json();

            if (result.success) {
                // Очищаем форму
                document.getElementById('commentForm').reset();
                
                // Обновляем комментарии
                await this.loadComments(this.currentIdeaId);
                
                // Обновляем список идей (чтобы обновить счетчик комментариев)
                this.loadIdeas();
            } else {
                this.showError(result.error || 'Ошибка при добавлении комментария');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError('Не удалось добавить комментарий');
        }
    }

    getStatusBadge(status) {
        const badges = {
            'pending': '<span style="color: #ff9800;"><i class="fas fa-clock"></i> На рассмотрении</span>',
            'approved': '<span style="color: #4CAF50;"><i class="fas fa-check"></i> Одобрено</span>',
            'rejected': '<span style="color: #f44336;"><i class="fas fa-times"></i> Отклонено</span>',
            'in_progress': '<span style="color: #2196F3;"><i class="fas fa-cog"></i> В работе</span>',
            'completed': '<span style="color: #9C27B0;"><i class="fas fa-flag-checkered"></i> Реализовано</span>'
        };
        
        return badges[status] || badges['pending'];
    }

    showMessage(text, type = 'info') {
        // Создаем элемент для сообщения
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            ${text}
        `;
        
        // Стили для сообщения
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            border-radius: 5px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        // Анимация
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(message);
        
        // Удаляем сообщение через 3 секунды
        setTimeout(() => {
            message.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => message.remove(), 300);
        }, 3000);
    }

    showError(text) {
        this.showMessage(text, 'error');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Инициализация приложения при загрузке страницы
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new CrowdsourcingApp();
});

// Делаем app глобальной для использования в onclick
window.app = app;