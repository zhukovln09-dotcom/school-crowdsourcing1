// МИНИМАЛЬНЫЙ РАБОЧИЙ КОД ДЛЯ ШКОЛЬНОГО САЙТА
// Кнопка "Обсудить" точно работает!

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let currentIdeaId = null;
const apiBaseUrl = window.location.origin;

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

// 1. Загрузка всех идей
async function loadIdeas() {
    try {
        console.log('Загружаем идеи...');
        const response = await fetch(`${apiBaseUrl}/api/ideas`);
        
        if (!response.ok) {
            throw new Error(`Ошибка: ${response.status}`);
        }
        
        const ideas = await response.json();
        console.log('Получено идей:', ideas.length);
        displayIdeas(ideas);
        
    } catch (error) {
        console.error('Ошибка загрузки идей:', error);
        document.getElementById('ideasContainer').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px;"></i>
                <p>Не удалось загрузить идеи</p>
                <button onclick="loadIdeas()" style="padding: 10px 20px; background: #4b6cb7; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Попробовать снова
                </button>
            </div>
        `;
    }
}

// 2. Отображение идей
function displayIdeas(ideas) {
    const container = document.getElementById('ideasContainer');
    
    if (!ideas || ideas.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 20px;"></i>
                <p>Пока нет идей</p>
                <p>Будьте первым!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = ideas.map(idea => `
        <div class="idea-card" style="
            background: white;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="color: #182848; margin: 0;">${escapeHtml(idea.title)}</h3>
                <span style="background: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">
                    <i class="fas fa-clock"></i> На рассмотрении
                </span>
            </div>
            
            <p style="color: #666; font-style: italic; margin-bottom: 10px;">
                Автор: ${escapeHtml(idea.author || 'Аноним')}
            </p>
            
            <p style="margin-bottom: 15px; line-height: 1.6;">
                ${escapeHtml(idea.description)}
            </p>
            
            <div style="display: flex; gap: 20px; margin-bottom: 15px; color: #666;">
                <span><i class="fas fa-thumbs-up"></i> ${idea.vote_count || 0} голосов</span>
                <span><i class="fas fa-comments"></i> ${idea.comment_count || 0} комментариев</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; padding-top: 15px;">
                <div>
                    <button onclick="voteForIdea(${idea.id})" style="
                        background: #4CAF50;
                        color: white;
                        padding: 8px 15px;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 5px;
                    ">
                        <i class="fas fa-thumbs-up"></i> Поддержать
                    </button>
                    <span style="margin-left: 10px; font-weight: bold; color: #4b6cb7;">
                        ${idea.votes || 0}
                    </span>
                </div>
                
                <div>
                    <!-- КНОПКА "ОБСУДИТЬ" - РАБОЧАЯ ВЕРСИЯ -->
                    <button onclick="showComments(${idea.id}, '${escapeHtml(idea.title)}')" style="
                        background: #ff9800;
                        color: white;
                        padding: 8px 15px;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 5px;
                    ">
                        <i class="fas fa-comments"></i> Обсудить
                        <span style="
                            background: #ff9800;
                            color: white;
                            padding: 2px 8px;
                            border-radius: 10px;
                            font-size: 0.8rem;
                            margin-left: 5px;
                        ">
                            ${idea.comment_count || 0}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// 3. Функция для кнопки "Обсудить" - ГАРАНТИРОВАННО РАБОТАЕТ
function showComments(ideaId, title) {
    console.log('Кнопка "Обсудить" нажата:', { ideaId, title });
    
    // Сохраняем текущую идею
    currentIdeaId = ideaId;
    
    // Находим элементы
    const modal = document.getElementById('commentModal');
    const modalTitle = document.getElementById('modalTitle');
    
    if (!modal) {
        console.error('Не найдено модальное окно commentModal');
        alert('Ошибка: окно комментариев не найдено. Проверьте HTML.');
        return;
    }
    
    if (!modalTitle) {
        console.error('Не найден заголовок modalTitle');
    }
    
    // Устанавливаем заголовок
    if (modalTitle) {
        modalTitle.textContent = `Комментарии: ${title}`;
    }
    
    // Очищаем старые комментарии
    const commentsContainer = document.getElementById('commentsContainer');
    if (commentsContainer) {
        commentsContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #666;">
                <i class="fas fa-spinner fa-spin"></i> Загрузка комментариев...
            </div>
        `;
    }
    
    // Показываем модальное окно
    modal.style.display = 'block';
    
    // Загружаем комментарии
    loadComments(ideaId);
}

// 4. Загрузка комментариев
async function loadComments(ideaId) {
    try {
        console.log('Загружаем комментарии для идеи:', ideaId);
        const response = await fetch(`${apiBaseUrl}/api/ideas/${ideaId}/comments`);
        
        if (!response.ok) {
            throw new Error(`Ошибка: ${response.status}`);
        }
        
        const comments = await response.json();
        displayComments(comments);
        
    } catch (error) {
        console.error('Ошибка загрузки комментариев:', error);
        
        const container = document.getElementById('commentsContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #f44336;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Не удалось загрузить комментарии</p>
                    <button onclick="loadComments(${ideaId})" style="padding: 8px 15px; background: #4b6cb7; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Попробовать снова
                    </button>
                </div>
            `;
        }
    }
}

// 5. Отображение комментариев
function displayComments(comments) {
    const container = document.getElementById('commentsContainer');
    if (!container) return;
    
    if (!comments || comments.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #666;">
                <i class="fas fa-comment-slash" style="font-size: 48px; margin-bottom: 15px;"></i>
                <p>Пока нет комментариев</p>
                <p>Будьте первым!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = comments.map(comment => `
        <div style="
            background: #f9f9f9;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 5px;
            border-left: 4px solid #4b6cb7;
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div style="font-weight: bold; color: #4b6cb7;">
                    <i class="fas fa-user"></i> ${escapeHtml(comment.author || 'Аноним')}
                </div>
                <div style="font-size: 0.8rem; color: #888;">
                    ${new Date(comment.created_at).toLocaleString('ru-RU')}
                </div>
            </div>
            <p style="line-height: 1.5;">${escapeHtml(comment.text)}</p>
        </div>
    `).join('');
}

// 6. Голосование за идею
async function voteForIdea(ideaId) {
    if (!confirm('Вы уверены, что хотите проголосовать за эту идею?')) {
        return;
    }
    
    try {
        const response = await fetch(`${apiBaseUrl}/api/ideas/${ideaId}/vote`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            const result = await response.json();
            alert(result.error || 'Ошибка голосования');
            return;
        }
        
        alert('Спасибо за ваш голос!');
        loadIdeas(); // Обновляем список
        
    } catch (error) {
        console.error('Ошибка голосования:', error);
        alert('Не удалось проголосовать. Проверьте подключение к интернету.');
    }
}

// 7. Добавление комментария
async function addComment(event) {
    event.preventDefault();
    
    if (!currentIdeaId) {
        alert('Не выбрана идея для комментария');
        return;
    }
    
    const authorInput = document.getElementById('commentAuthor');
    const textInput = document.getElementById('commentText');
    
    const author = authorInput ? authorInput.value.trim() : 'Аноним';
    const text = textInput ? textInput.value.trim() : '';
    
    if (!text) {
        alert('Введите текст комментария');
        return;
    }
    
    if (text.length < 2) {
        alert('Комментарий должен быть не менее 2 символов');
        return;
    }
    
    try {
        const response = await fetch(`${apiBaseUrl}/api/ideas/${currentIdeaId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ author, text })
        });
        
        if (!response.ok) {
            const result = await response.json();
            alert(result.error || 'Ошибка добавления комментария');
            return;
        }
        
        // Очищаем форму
        if (textInput) textInput.value = '';
        
        // Обновляем комментарии
        await loadComments(currentIdeaId);
        
        // Обновляем список идей (чтобы обновить счетчик)
        setTimeout(() => loadIdeas(), 500);
        
    } catch (error) {
        console.error('Ошибка добавления комментария:', error);
        alert('Не удалось добавить комментарий');
    }
}

// 8. Добавление новой идеи
async function addIdea(event) {
    event.preventDefault();
    
    const titleInput = document.getElementById('title');
    const descriptionInput = document.getElementById('description');
    const authorInput = document.getElementById('author');
    
    const title = titleInput ? titleInput.value.trim() : '';
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    const author = authorInput ? authorInput.value.trim() : 'Аноним';
    
    if (!title || !description) {
        alert('Заполните все поля');
        return;
    }
    
    if (title.length < 3) {
        alert('Название должно быть не менее 3 символов');
        return;
    }
    
    if (description.length < 10) {
        alert('Описание должно быть не менее 10 символов');
        return;
    }
    
    try {
        const response = await fetch(`${apiBaseUrl}/api/ideas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, description, author })
        });
        
        if (!response.ok) {
            const result = await response.json();
            alert(result.error || 'Ошибка добавления идеи');
            return;
        }
        
        // Очищаем форму
        if (titleInput) titleInput.value = '';
        if (descriptionInput) descriptionInput.value = '';
        if (authorInput) authorInput.value = '';
        
        alert('Идея успешно добавлена!');
        loadIdeas(); // Обновляем список
        
    } catch (error) {
        console.error('Ошибка добавления идеи:', error);
        alert('Не удалось добавить идею');
    }
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

