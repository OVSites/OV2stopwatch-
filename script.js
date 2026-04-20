const onevisionCloseDate = new Date(2025, 10, 21, 0, 45, 0);

function decl(n, one, two, five) {
    n = Math.abs(n) % 100;
    if (n > 10 && n < 20) return five;
    const last = n % 10;
    if (last === 1) return one;
    if (last >= 2 && last <= 4) return two;
    return five;
}

function formatElapsed(ms) {
    if (ms < 0) return "OneVision ещё работает";
    const sec = Math.floor(ms / 1000);
    const years = Math.floor(sec / 31536000);
    let rem = sec % 31536000;
    const months = Math.floor(rem / 2592000);
    rem %= 2592000;
    const days = Math.floor(rem / 86400);
    rem %= 86400;
    const hours = Math.floor(rem / 3600);
    rem %= 3600;
    const minutes = Math.floor(rem / 60);
    const seconds = rem % 60;
    
    const parts = [];
    if (years) parts.push(`${years} ${decl(years, 'год', 'года', 'лет')}`);
    if (months) parts.push(`${months} ${decl(months, 'месяц', 'месяца', 'месяцев')}`);
    if (days) parts.push(`${days} ${decl(days, 'день', 'дня', 'дней')}`);
    if (hours) parts.push(`${hours} ${decl(hours, 'час', 'часа', 'часов')}`);
    if (minutes) parts.push(`${minutes} ${decl(minutes, 'минута', 'минуты', 'минут')}`);
    if (seconds) parts.push(`${seconds} ${decl(seconds, 'секунда', 'секунды', 'секунд')}`);
    return parts.join(', ');
}

function updateTimer() {
    const diff = Date.now() - onevisionCloseDate;
    document.getElementById('timerDisplay').innerText = diff < 0 ? "Ожидание закрытия..." : formatElapsed(diff);
}
updateTimer();
setInterval(updateTimer, 1000);

const BIN_ID = '69e61bdeaaba8821971b203d';
const API_KEY = '$2a$10$VXRfl1YZWDHDQEao2g50KuIPQmowJDgPCVjr3lGgywZeUNOb9T4VC';

let currentUser = null;
let messages = [];
let users = [];

async function loadData() {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: { 'X-Master-Key': API_KEY }
        });
        const data = await response.json();
        if (data.record) {
            messages = data.record.messages || [];
            users = data.record.users || [];
        } else {
            messages = [];
            users = [];
        }
        renderMessages();
    } catch (error) {
        console.error('load error', error);
        messages = [];
        users = [];
        renderMessages();
    }
}

async function saveData() {
    try {
        await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify({ messages, users })
        });
    } catch (error) {
        console.error('save error', error);
    }
}

