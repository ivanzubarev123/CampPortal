# Инструкция по запуску и развертыванию

## 1. Локальный запуск

### 1.1. Клонирование репозитория

```bash
git clone <ссылка-на-репозиторий>
cd camp_project
```

### 1.2. Создание виртуального окружения

```bash
python -m venv venv
```

### 1.3. Активация окружения

Windows:

```bash
venv\Scripts\activate
```

macOS/Linux:

```bash
source venv/bin/activate
```

### 1.4. Установка зависимостей

```bash
pip install -r requirements.txt
```

### 1.5. Создание файла .env

Создать файл `.env` в корне проекта.

Пример:

```env
SECRET_KEY=dev-secret-key
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/camp_db
```

### 1.6. Создание базы данных

Создать базу данных PostgreSQL с названием `camp_db`.

Затем выполнить SQL-скрипты:

```bash
psql -U postgres -d camp_db -f schema.sql
psql -U postgres -d camp_db -f seed.sql
```

### 1.7. Запуск приложения

```bash
flask run
```

После запуска сайт будет доступен по адресу:

```text
http://127.0.0.1:5000
```

## 2. Развертывание на Render

### 2.1. Подготовка проекта

В проекте должны быть файлы:

- `requirements.txt`
- `Procfile`
- `app.py`
- `schema.sql`
- `seed.sql`

### 2.2. Загрузка проекта на GitHub

```bash
git add .
git commit -m "Prepare project for deployment"
git push
```

### 2.3. Создание Web Service

1. Зайти на Render.
2. Создать новый Web Service.
3. Подключить GitHub-репозиторий.
4. Указать команду запуска:

```bash
gunicorn app:app
```

### 2.4. Создание PostgreSQL

1. Создать PostgreSQL Database в Render.
2. Скопировать Internal Database URL или External Database URL.
3. Добавить переменную окружения `DATABASE_URL`.

### 2.5. Переменные окружения

Добавить:

```text
SECRET_KEY
DATABASE_URL
```

### 2.6. Проверка

После деплоя проверить:

- открывается ли сайт;
- работает ли вход;
- отображаются ли данные;
- работает ли добавление;
- формируется ли отчет.
