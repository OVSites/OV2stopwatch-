(function() {
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
        if (years) parts.push(years + " " + decl(years, 'год', 'года', 'лет'));
        if (months) parts.push(months + " " + decl(months, 'месяц', 'месяца', 'месяцев'));
        if (days) parts.push(days + " " + decl(days, 'день', 'дня', 'дней'));
        if (hours) parts.push(hours + " " + decl(hours, 'час', 'часа', 'часов'));
        if (minutes) parts.push(minutes + " " + decl(minutes, 'минута', 'минуты', 'минут'));
        if (seconds) parts.push(seconds + " " + decl(seconds, 'секунда', 'секунды', 'секунд'));
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

    window.loadChatData = async function() {
        try {
            const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
                headers: { 'X-Master-Key': API_KEY }
            });
            const data = await response.json();
            
            if (data.record) {
                messages = data.record.messages || [];
                users = data.record.users || [];
            }
            
            if (users.length === 0) {
                users = [
                    { login: 'admin', password: '123', id: Date.now() },
                    { login: 'test', password: 'test', id: Date.now() + 1 }
                ];
                await window.saveChatData();
            }
            
            window.renderMessages();
        } catch (error) {
            console.error('load error', error);
        }
    };

    window.saveChatData = async function() {
        try {
            await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': API_KEY
                },
                body: JSON.stringify({ messages: messages, users: users })
            });
        } catch (error) {
            console.error('save error', error);
        }
    };

    window.renderMessages = function() {
        const container = document.getElementById('messagesWindow');
        if (!container) return;
        const currentLogin = currentUser ? currentUser.login : null;
        container.innerHTML = '';
        
        if (messages.length === 0) {
            container.innerHTML = '<div class="message message-other"><div class="msg-header"><span class="msg-username">📢 Система</span></div><div>Нет сообщений. Напишите первым!</div></div>';
            return;
        }
        
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            const isOwn = currentLogin === msg.username;
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message ' + (isOwn ? 'message-own' : 'message-other');
            const time = new Date(msg.timestamp).toLocaleTimeString();
            let gifHtml = msg.gifUrl ? '<img src="' + msg.gifUrl + '" class="msg-gif" alt="gif" style="max-width:200px; border-radius:0.5rem; margin-top:0.3rem;">' : '';
            
            let reactionsHtml = '';
            if (msg.reactions && Object.keys(msg.reactions).length) {
                let reactionText = '';
                const reactionEntries = Object.entries(msg.reactions);
                for (let j = 0; j < reactionEntries.length; j++) {
                    reactionText += '<span class="reaction-chip">' + reactionEntries[j][0] + ' ' + reactionEntries[j][1].length + '</span>';
                }
                reactionsHtml = '<div class="reaction-list">' + reactionText + '</div>';
            }
            
            let reactionBtns = '';
            if (currentUser) {
                const emojis = ['❤️', '🔥', '👍', '😂', '😮'];
                let btnsHtml = '';
                for (let j = 0; j < emojis.length; j++) {
                    btnsHtml += '<button class="reaction-btn" data-msgid="' + msg.id + '" data-emoji="' + emojis[j] + '">' + emojis[j] + '</button>';
                }
                reactionBtns = '<div class="reaction-zone">' + btnsHtml + '</div>';
            }
            
            msgDiv.innerHTML = `
                <div class="msg-header">
                    <span class="msg-username">${window.escapeHtml(msg.username)}</span>
                    <span class="msg-time">${time}</span>
                </div>
                <div class="msg-text">${window.escapeHtml(msg.text)}</div>
                ${gifHtml}
                ${reactionBtns}
                ${reactionsHtml}
            `;
            container.appendChild(msgDiv);
        }
        
        container.scrollTop = container.scrollHeight;
        
        const reactionButtons = document.querySelectorAll('.reaction-btn');
        for (let i = 0; i < reactionButtons.length; i++) {
            reactionButtons[i].removeEventListener('click', window.reactionHandler);
            reactionButtons[i].addEventListener('click', window.reactionHandler);
        }
    };

    window.reactionHandler = function(e) {
        const msgId = parseInt(e.target.getAttribute('data-msgid'));
        const emoji = e.target.getAttribute('data-emoji');
        if (!currentUser) return alert("Войдите для реакций");
        window.toggleReaction(msgId, emoji, currentUser.login);
    };

    window.toggleReaction = function(msgId, emoji, username) {
        let msg = null;
        for (let i = 0; i < messages.length; i++) {
            if (messages[i].id === msgId) {
                msg = messages[i];
                break;
            }
        }
        if (!msg) return;
        if (!msg.reactions) msg.reactions = {};
        if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
        let idx = -1;
        for (let i = 0; i < msg.reactions[emoji].length; i++) {
            if (msg.reactions[emoji][i] === username) {
                idx = i;
                break;
            }
        }
        if (idx === -1) {
            msg.reactions[emoji].push(username);
        } else {
            msg.reactions[emoji].splice(idx, 1);
            if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
        }
        window.saveChatData();
        window.renderMessages();
    };

    window.escapeHtml = function(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    };

    window.addNewMessage = async function(text, gifUrl) {
        if (!currentUser) return alert("Войдите в аккаунт");
        if (!text.trim() && !gifUrl) return;
        const newMsg = {
            id: Date.now(),
            username: currentUser.login,
            text: text.trim() || '',
            gifUrl: gifUrl || null,
            timestamp: Date.now(),
            reactions: {}
        };
        messages.push(newMsg);
        await window.saveChatData();
        await window.loadChatData();
    };

    window.registerNewUser = async function(userLogin, userPass) {
        if (!userLogin || !userPass) return alert("Введите логин и пароль");
        let exists = false;
        for (let i = 0; i < users.length; i++) {
            if (users[i].login === userLogin) {
                exists = true;
                break;
            }
        }
        if (exists) return alert("Логин занят");
        users.push({ login: userLogin, password: userPass, id: Date.now() });
        await window.saveChatData();
        alert("Регистрация успешна! Теперь войдите.");
    };

    window.loginToChat = async function(userLogin, userPass) {
        let foundUser = null;
        for (let i = 0; i < users.length; i++) {
            if (users[i].login === userLogin && users[i].password === userPass) {
                foundUser = users[i];
                break;
            }
        }
        if (!foundUser) {
            alert("Неверный логин или пароль");
            return;
        }
        currentUser = { login: foundUser.login, id: foundUser.id };
        window.updateAuthInterface();
        await window.loadChatData();
        window.renderMessages();
        alert("Добро пожаловать, " + userLogin + "!");
    };

    window.logoutFromChat = function() {
        currentUser = null;
        window.updateAuthInterface();
        window.renderMessages();
    };

    window.updateAuthInterface = function() {
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
    };

    const gifPanel = document.getElementById('giphyPanel');
    const gifSearchInput = document.getElementById('gifSearch');
    const gifListDiv = document.getElementById('gifList');
    const openGifBtn = document.getElementById('openGifBtn');

    const WORKING_GIFS = [
        'https://media.tenor.com/8xQn5qKjL0YAAAAi/shrek-dance.gif',
        'https://media.tenor.com/P9nQnL0Kj8YAAAAi/spongebob-laugh.gif',
        'https://media.tenor.com/mCiM7CmGGI4AAAAi/naruto-run.gif',
        'https://media.tenor.com/5o7hN6qKvL0AAAAi/peach-cat.gif',
        'https://media.tenor.com/Jk7TjGqXqEoAAAAi/dancing-banana.gif',
        'https://media.tenor.com/-I9TzQqJk5oAAAAi/cat-cat-stare.gif',
        'https://media.tenor.com/F7nLh6N0VXsAAAAi/dog-dog-stare.gif',
        'https://media.tenor.com/3oK6v1Z9Qk8AAAAi/party-parrot.gif',
        'https://media.tenor.com/vN8jJ5qJ8L0AAAAi/cat-dance.gif',
        'https://media.tenor.com/2xQnKjL0N8YAAAAi/pikachu-surf.gif'
    ];

    function showAllGifs() {
        if (!gifListDiv) return;
        gifListDiv.innerHTML = '';
        
        const gifsRow = document.createElement('div');
        gifsRow.style.display = 'flex';
        gifsRow.style.flexWrap = 'wrap';
        gifsRow.style.gap = '8px';
        gifsRow.style.justifyContent = 'center';
        
        for (let i = 0; i < WORKING_GIFS.length; i++) {
            const img = document.createElement('img');
            img.src = WORKING_GIFS[i];
            img.className = 'gif-thumb';
            img.style.width = '80px';
            img.style.height = '80px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '12px';
            img.style.cursor = 'pointer';
            img.style.border = '2px solid transparent';
            img.onmouseover = function() { this.style.border = '2px solid #f1c40f'; };
            img.onmouseout = function() { this.style.border = '2px solid transparent'; };
            img.onclick = async function() {
                await window.addNewMessage('', WORKING_GIFS[i]);
                if (gifPanel) gifPanel.style.display = 'none';
                if (gifSearchInput) gifSearchInput.value = '';
            };
            gifsRow.appendChild(img);
        }
        gifListDiv.appendChild(gifsRow);
    }

    function searchGifs(searchTerm) {
        if (!gifListDiv) return;
        if (!searchTerm.trim()) {
            showAllGifs();
            return;
        }
        
        const term = searchTerm.toLowerCase();
        const matchedGifs = [];
        
        for (let i = 0; i < WORKING_GIFS.length; i++) {
            matchedGifs.push(WORKING_GIFS[i]);
        }
        
        gifListDiv.innerHTML = '';
        
        if (matchedGifs.length === 0) {
            gifListDiv.innerHTML = '<div style="width:100%; text-align:center; padding:20px; color:#ccc;">😔 Гифки не найдены</div>';
            return;
        }
        
        const searchTitle = document.createElement('div');
        searchTitle.innerText = '🔍 Результаты поиска: ' + searchTerm;
        searchTitle.style.width = '100%';
        searchTitle.style.fontSize = '12px';
        searchTitle.style.marginBottom = '10px';
        searchTitle.style.color = '#f1c40f';
        searchTitle.style.textAlign = 'center';
        gifListDiv.appendChild(searchTitle);
        
        const gifsRow = document.createElement('div');
        gifsRow.style.display = 'flex';
        gifsRow.style.flexWrap = 'wrap';
        gifsRow.style.gap = '8px';
        gifsRow.style.justifyContent = 'center';
        
        for (let i = 0; i < matchedGifs.length; i++) {
            const img = document.createElement('img');
            img.src = matchedGifs[i];
            img.className = 'gif-thumb';
            img.style.width = '80px';
            img.style.height = '80px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '12px';
            img.style.cursor = 'pointer';
            img.style.border = '2px solid transparent';
            img.onmouseover = function() { this.style.border = '2px solid #f1c40f'; };
            img.onmouseout = function() { this.style.border = '2px solid transparent'; };
            img.onclick = async function() {
                await window.addNewMessage('', matchedGifs[i]);
                if (gifPanel) gifPanel.style.display = 'none';
                if (gifSearchInput) gifSearchInput.value = '';
            };
            gifsRow.appendChild(img);
        }
        gifListDiv.appendChild(gifsRow);
    }

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
                if (gifSearchInput) {
                    gifSearchInput.value = '';
                    gifSearchInput.focus();
                }
                showAllGifs();
            }
        };
    }

    if (gifSearchInput) {
        gifSearchInput.oninput = function(e) {
            const val = e.target.value;
            searchGifs(val);
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
            const inputLogin = document.getElementById('regLogin').value;
            const inputPass = document.getElementById('regPass').value;
            await window.registerNewUser(inputLogin, inputPass);
        };
    }
    if (loginBtn) {
        loginBtn.onclick = async function() {
            const inputLogin = document.getElementById('regLogin').value;
            const inputPass = document.getElementById('regPass').value;
            await window.loginToChat(inputLogin, inputPass);
        };
    }
    if (logoutBtnElem) {
        logoutBtnElem.onclick = window.logoutFromChat;
    }
    if (sendMsgBtn) {
        sendMsgBtn.onclick = async function() {
            const text = messageInput ? messageInput.value : '';
            if (text.trim()) {
                await window.addNewMessage(text, null);
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

    window.loadChatData();
    window.updateAuthInterface();

    setInterval(async function() {
        await window.loadChatData();
    }, 2000);
})();