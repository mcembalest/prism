// Terminal setup
const term = new Terminal({
  cursorBlink: true,
  fontSize: 14,
  fontFamily: 'Courier New, monospace',
  theme: { background: '#1e1e1e', foreground: '#d4d4d4' },
  scrollback: 1000,
  convertEol: false,
  disableStdin: false,
  cursorStyle: 'block'
});
const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);
term.open(document.getElementById('terminal'));
setTimeout(() => fitAddon.fit(), 100);

const ws = new WebSocket('ws://' + window.location.host);
const chatMessages = document.getElementById('chat-messages');
let resizeTimeout;

function sendResize() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
      const size = { cols: term.cols, rows: term.rows };
      if (size.cols > 10 && size.rows > 5) {
        ws.send(JSON.stringify({ type: 'resize', ...size }));
      }
    }
  }, 100);
}

function parseMessage(content) {
  // Multiple choice question format
  const questionMatch = content.match(/^(\[(?:QUESTION|REVIEW).*?\])\n\n(.+?)\n\n((\d+\..+?\n)+)/s);
  if (questionMatch) {
    const prefix = questionMatch[1];
    const question = questionMatch[2];
    const optionsText = questionMatch[3];
    const options = optionsText.trim().split('\n').filter(o => o.trim());
    return `
      <div class="question-container">
        <div class="question-title">${prefix}</div>
        <div>${question}</div>
        <div class="question-options">
          ${options.map(opt => {
            const m = opt.match(/^(\d+)\. (.+)$/);
            return m ? `<div class="question-option" onclick="sendAnswer('${m[1]}')"><span class="option-number">${m[1]}</span><span>${m[2]}</span></div>` : ''
          }).join('')}
        </div>
        <div style="margin-top: 10px; color: #999; font-size: 13px;">Click an option or type its number in the terminal</div>
      </div>
    `;
  }
  // Prediction question
  const predictionMatch = content.match(/^(\[PREDICTION\])\n\n(.+?)\n\n(.+?)\n\n((\d+\..+?\n)+)/s);
  if (predictionMatch) {
    const prefix = predictionMatch[1];
    const command = predictionMatch[2];
    const question = predictionMatch[3];
    const optionsText = predictionMatch[4];
    const options = optionsText.trim().split('\n').filter(o => o.trim());
    return `
      <div class="question-container">
        <div class="question-title">${prefix}</div>
        <div style="background: #2d2d2d; padding: 8px; border-radius: 4px; margin: 10px 0; font-family: monospace;">${command}</div>
        <div>${question}</div>
        <div class="question-options">
          ${options.map(opt => {
            const m = opt.match(/^(\d+)\. (.+)$/);
            return m ? `<div class="question-option" onclick="sendAnswer('${m[1]}')"><span class="option-number">${m[1]}</span><span>${m[2]}</span></div>` : ''
          }).join('')}
        </div>
        <div style="margin-top: 10px; color: #999; font-size: 13px;">Click an option or type its number in the terminal</div>
      </div>
    `;
  }
  return content;
}

window.sendAnswer = function(answer) {
  const chatInput = document.getElementById('chat-input');
  chatInput.value = answer;
  chatInput.focus();
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'chat-message', message: answer }));
    chatInput.value = '';
  }
}

function addMessage(content, type = 'tutor') {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message ' + (type === 'success' ? 'success' : '');
  const icon = type === 'success' ? '[OK]' : '[TUTOR]';
  const parsedContent = parseMessage(content);
  messageDiv.innerHTML = `
    <div class="message-header"><span class="message-icon">${icon}</span><span class="message-sender">Prism Tutor</span></div>
    <div class="message-content">${parsedContent}</div>
  `;
  chatMessages.appendChild(messageDiv);
  
  // Auto-scroll to bottom with smooth behavior
  setTimeout(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 0);
}

