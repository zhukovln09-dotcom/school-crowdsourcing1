const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class Database {
    constructor() {
        // На Render используем /tmp папку, но с восстановлением из бэкапа
        this.dbPath = '/tmp/school.db';
        this.backupPath = '/tmp/school_backup.db';
        
        // Проверяем, есть ли бэкап
        if (fs.existsSync(this.backupPath)) {
            console.log('Восстанавливаем базу из бэкапа...');
            fs.copyFileSync(this.backupPath, this.dbPath);
        }
        
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('Ошибка подключения к БД:', err);
            } else {
                console.log('Подключено к базе данных:', this.dbPath);
                this.initDatabase();
            }
        });
        
        // Создаем бэкап каждые 4 часа
        setInterval(() => this.createBackup(), 4 * 60 * 60 * 1000);
    }
    
    createBackup() {
        if (fs.existsSync(this.dbPath)) {
            fs.copyFileSync(this.dbPath, this.backupPath);
            console.log('Создан бэкап базы данных');
        }
    }
    
    initDatabase() {
        // Таблица для идей (проектов)
        this.db.run(`
            CREATE TABLE IF NOT EXISTS ideas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                author TEXT NOT NULL,
                votes INTEGER DEFAULT 0,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Таблица для комментариев
        this.db.run(`
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                idea_id INTEGER NOT NULL,
                author TEXT NOT NULL,
                text TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (idea_id) REFERENCES ideas (id)
            )
        `);

        // Таблица для голосов
        this.db.run(`
            CREATE TABLE IF NOT EXISTS votes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                idea_id INTEGER NOT NULL,
                user_ip TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(idea_id, user_ip)
            )
        `);

        console.log('База данных инициализирована');
    }

    // Получить все идеи
    getAllIdeas(callback) {
        this.db.all(`
            SELECT i.*, 
                   COUNT(DISTINCT v.id) as vote_count,
                   COUNT(DISTINCT c.id) as comment_count
            FROM ideas i
            LEFT JOIN votes v ON i.id = v.idea_id
            LEFT JOIN comments c ON i.id = c.idea_id
            GROUP BY i.id
            ORDER BY i.votes DESC, i.created_at DESC
        `, callback);
    }

    // Добавить новую идею
    addIdea(title, description, author, callback) {
        this.db.run(
            'INSERT INTO ideas (title, description, author) VALUES (?, ?, ?)',
            [title, description, author],
            callback
        );
    }

    // Проголосовать за идею
    voteForIdea(ideaId, userIp, callback) {
        // Сначала проверяем, не голосовал ли уже пользователь
        this.db.get(
            'SELECT id FROM votes WHERE idea_id = ? AND user_ip = ?',
            [ideaId, userIp],
            (err, row) => {
                if (err) {
                    callback(err);
                } else if (row) {
                    callback(new Error('Вы уже голосовали за эту идею'));
                } else {
                    // Добавляем голос
                    this.db.run(
                        'INSERT INTO votes (idea_id, user_ip) VALUES (?, ?)',
                        [ideaId, userIp],
                        (err) => {
                            if (err) {
                                callback(err);
                            } else {
                                // Обновляем счетчик голосов
                                this.db.run(
                                    'UPDATE ideas SET votes = votes + 1 WHERE id = ?',
                                    [ideaId],
                                    callback
                                );
                            }
                        }
                    );
                }
            }
        );
    }

    // Добавить комментарий
    addComment(ideaId, author, text, callback) {
        this.db.run(
            'INSERT INTO comments (idea_id, author, text) VALUES (?, ?, ?)',
            [ideaId, author, text],
            callback
        );
    }

    // Получить комментарии для идеи
    getComments(ideaId, callback) {
        this.db.all(
            'SELECT * FROM comments WHERE idea_id = ? ORDER BY created_at ASC',
            [ideaId],
            callback
        );
    }
}


module.exports = new Database();
