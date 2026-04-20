// -------------------- ТАЙМЕР ОТ 21.11.2025 0:45 (прошедшее время) --------------------
const startDate = new Date(2025, 10, 21, 0, 45, 0); // 21 ноября 2025, 00:45

function formatElapsedTime(ms) {
    if (ms < 0) return "Ожидаем старта (ещё не наступило)";
    const totalSeconds = Math.floor(ms / 1000);
    const years = Math.floor(totalSeconds / (365.25 * 24 * 3600));
    let remaining = totalSeconds % (365.25 * 24 * 3600);
    const months = Math.floor(remaining / (30.44 * 24 * 3600));
    remaining %= (30.44 * 24 * 3600);
    const days = Math.floor(remaining / (24 * 3600));
    remaining %= (24 * 3600);
    const hours = Math.floor(remaining / 3600);
    remaining %= 3600;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    
    const parts = [];
    if (years > 0) parts.push(`${years} ${declension(years, 'год', 'года', 'лет')}`);
    if (months > 0) parts.push(`${months} ${declension(months, 'месяц', 'месяца', 'месяцев')}`);
    if (days > 0) parts.push(`${days} ${declension(days, 'день', 'дня', 'дней')}`);
    if (hours > 0) parts.push(`${hours} ${declension(hours, 'час', 'часа', 'часов')}`);
    if (minutes > 0) parts.push(`${minutes} ${declension(minutes, 'минута', 'минуты', 'минут')}`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} ${declension(seconds, 'секунда', 'секунды', 'секунд')}`);
    return parts.join(', ');
}

function declension(n, one, two, five) {
    n = Math.abs(n) % 100;
    if (n > 10 && n < 20) return five;
    const last = n % 10;
    if (last === 1) return one;
    if (last >= 2 && last <= 4) return two;
    return five;
}

function updateTimer() {
    const now = new Date();
    const diff = now - startDate;
    const timerEl = document.getElementById('timerDisplay');
    if (diff < 0) {
        timerEl.innerText = "Событие ещё не наступило (будет 21.11.2025 00:45)";
    } else {
        timerEl.innerText = formatElapsedTime(diff);
    }
}
updateTimer();
setInterval(updateTimer, 1000);

// ---------- Хранилище (users, messages, сессия) ----------
let users = JSON.parse(localStorage.getItem('chat_users_v2')) || [];
let messages = JSON.parse(localStorage.getItem('chat_messages_v2')) || [];
let currentUser = JSON.parse(localStorage.getItem('chat_current_user_v2')) || null;

function saveUsers() { localStorage.setItem('chat_users_v2', JSON.stringify(users)); }
function saveMessages() { localStorage.setItem('chat_messages_v2', JSON.stringify(messages)); }
function saveCurrent() { localStorage.setItem('chat_current_user_v2', JSON.stringify(currentUser)); }

// Реакции: хранятся в message.reactions как { "❤️": ["user1","user2"] }
function toggleReaction(msgId, emoji, username) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return false;
    if (!msg.reactions) msg.reactions = {};
    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
    const idx = msg.reactions[emoji].indexOf(username);
    if (idx === -1) {
        msg.reactions[emoji].push(username);
    } else {
        msg.reactions[emoji].splice(idx, 1);
        if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
    }
    saveMessages();
    renderMessages();
    return true;
}

// рендер сообщений
function renderMessages() {
    const container = document.getElementById('messagesWindow');
    if (!container) return;
    const login = currentUser ? currentUser.login : null;
    container.innerHTML = '';
    if (messages.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'message message-other';
        emptyDiv.innerHTML = `<div class="msg-header"><span class="msg-username">💬 Чат</span><span class="msg-time"></span></div><div class="msg-text">Напишите первое сообщение или отправьте гифку!</div>`;
        container.appendChild(emptyDiv);
    } else {
        messages.forEach(msg => {
            const isOwn = (login === msg.username);
            const msgDiv = document.createElement('div');
            msgDiv.className = `message ${isOwn ? 'message-own' : 'message-other'}`;
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second:'2-digit' });
            let gifHtml = msg.gifUrl ? `<img src="${msg.gifUrl}" class="msg-gif" alt="gif" loading="lazy">` : '';
            let reactionsHtml = '';
            if (msg.reactions && Object.keys(msg.reactions).length) {
                const chips = Object.entries(msg.reactions).map(([emoji, usersArr]) => {
                    return `<span class="reaction-chip">${emoji} ${usersArr.length}</span>`;
                }).join('');
                reactionsHtml = `<div class="reaction-list">${chips}</div>`;
            }
            let reactionButtons = '';
            if (currentUser) {
                const emojiList = ['❤️', '🔥', '👍', '😂', '😮'];
                reactionButtons = `<div class="quick-emoji-set">${emojiList.map(e => `<button class="reaction-btn react-emoji" data-msgid="${msg.id}" data-emoji="${e}">${e}</button>`).join('')}</div>`;
            }
            msgDiv.innerHTML = `
                <div class="msg-header">
                    <span class="msg-username">${escapeHtml(msg.username)}</span>
                    <span class="msg-time">${timeStr}</span>
                </div>
                <div class="msg-text">${escapeHtml(msg.text)}</div>
                ${gifHtml}
                <div class="reaction-zone">
                    ${reactionButtons}
                    ${reactionsHtml}
                </div>
            `;
            container.appendChild(msgDiv);
        });
    }
    container.scrollTop = container.scrollHeight;
    // обработчики на реакциях
    document.querySelectorAll('.react-emoji').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const msgId = parseInt(btn.dataset.msgid);
            const emoji = btn.dataset.emoji;
            if (currentUser) toggleReaction(msgId, emoji, currentUser.login);
            else alert("Войдите, чтобы ставить реакции!");
        });
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Отправка сообщения
function addMessage(text, gifUrl = null) {
    if (!currentUser) { alert("Авторизуйтесь для отправки"); return false; }
    if ((!text || !text.trim()) && !gifUrl) return false;
    const newMsg = {
        id: Date.now(),
        username: currentUser.login,
        text: (text || "").trim(),
        gifUrl: gifUrl,
        timestamp: Date.now(),
        reactions: {}
    };
    messages.push(newMsg);
    saveMessages();
    renderMessages();
    return true;
}

// Регистрация / Логин
function registerUser(login, pass) {
    if (!login || !pass) { alert("Заполните логин и пароль"); return false; }
    if (users.find(u => u.login === login)) { alert("Пользователь уже существует"); return false; }
    users.push({ login, password: pass, id: Date.now() });
    saveUsers();
    alert("Регистрация успешна! Теперь войдите.");
    return true;
}
function loginUser(login, pass) {
    const user = users.find(u => u.login === login && u.password === pass);
    if (!user) { alert("Неверные данные"); return false; }
    currentUser = { login: user.login, id: user.id };
    saveCurrent();
    updateAuthUI();
    renderMessages();
    return true;
}
function logoutUser() {
    currentUser = null;
    saveCurrent();
    updateAuthUI();
    renderMessages();
}
function updateAuthUI() {
    const span = document.getElementById('currentUserSpan');
    const logoutBtn = document.getElementById('logoutBtn');
    const msgInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendMsgBtn');
    const gifBtn = document.getElementById('openGifBtn');
    if (currentUser) {
        span.innerText = currentUser.login;
        logoutBtn.style.display = 'inline-block';
        msgInput.disabled = false;
        sendBtn.disabled = false;
        gifBtn.disabled = false;
    } else {
        span.innerText = 'Гость';
        logoutBtn.style.display = 'none';
        msgInput.disabled = true;
        sendBtn.disabled = true;
        gifBtn.disabled = true;
    }
}

// GIPHY интеграция (публичный API ключ)
const GIPHY_KEY = 'pLUTzZ6SjLJXSwqEjE9ct0uY6hAIEZpK';
const gifPanelDiv = document.getElementById('giphyPanel');
const gifListDiv = document.getElementById('gifList');
document.getElementById('openGifBtn').addEventListener('click', () => {
    if (!currentUser) { alert("Войдите чтобы использовать GIF"); return; }
    if (gifPanelDiv.style.display === 'flex') gifPanelDiv.style.display = 'none';
    else { gifPanelDiv.style.display = 'flex'; document.getElementById('gifSearch').focus(); }
});
async function searchGiphy(term) {
    if (!term.trim()) { gifListDiv.innerHTML = ''; return; }
    try {
        const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(term)}&limit=15&rating=g`;
        const res = await fetch(url);
        const json = await res.json();
        gifListDiv.innerHTML = '';
        if (json.data && json.data.length) {
            json.data.forEach(gif => {
                const img = document.createElement('img');
                img.src = gif.images.fixed_height_small.url;
                img.className = 'gif-thumb';
                img.title = "Нажми, чтобы отправить";
                img.addEventListener('click', () => {
                    addMessage('', gif.images.fixed_height.url);
                    gifPanelDiv.style.display = 'none';
                    gifListDiv.innerHTML = '';
                    document.getElementById('gifSearch').value = '';
                });
                gifListDiv.appendChild(img);
            });
        } else {
            gifListDiv.innerHTML = '<span style="color:#ccc;">Гифки не найдены</span>';
        }
    } catch(e) { console.warn(e); gifListDiv.innerHTML = '<span>Ошибка загрузки гифок</span>'; }
}
document.getElementById('gifSearch').addEventListener('input', (e) => {
    const val = e.target.value;
    if (val.length > 2) searchGiphy(val);
    else if (val.length === 0) gifListDiv.innerHTML = '';
});
document.addEventListener('click', (ev) => {
    if (gifPanelDiv && !gifPanelDiv.contains(ev.target) && ev.target.id !== 'openGifBtn') {
        gifPanelDiv.style.display = 'none';
    }
});

// UI Кнопки
document.getElementById('registerBtn').addEventListener('click', () => {
    const l = document.getElementById('regLogin').value;
    const p = document.getElementById('regPass').value;
    registerUser(l, p);
});
document.getElementById('loginBtn').addEventListener('click', () => {
    const l = document.getElementById('regLogin').value;
    const p = document.getElementById('regPass').value;
    loginUser(l, p);
});
document.getElementById('logoutBtn').addEventListener('click', logoutUser);
document.getElementById('sendMsgBtn').addEventListener('click', () => {
    const txt = document.getElementById('messageInput').value;
    if (addMessage(txt)) document.getElementById('messageInput').value = '';
});
document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('sendMsgBtn').click();
});

// Демо-сообщение для примера (если пусто)
if (messages.length === 0) {
    messages.push({
        id: 9000,
        username: "DemoUser",
        text: "Ура! Таймер идёт ОТ 21.11.2025! Кидайте гифки и реакции :)",
        gifUrl: null,
        timestamp: Date.now() - 1800000,
        reactions: { "❤️": ["DemoUser"], "🔥": ["Admin"] }
    });
    saveMessages();
}
updateAuthUI();
renderMessages();