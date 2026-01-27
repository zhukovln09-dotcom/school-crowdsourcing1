// ПОЛНОСТЬЮ РАБОЧИЙ КОД С АВТОРИЗАЦИЕЙ И РОЛЯМИ

// Основной класс приложения
class CrowdsourcingApp {
    constructor() {
        this.currentIdeaId = null;
        this.apiBaseUrl = window.location.origin;
        this.currentUser = null;
        console.log('🚀 Приложение инициализировано');
    }

    // Инициализация при загрузке страницы
    async init() {
        // Проверяем авторизацию
        await this.checkAuth();
        
        // Загружаем идеи
        await this.loadIdeas();
        
        // Настраиваем интерфейс
        this.setupUI();
        this.setupEventListeners();
        this.setupGlobalFunctions();
    }

    // Проверка авторизации
    async checkAuth() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/auth/me`);
            const data = await response.json();
            
            if (data.success && data.user) {
                this.currentUser = data.user;
                console.log(`👤 Авторизован как: ${this.currentUser.username} (${this.currentUser.role})`);
            }
        } catch (error) {
            console.log('⚠️ Пользователь не авторизован');
        }
    }

    // Настройка UI в зависимости от роли
    setupUI() {
        // Показываем/скрываем элементы в зависимости от авторизации
        const authElements = document.querySelectorAll('.auth-only');
        const noAuthElements = document.querySelectorAll('.no-auth-only');
        const adminElements = document.querySelectorAll('.admin-only');
        const moderatorElements = document.querySelectorAll('.moderator-only');
        const contentManagerElements = document.querySelectorAll('.content-manager-only');
        
        if (this.currentUser) {
            // Пользователь авторизован
            authElements.forEach(el => el.style.display = 'block');
            noAuthElements.forEach(el => el.style.display = 'none');
            
            // Отображаем имя пользователя
            const userInfoElement = document.getElementById('userInfo');
            if (userInfoElement) {
                userInfoElement.innerHTML = `
                    <div class="user-info">
                        <i class="fas fa-user"></i>
                        <span>${this.currentUser.username}</span>
                        <span class="user-role">(${this.getRoleName(this.currentUser.role)})</span>
                        <button onclick="app.logout()" class="logout-btn">
                            <i class="fas fa-sign-out-alt"></i>
                        </button>
                    </div>
                `;
            }
            
            // Проверяем роли
            if (this.currentUser.role === 'admin') {
                adminElements.forEach(el => el.style.display = 'block');
            }
            
            if (this.currentUser.role === 'moderator' || this.currentUser.role === 'admin') {
                moderatorElements.forEach(el => el.style.display = 'block');
            }
            
            if (this.currentUser.role === 'content_manager' || this.currentUser.role === 'admin') {
                contentManagerElements.forEach(el => el.style.display = 'block');
            }
            
        } else {
            // Пользователь не авторизован
            authElements.forEach(el => el.style.display = 'none');
            noAuthElements.forEach(el => el.style.display = 'block');
            adminElements.forEach(el => el.style.display = 'none');
            moderatorElements.forEach(el => el.style.display = 'none');
            contentManagerElements.forEach(el => el.style.display = 'none');
        }
    }

    // Загрузка всех идей
    async loadIdeas() {
        try {
            console.log('📥 Загружаем идеи...');
            const response = await fetch(`${this.apiBaseUrl}/api/ideas`);
            
            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status}`);
            }
            
            const ideas = await response.json();
            console.log(`✅ Загружено ${ideas.length} идей`);
            this.displayIdeas(ideas);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки идей:', error);
            this.showError('Не удалось загрузить идеи. Проверьте подключение к интернету.');
        }
    }

    // Отображение идей
    displayIdeas(ideas) {
        const container = document.getElementById('ideasContainer');
        
        if (!ideas || ideas.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 20px;"></i>
                    <h3>Пока нет идей</h3>
                    <p>Будьте первым, кто предложит идею для улучшения школы!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = ideas.map(idea => {
            // Экранируем текст для безопасности
            const safeTitle = this.escapeHtml(idea.title || 'Без названия');
            const safeAuthor = this.escapeHtml(idea.author || 'Аноним');
            const safeDescription = this.escapeHtml(idea.description || '');
            
            // Проверяем, может ли пользователь удалять идеи
            const canDelete = this.currentUser && 
                (this.currentUser.role === 'moderator' || 
                 this.currentUser.role === 'admin' ||
                 (idea.authorId && idea.authorId === this.currentUser.id));
            
            // Проверяем, может ли пользователь модерировать
            const canModerate = this.currentUser && 
                (this.currentUser.role === 'content_manager' || 
                 this.currentUser.role === 'admin');
            
            return `
                <div class="idea-card" data-id="${idea.id}">
                    <div class="idea-header">
                        <h3 class="idea-title">
                            ${idea.isFeatured ? '<i class="fas fa-star featured-star" title="Избранная идея"></i>' : ''}
                            ${safeTitle}
                        </h3>
                        <div class="idea-header-right">
                            ${this.getStatusBadge(idea.status)}
                            ${canDelete ? `<button class="delete-btn" data-idea-id="${idea.id}" title="Удалить идею"><i class="fas fa-trash"></i></button>` : ''}
                        </div>
                    </div>
                    
                    <p class="idea-author">Автор: ${safeAuthor}</p>
                    
                    <div class="idea-description">${safeDescription}</div>
                    
                    <div class="idea-stats">
                        <span><i class="fas fa-thumbs-up"></i> ${idea.vote_count || 0} голосов</span>
                        <span><i class="fas fa-comments"></i> ${idea.comment_count || 0} комментариев</span>
                        <span><i class="fas fa-clock"></i> ${new Date(idea.created_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                    
                    ${canModerate ? `
                        <div class="moderation-panel">
                            <select class="status-select" data-idea-id="${idea.id}">
                                <option value="pending" ${idea.status === 'pending' ? 'selected' : ''}>На рассмотрении</option>
                                <option value="approved" ${idea.status === 'approved' ? 'selected' : ''}>Одобрено</option>
                                <option value="rejected" ${idea.status === 'rejected' ? 'selected' : ''}>Отклонено</option>
                                <option value="in_progress" ${idea.status === 'in_progress' ? 'selected' : ''}>В работе</option>
                                <option value="completed" ${idea.status === 'completed' ? 'selected' : ''}>Реализовано</option>
                            </select>
                            <label class="featured-checkbox">
                                <input type="checkbox" ${idea.isFeatured ? 'checked' : ''} data-idea-id="${idea.id}">
                                Избранная
                            </label>
                            <button class="moderate-btn" data-idea-id="${idea.id}">Применить</button>
                        </div>
                    ` : ''}
                    
                    <div class="idea-footer">
                        <div class="vote-section">
                            <button class="vote-btn" data-idea-id="${idea.id}" ${!this.currentUser ? 'disabled title="Требуется авторизация"' : ''}>
                                <i class="fas fa-thumbs-up"></i> Поддержать
                            </button>
                            <span class="vote-count" id="vote-count-${idea.id}">
                                ${idea.vote_count || 0}
                            </span>
                        </div>
                        
                        <div>
                            <button class="comment-btn" data-idea-id="${idea.id}" data-idea-title="${safeTitle}">
                                <i class="fas fa-comments"></i> Обсудить
                                <span class="comment-count">${idea.comment_count || 0}</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Добавляем обработчики
        this.attachEventListeners();
    }

    // Привязка обработчиков событий к кнопкам
    attachEventListeners() {
        // Кнопки "Поддержать"
        document.querySelectorAll('.vote-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const ideaId = e.currentTarget.getAttribute('data-idea-id');
                if (ideaId) {
                    this.voteForIdea(ideaId, e.currentTarget);
                }
            });
        });
        
        // Кнопки "Обсудить"
        document.querySelectorAll('.comment-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const ideaId = e.currentTarget.getAttribute('data-idea-id');
                const ideaTitle = e.currentTarget.getAttribute('data-idea-title');
                if (ideaId) {
                    this.openComments(ideaId, ideaTitle);
                }
            });
        });
        
        // Кнопки удаления
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const ideaId = e.currentTarget.getAttribute('data-idea-id');
                if (ideaId && confirm('Вы уверены, что хотите удалить эту идею?')) {
                    this.deleteIdea(ideaId, e.currentTarget);
                }
            });
        });
        
        // Кнопки модерации
        document.querySelectorAll('.moderate-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const ideaId = e.currentTarget.getAttribute('data-idea-id');
                if (ideaId) {
                    this.moderateIdea(ideaId, e.currentTarget);
                }
            });
        });
    }

    // Настройка обработчиков форм
    setupEventListeners() {
        // Форма добавления идеи
        const ideaForm = document.getElementById('ideaForm');
        if (ideaForm) {
            ideaForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitIdea();
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
        
        // Форма регистрации
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.register();
            });
        }
        
        // Форма входа
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
        }
        
        // Форма входа по коду
        const codeLoginForm = document.getElementById('codeLoginForm');
        if (codeLoginForm) {
            codeLoginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.loginWithCode();
            });
        }
        
        // Форма завершения регистрации по коду
        const codeRegisterForm = document.getElementById('codeRegisterForm');
        if (codeRegisterForm) {
            codeRegisterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.completeCodeRegistration();
            });
        }
        
        // Форма верификации
        const verifyForm = document.getElementById('verifyForm');
        if (verifyForm) {
            verifyForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.verifyEmail();
            });
        }
        
        // Форма создания пригласительного кода (админ)
        const createInviteForm = document.getElementById('createInviteForm');
        if (createInviteForm) {
            createInviteForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createInvitationCode();
            });
        }
        
        // Закрытие модальных окон
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                closeBtn.closest('.modal').style.display = 'none';
            });
        });
        
        // Закрытие по клику вне окна
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
        
        // Переключение между формами авторизации
        const showLoginBtn = document.getElementById('showLogin');
        if (showLoginBtn) {
            showLoginBtn.addEventListener('click', () => {
                this.showAuthForm('login');
            });
        }
        
        const showRegisterBtn = document.getElementById('showRegister');
        if (showRegisterBtn) {
            showRegisterBtn.addEventListener('click', () => {
                this.showAuthForm('register');
            });
        }
        
        const showCodeLoginBtn = document.getElementById('showCodeLogin');
        if (showCodeLoginBtn) {
            showCodeLoginBtn.addEventListener('click', () => {
                this.showAuthForm('code-login');
            });
        }
    }

    // Создание глобальных функций
    setupGlobalFunctions() {
        window.app = this;
        
        window.voteForIdeaGlobal = (ideaId) => {
            const button = document.querySelector(`.vote-btn[data-idea-id="${ideaId}"]`);
            if (button) {
                this.voteForIdea(ideaId, button);
            }
        };
        
        window.openCommentsGlobal = (ideaId, title) => {
            this.openComments(ideaId, title);
        };
        
        window.showAuthModal = () => {
            this.showAuthModal();
        };
        
        window.showAdminPanel = () => {
            this.showAdminPanel();
        };
        
        window.logout = () => {
            this.logout();
        };
    }

    // ========== АВТОРИЗАЦИЯ ==========

    // Регистрация
    async register() {
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value.trim();
        const username = document.getElementById('registerUsername').value.trim();
        
        if (!email || !password || !username) {
            this.showError('Заполните все поля');
            return;
        }
        
        if (!email.includes('@')) {
            this.showError('Введите корректный email');
            return;
        }
        
        if (password.length < 6) {
            this.showError('Пароль должен быть не менее 6 символов');
            return;
        }
        
        const submitBtn = document.querySelector('#registerForm button[type="submit"]');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрируем...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, username })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка регистрации');
            }
            
            // Показываем форму верификации
            this.showAuthForm('verify');
            document.getElementById('verifyEmail').value = email;
            this.showMessage('Регистрация успешна! Проверьте email для подтверждения.', 'success');
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            submitBtn.innerHTML = originalHTML;
            submitBtn.disabled = false;
        }
    }

    // Верификация email
    async verifyEmail() {
        const email = document.getElementById('verifyEmail').value.trim();
        const code = document.getElementById('verifyCode').value.trim();
        
        if (!email || !code) {
            this.showError('Заполните все поля');
            return;
        }
        
        const submitBtn = document.querySelector('#verifyForm button[type="submit"]');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Проверяем...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/auth/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка верификации');
            }
            
            this.showMessage('Email успешно подтвержден! Теперь вы можете войти.', 'success');
            this.showAuthForm('login');
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            submitBtn.innerHTML = originalHTML;
            submitBtn.disabled = false;
        }
    }

    // Вход
    async login() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        
        if (!email || !password) {
            this.showError('Заполните все поля');
            return;
        }
        
        const submitBtn = document.querySelector('#loginForm button[type="submit"]');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Входим...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка входа');
            }
            
            this.currentUser = data.user;
            this.setupUI();
            this.hideAuthModal();
            this.showMessage(`Добро пожаловать, ${data.user.username}!`, 'success');
            
            // Перезагружаем идеи
            await this.loadIdeas();
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            submitBtn.innerHTML = originalHTML;
            submitBtn.disabled = false;
        }
    }

    // Вход по коду
    async loginWithCode() {
        const code = document.getElementById('inviteCode').value.trim().toUpperCase();
        
        if (!code) {
            this.showError('Введите пригласительный код');
            return;
        }
        
        const submitBtn = document.querySelector('#codeLoginForm button[type="submit"]');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Проверяем...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/auth/login-with-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Неверный код');
            }
            
            // Показываем форму завершения регистрации
            this.showAuthForm('code-register');
            this.showMessage(`Код принят! Вы регистрируетесь как ${this.getRoleName(data.role)}`, 'success');
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            submitBtn.innerHTML = originalHTML;
            submitBtn.disabled = false;
        }
    }

    // Завершение регистрации по коду
    async completeCodeRegistration() {
        const email = document.getElementById('codeRegisterEmail').value.trim();
        const password = document.getElementById('codeRegisterPassword').value.trim();
        const username = document.getElementById('codeRegisterUsername').value.trim();
        
        if (!email || !password || !username) {
            this.showError('Заполните все поля');
            return;
        }
        
        if (!email.includes('@')) {
            this.showError('Введите корректный email');
            return;
        }
        
        if (password.length < 6) {
            this.showError('Пароль должен быть не менее 6 символов');
            return;
        }
        
        const submitBtn = document.querySelector('#codeRegisterForm button[type="submit"]');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрируем...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/auth/complete-code-registration`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, username })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка регистрации');
            }
            
            this.currentUser = data.user;
            this.setupUI();
            this.hideAuthModal();
            this.showMessage(`Добро пожаловать, ${data.user.username}!`, 'success');
            
            // Перезагружаем идеи
            await this.loadIdeas();
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            submitBtn.innerHTML = originalHTML;
            submitBtn.disabled = false;
        }
    }

    // Выход
    async logout() {
        try {
            await fetch(`${this.apiBaseUrl}/api/auth/logout`, {
                method: 'POST'
            });
            
            this.currentUser = null;
            this.setupUI();
            this.showMessage('Вы вышли из системы', 'success');
            
            // Перезагружаем идеи
            await this.loadIdeas();
            
        } catch (error) {
            console.error('Ошибка выхода:', error);
        }
    }

    // ========== ОСНОВНЫЕ ФУНКЦИИ ==========

    // Добавление идеи
    async submitIdea() {
        if (!this.currentUser) {
            this.showError('Для добавления идеи требуется авторизация');
            this.showAuthModal();
            return;
        }
        
        const title = document.getElementById('title').value.trim();
        const description = document.getElementById('description').value.trim();
        
        if (!title || !description) {
            this.showError('Пожалуйста, заполните все поля');
            return;
        }
        
        if (title.length < 3) {
            this.showError('Название идеи должно быть не менее 3 символов');
            return;
        }
        
        if (description.length < 10) {
            this.showError('Описание должно быть не менее 10 символов');
            return;
        }
        
        const submitBtn = document.querySelector('#ideaForm button[type="submit"]');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Публикую...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/ideas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка публикации');
            }
            
            document.getElementById('ideaForm').reset();
            this.showMessage('🎉 Идея успешно опубликована!', 'success');
            await this.loadIdeas();
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            submitBtn.innerHTML = originalHTML;
            submitBtn.disabled = false;
        }
    }

    // Голосование
    async voteForIdea(ideaId, buttonElement) {
        if (!this.currentUser) {
            this.showError('Для голосования требуется авторизация');
            this.showAuthModal();
            return;
        }
        
        if (!confirm('Вы уверены, что хотите поддержать эту идею?')) {
            return;
        }
        
        const originalHTML = buttonElement.innerHTML;
        buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Голосую...';
        buttonElement.disabled = true;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/ideas/${ideaId}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка голосования');
            }
            
            this.showMessage('Спасибо за ваш голос! 💙', 'success');
            await this.loadIdeas();
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            buttonElement.innerHTML = originalHTML;
            buttonElement.disabled = false;
        }
    }

    // Удаление идеи
    async deleteIdea(ideaId, buttonElement) {
        const originalHTML = buttonElement.innerHTML;
        buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Удаляем...';
        buttonElement.disabled = true;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/ideas/${ideaId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка удаления');
            }
            
            this.showMessage('Идея удалена', 'success');
            await this.loadIdeas();
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            buttonElement.innerHTML = originalHTML;
            buttonElement.disabled = false;
        }
    }

    // Модерация идеи
    async moderateIdea(ideaId, buttonElement) {
        const card = buttonElement.closest('.idea-card');
        const status = card.querySelector('.status-select').value;
        const isFeatured = card.querySelector('.featured-checkbox input').checked;
        
        const originalHTML = buttonElement.innerHTML;
        buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохраняем...';
        buttonElement.disabled = true;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/ideas/${ideaId}/moderate`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, isFeatured })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка модерации');
            }
            
            this.showMessage('Изменения сохранены', 'success');
            await this.loadIdeas();
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            buttonElement.innerHTML = originalHTML;
            buttonElement.disabled = false;
        }
    }

    // Открытие комментариев
    openComments(ideaId, title) {
        this.currentIdeaId = ideaId;
        
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) {
            modalTitle.textContent = `Комментарии: ${title}`;
        }
        
        const commentsContainer = document.getElementById('commentsContainer');
        if (commentsContainer) {
            commentsContainer.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i> Загрузка комментариев...
                </div>
            `;
        }
        
        const modal = document.getElementById('commentModal');
        if (modal) {
            modal.style.display = 'block';
        }
        
        this.loadAndDisplayComments(ideaId);
        
        setTimeout(() => {
            const commentText = document.getElementById('commentText');
            if (commentText) {
                commentText.focus();
            }
        }, 100);
    }

    // Загрузка комментариев
    async loadAndDisplayComments(ideaId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/ideas/${ideaId}/comments`);
            
            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status}`);
            }
            
            const comments = await response.json();
            this.displayCommentsInModal(comments);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки комментариев:', error);
            
            const container = document.getElementById('commentsContainer');
            if (container) {
                container.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h4>Не удалось загрузить комментарии</h4>
                        <p>${error.message}</p>
                        <button onclick="app.loadAndDisplayComments(${ideaId})" class="btn-small">
                            <i class="fas fa-redo"></i> Попробовать снова
                        </button>
                    </div>
                `;
            }
        }
    }

    // Отображение комментариев
    displayCommentsInModal(comments) {
        const container = document.getElementById('commentsContainer');
        if (!container) return;
        
        if (!comments || comments.length === 0) {
            container.innerHTML = `
                <div class="no-comments">
                    <i class="fas fa-comment-slash"></i>
                    <h4>Пока нет комментариев</h4>
                    <p>Будьте первым, кто оставит комментарий!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = comments.map(comment => `
            <div class="comment">
                <div class="comment-header">
                    <span class="comment-author">
                        <i class="fas fa-user-circle"></i> ${this.escapeHtml(comment.author || 'Аноним')}
                    </span>
                    <span class="comment-date">
                        ${new Date(comment.created_at).toLocaleString('ru-RU')}
                    </span>
                </div>
                <div class="comment-text">${this.escapeHtml(comment.text)}</div>
            </div>
        `).join('');
    }

    // Добавление комментария
    async submitComment() {
        if (!this.currentUser) {
            this.showError('Для добавления комментария требуется авторизация');
            return;
        }
        
        if (!this.currentIdeaId) {
            this.showError('Не выбрана идея для комментария');
            return;
        }
        
        const text = document.getElementById('commentText').value.trim();
        
        if (!text) {
            this.showError('Пожалуйста, введите текст комментария');
            return;
        }
        
        if (text.length < 2) {
            this.showError('Комментарий должен быть не менее 2 символов');
            return;
        }
        
        const submitBtn = document.querySelector('#commentForm button[type="submit"]');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправляю...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/ideas/${this.currentIdeaId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка добавления');
            }
            
            document.getElementById('commentText').value = '';
            this.showMessage('💬 Комментарий добавлен!', 'success');
            await this.loadAndDisplayComments(this.currentIdeaId);
            await this.loadIdeas();
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            submitBtn.innerHTML = originalHTML;
            submitBtn.disabled = false;
        }
    }

    // Создание пригласительного кода (админ)
    async createInvitationCode() {
        const role = document.getElementById('inviteRole').value;
        const maxUses = document.getElementById('inviteMaxUses').value;
        const expiresInHours = document.getElementById('inviteExpires').value;
        
        const submitBtn = document.querySelector('#createInviteForm button[type="submit"]');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Создаем...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/admin/invitation-codes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    role, 
                    maxUses: parseInt(maxUses) || 1,
                    expiresInHours: parseInt(expiresInHours) || 720 // 30 дней по умолчанию
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка создания кода');
            }
            
            this.showMessage(`Код создан: ${data.code}`, 'success');
            document.getElementById('createdCode').textContent = data.code;
            document.getElementById('codeExpires').textContent = new Date(data.expiresAt).toLocaleDateString('ru-RU');
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            submitBtn.innerHTML = originalHTML;
            submitBtn.disabled = false;
        }
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

    // Показать форму авторизации
    showAuthForm(formName) {
        document.querySelectorAll('.auth-form').forEach(form => {
            form.style.display = 'none';
        });
        
        document.getElementById(`${formName}Form`).style.display = 'block';
    }

    // Показать модальное окно авторизации
    showAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'block';
            this.showAuthForm('login');
        }
    }

    // Скрыть модальное окно авторизации
    hideAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Показать админ-панель
    showAdminPanel() {
        const modal = document.getElementById('adminModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    // Получить название роли
    getRoleName(role) {
        const roles = {
            'user': 'Пользователь',
            'moderator': 'Модератор',
            'content_manager': 'Контент-менеджер',
            'admin': 'Администратор'
        };
        return roles[role] || role;
    }

    // Отображение бейджа статуса
    getStatusBadge(status) {
        const badges = {
            'pending': '<span class="badge badge-pending"><i class="fas fa-clock"></i> На рассмотрении</span>',
            'approved': '<span class="badge badge-approved"><i class="fas fa-check"></i> Одобрено</span>',
            'rejected': '<span class="badge badge-rejected"><i class="fas fa-times"></i> Отклонено</span>',
            'in_progress': '<span class="badge badge-in-progress"><i class="fas fa-cog"></i> В работе</span>',
            'completed': '<span class="badge badge-completed"><i class="fas fa-flag-checkered"></i> Реализовано</span>',
            'featured': '<span class="badge badge-featured"><i class="fas fa-star"></i> Избранная</span>'
        };
        
        return badges[status] || badges['pending'];
    }

    // Экранирование HTML
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Показать сообщение
    showMessage(text, type = 'info') {
        const existing = document.querySelectorAll('.app-message');
        existing.forEach(msg => msg.remove());
        
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
        
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(message);
        
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
            }, 4000);
        }
    }

    // Показать ошибку
    showError(text) {
        this.showMessage(text, 'error');
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 Документ загружен');
    
    try {
        const app = new CrowdsourcingApp();
        window.app = app;
        await app.init();
        
        console.log('✅ Приложение успешно запущено');
        
    } catch (error) {
        console.error('❌ Фатальная ошибка инициализации:', error);
        
        const container = document.getElementById('ideasContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #f44336;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px;"></i>
                    <h3>Ошибка загрузки приложения</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" style="
                        padding: 10px 20px;
                        background: #4b6cb7;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        margin-top: 20px;
                    ">
                        <i class="fas fa-redo"></i> Перезагрузить страницу
                    </button>
                </div>
            `;
        }
    }
});