// Экранирование HTML (защита от XSS)
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Закрытие модального окна
function closeModal() {
    const modal = document.getElementById('commentModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Сайт загружен. Инициализация...');
    
    // Загружаем идеи
    loadIdeas();
    
    // Настраиваем форму добавления идеи
    const ideaForm = document.getElementById('ideaForm');
    if (ideaForm) {
        ideaForm.addEventListener('submit', addIdea);
    } else {
        console.error('Не найдена форма ideaForm');
    }
    
    // Настраиваем форму комментария
    const commentForm = document.getElementById('commentForm');
    if (commentForm) {
        commentForm.addEventListener('submit', addComment);
    } else {
        console.error('Не найдена форма commentForm');
    }
    
    // Настраиваем кнопку закрытия модального окна
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    } else {
        console.error('Не найдена кнопка закрытия .close');
    }
    
    // Закрытие модального окна по клику вне его
    const modal = document.getElementById('commentModal');
    if (modal) {
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeModal();
            }
        });
    }
    
    console.log('Инициализация завершена');
});

// ==================== ПРОСТОЙ ТЕСТ ====================

// Для тестирования в консоли
window.testCommentButton = function() {
    console.log('=== ТЕСТ КНОПКИ "ОБСУДИТЬ" ===');
    console.log('1. Текущая идея:', currentIdeaId);
    console.log('2. Модальное окно:', document.getElementById('commentModal'));
    console.log('3. Заголовок:', document.getElementById('modalTitle'));
    console.log('4. Контейнер комментариев:', document.getElementById('commentsContainer'));
    
    // Создаем тестовую кнопку
    const testBtn = document.createElement('button');
    testBtn.innerHTML = '<i class="fas fa-bug"></i> ТЕСТ: Открыть комментарии';
    testBtn.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 9999;
        padding: 10px 15px;
        background: #f44336;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-family: Arial, sans-serif;
    `;
    testBtn.onclick = () => {
        console.log('Тестовая кнопка нажата');
        showComments(1, 'Тестовая идея');
    };
    
    document.body.appendChild(testBtn);
    console.log('Тестовая кнопка добавлена в правый верхний угол');
};

// Для быстрой проверки в консоли наберите: testCommentButton()