function updateProgress(data) {
  if (data.topic) document.getElementById('current-topic').textContent = data.topic;
  if (data.exerciseIndex !== undefined && data.totalExercises !== undefined) {
    const completed = data.exerciseIndex;
    const total = data.totalExercises;
    const exerciseStates = data.exerciseStates || [];
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const percentage = total > 0 ? completed / total : 0;
    const offset = circumference - (percentage * circumference);
    const radialFill = document.getElementById('radial-progress-fill');
    const radialText = document.getElementById('radial-progress-text');
    radialFill.style.strokeDashoffset = offset.toString();
    radialText.textContent = `${completed}/${total}`;
    const orangeColor = { r: 255, g: 140, b: 66 };
    const greenColor = { r: 78, g: 201, b: 176 };
    const r = Math.round(orangeColor.r + (greenColor.r - orangeColor.r) * percentage);
    const g = Math.round(orangeColor.g + (greenColor.g - orangeColor.g) * percentage);
    const b = Math.round(orangeColor.b + (greenColor.b - orangeColor.b) * percentage);
    radialFill.style.stroke = `rgb(${r}, ${g}, ${b})`;
    const circlesMini = document.getElementById('progress-circles-mini');
    const circlesFull = document.getElementById('progress-circles-full');
    [circlesMini, circlesFull].forEach(container => {
      if (container.children.length !== total) {
        container.innerHTML = '';
        for (let i = 0; i < total; i++) {
          const circle = document.createElement('div');
          circle.className = 'progress-circle';
          container.appendChild(circle);
        }
      }
      const circles = container.children;
      for (let i = 0; i < circles.length; i++) {
        circles[i].className = 'progress-circle';
        if (exerciseStates[i] === 'completed') circles[i].classList.add('completed');
        else if (exerciseStates[i] === 'current') circles[i].classList.add('current');
        else if (exerciseStates[i] === 'skipped') circles[i].classList.add('skipped');
      }
    });
  }
  if (data.currentExercise) document.getElementById('current-exercise').textContent = data.currentExercise;
}

ws.onopen = () => {
  setTimeout(() => { fitAddon.fit(); setTimeout(sendResize, 50); }, 200);
};

ws.onmessage = (event) => {
  const handleText = (text) => {
    try {
      const data = JSON.parse(text);
      if (data && typeof data === 'object' && 'type' in data) {
        if (data.type === 'tutor-message') { addMessage(data.message, data.messageType || 'tutor'); return; }
        if (data.type === 'progress-update') { updateProgress(data); return; }
      }
      term.write(text);
    } catch {
      term.write(text);
    }
  };

  if (typeof event.data === 'string') handleText(event.data);
  else if (event.data instanceof Blob) event.data.text().then(handleText).catch(() => {});
  else if (event.data instanceof ArrayBuffer) handleText(new TextDecoder().decode(event.data));
  else { try { handleText(String(event.data)); } catch {} }
};

ws.onerror = (error) => { console.error('WebSocket error:', error); };

term.onData((data) => { ws.send(data); });

window.addEventListener('resize', () => { fitAddon.fit(); sendResize(); });

// Divider drag functionality
const divider = document.getElementById('divider');
const terminalPanel = document.getElementById('terminal-panel');
const rightPanel = document.getElementById('right-panel');
const mainContainer = document.getElementById('main-container');
let isDragging = false;
divider.addEventListener('mousedown', (e) => { isDragging = true; e.preventDefault(); });
document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const containerRect = mainContainer.getBoundingClientRect();
  const newTerminalWidth = e.clientX - containerRect.left;
  const dividerWidth = 4;
  const newRightWidth = containerRect.width - newTerminalWidth - dividerWidth;
  const minTerminalWidth = 300;
  const minRightWidth = 350;
  if (newTerminalWidth >= minTerminalWidth && newRightWidth >= minRightWidth) {
    terminalPanel.style.width = newTerminalWidth + 'px';
    rightPanel.style.width = newRightWidth + 'px';
    setTimeout(() => { fitAddon.fit(); sendResize(); }, 0);
  }
});
document.addEventListener('mouseup', () => { if (isDragging) isDragging = false; });

// Buttons
document.getElementById('hint-button').addEventListener('click', () => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'hint-request' }));
});
document.getElementById('skip-button').addEventListener('click', () => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'skip-request' }));
});

// Chat
const chatInput = document.getElementById('chat-input');
const chatSendButton = document.getElementById('chat-send-button');
function sendChatMessage() {
  const message = chatInput.value.trim();
  if (!message) return;
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'chat-message', message }));
  chatInput.value = '';
}
chatSendButton.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendChatMessage(); } });
chatInput.focus();