function renderMessages() {
    const container = document.getElementById('messagesWindow');
    if (!container) return;
    const login = currentUser?.login;
    container.innerHTML = '';
    
    if (messages.length === 0) {
        container.innerHTML = '<div class="message message-other"><div class="msg-header"><span class="msg-username">📢 Система</span></div><div>Нет сообщений. Напишите первым!</div></div>';
        return;
    }
    
    const sortedMessages = [...messages].reverse();
    
    sortedMessages.forEach(msg => {
        const isOwn = login === msg.username;
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${isOwn ? 'message-own' : 'message-other'}`;
        const time = new Date(msg.timestamp).toLocaleTimeString();
        let gifHtml = msg.gifUrl ? `<img src="${msg.gifUrl}" class="msg-gif" alt="gif">` : '';
        
        let reactionsHtml = '';
        if (msg.reactions && Object.keys(msg.reactions).length) {
            reactionsHtml = `<div class="reaction-list">${Object.entries(msg.reactions).map(([emoji, usersArr]) => 
                `<span class="reaction-chip">${emoji} ${usersArr.length}</span>`
            ).join('')}</div>`;
        }
        
        let reactionBtns = '';
        if (currentUser) {
            const emojis = ['❤️', '🔥', '👍', '😂', '😮'];
            reactionBtns = `<div class="reaction-zone">${emojis.map(e => 
                `<button class="reaction-btn" data-msgid="${msg.id}" data-emoji="${e}">${e}</button>`
            ).join('')}</div>`;
        }
        
        msgDiv.innerHTML = `
            <div class="msg-header">
                <span class="msg-username">${escapeHtml(msg.username)}</span>
                <span class="msg-time">${time}</span>
            </div>
            <div class="msg-text">${escapeHtml(msg.text)}</div>
            ${gifHtml}
            ${reactionBtns}
            ${reactionsHtml}
        `;
        container.appendChild(msgDiv);
    });
    
    container.scrollTop = container.scrollHeight;
    
    document.querySelectorAll('.reaction-btn').forEach(btn => {
        btn.removeEventListener('click', reactionHandler);
        btn.addEventListener('click', reactionHandler);
    });
}

function reactionHandler(e) {
    const msgId = parseInt(e.target.dataset.msgid);
    const emoji = e.target.dataset.emoji;
    if (!currentUser) return alert("Войдите для реакций");
    toggleReaction(msgId, emoji, currentUser.login);
}

function toggleReaction(msgId, emoji, username) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    if (!msg.reactions) msg.reactions = {};
    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
    const idx = msg.reactions[emoji].indexOf(username);
    if (idx === -1) {
        msg.reactions[emoji].push(username);
    } else {
        msg.reactions[emoji].splice(idx, 1);
        if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
    }
    saveData();
    renderMessages();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
}

async function addMessage(text, gifUrl = null) {
    if (!currentUser) return alert("Войдите в аккаунт");
    if (!text.trim() && !gifUrl) return;
    const newMsg = {
        id: Date.now(),
        username: currentUser.login,
        text: text.trim() || '',
        gifUrl: gifUrl,
        timestamp: Date.now(),
        reactions: {}
    };
    messages.push(newMsg);
    await saveData();
    await loadData();
}

async function register(login, pass) {
    if (!login || !pass) return alert("Введите логин и пароль");
    if (users.find(u => u.login === login)) return alert("Логин занят");
    users.push({ login, password: pass, id: Date.now() });
    await saveData();
    alert("Регистрация успешна! Теперь войдите.");
}

async function login(login, pass) {
    const user = users.find(u => u.login === login && u.password === pass);
    if (!user) return alert("Неверный логин или пароль");
    currentUser = { login: user.login, id: user.id };
    updateAuthUI();
    await loadData();
    renderMessages();
}

function logout() {
    currentUser = null;
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

const GIPHY_KEY = 'pLUTzZ6SjLJXSwqEjE9ct0uY6hAIEZpK';
const gifPanel = document.getElementById('giphyPanel');
const gifSearchInput = document.getElementById('gifSearch');
const gifListDiv = document.getElementById('gifList');
const openGifBtn = document.getElementById('openGifBtn');

if (openGifBtn) {
    openGifBtn.onclick = function(e) {
        e.stopPropagation();
        if (!currentUser) {
            alert("Войдите для отправки GIF");
            return;
        }
        if (gifPanel.style.display === 'flex') {
            gifPanel.style.display = 'none';
        } else {
            gifPanel.style.display = 'flex';
            if (gifSearchInput) gifSearchInput.focus();
        }
    };
}

async function searchGiphy(query) {
    if (!query.trim()) {
        if (gifListDiv) gifListDiv.innerHTML = '';
        return;
    }
    try {
        const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=12&rating=g`);
        const json = await res.json();
        if (gifListDiv) {
            gifListDiv.innerHTML = '';
            if (json.data && json.data.length) {
                json.data.forEach(gif => {
                    const img = document.createElement('img');
                    img.src = gif.images.fixed_height_small.url;
                    img.className = 'gif-thumb';
                    img.style.cursor = 'pointer';
                    img.onclick = async function() {
                        await addMessage('', gif.images.fixed_height.url);
                        if (gifPanel) gifPanel.style.display = 'none';
                        if (gifListDiv) gifListDiv.innerHTML = '';
                        if (gifSearchInput) gifSearchInput.value = '';
                    };
                    gifListDiv.appendChild(img);
                });
            } else {
                gifListDiv.innerHTML = '<span style="color:#ccc;">Гифки не найдены</span>';
            }
        }
    } catch(e) {
        console.error('Giphy error:', e);
        if (gifListDiv) gifListDiv.innerHTML = '<span style="color:#ccc;">Ошибка загрузки гифок</span>';
    }
}

if (gifSearchInput) {
    gifSearchInput.oninput = function(e) {
        const val = e.target.value;
        if (val.length > 2) {
            searchGiphy(val);
        } else if (val.length === 0) {
            if (gifListDiv) gifListDiv.innerHTML = '';
        }
    };
}

document.addEventListener('click', function(ev) {
    if (gifPanel && gifPanel.style.display === 'flex') {
        if (!gifPanel.contains(ev.target) && ev.target !== openGifBtn) {
            gifPanel.style.display = 'none';
        }
    }
});

const registerBtn = document.getElementById('registerBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtnElem = document.getElementById('logoutBtn');
const sendMsgBtn = document.getElementById('sendMsgBtn');
const messageInput = document.getElementById('messageInput');

if (registerBtn) {
    registerBtn.onclick = async function() {
        const login = document.getElementById('regLogin').value;
        const pass = document.getElementById('regPass').value;
        await register(login, pass);
    };
}
if (loginBtn) {
    loginBtn.onclick = async function() {
        const login = document.getElementById('regLogin').value;
        const pass = document.getElementById('regPass').value;
        await login(login, pass);
    };
}
if (logoutBtnElem) {
    logoutBtnElem.onclick = logout;
}
if (sendMsgBtn) {
    sendMsgBtn.onclick = async function() {
        const text = messageInput ? messageInput.value : '';
        if (text.trim()) {
            await addMessage(text);
            if (messageInput) messageInput.value = '';
        }
    };
}
if (messageInput) {
    messageInput.onkeypress = function(e) {
        if (e.key === 'Enter') {
            if (sendMsgBtn) sendMsgBtn.click();
        }
    };
}

loadData();
updateAuthUI();

setInterval(async function() {
    await loadData();
}, 2000);