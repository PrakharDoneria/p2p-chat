let peer;
let connection = null;
const myIdElement = document.getElementById('my-id');
const statusElement = document.getElementById('status');
const connectBtn = document.getElementById('connect-btn');
const partnerIdInput = document.getElementById('partner-id-input');
const chatArea = document.getElementById('chat-area');
const chatLog = document.getElementById('chat-log');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const connMessage = document.getElementById('conn-message');
const apiKey = "";

function showAlert(title, message, isError = true) {
    document.getElementById('alert-title').textContent = title;
    document.getElementById('alert-body').textContent = message;
    document.getElementById('alert-title').classList.toggle('text-red-600', isError);
    document.getElementById('alert-title').classList.toggle('text-green-600', !isError);
    document.getElementById('alert-modal').classList.remove('hidden');
    document.getElementById('alert-modal').classList.add('flex');
}

function closeAlert() {
    document.getElementById('alert-modal').classList.remove('flex');
    document.getElementById('alert-modal').classList.add('hidden');
}

function copyMyId() {
    const id = myIdElement.textContent;
    if (id === 'Loading...') {
        showAlert('Wait', 'Please wait for your Peer ID to be generated first.', false);
        return;
    }
    try {
        const tempInput = document.createElement('textarea');
        tempInput.value = id;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        showAlert('Copied!', 'Your ID has been copied to the clipboard. Share it with your partner!', false);
    } catch (err) {
        showAlert('Copy Failed', 'Could not copy ID. Please select and copy manually.', true);
    }
}

function updateUI(state, message = '') {
    statusElement.textContent = message;
    statusElement.classList.remove('text-red-700', 'text-yellow-700', 'text-green-700', 'text-indigo-700');
    connMessage.textContent = '';
    
    if (state === 'disconnected') {
        statusElement.textContent = 'Status: Disconnected';
        statusElement.classList.add('text-red-700');
        connectBtn.disabled = false;
        partnerIdInput.disabled = false;
        chatArea.classList.add('hidden');
        messageInput.disabled = true;
        sendBtn.disabled = true;
    } else if (state === 'connecting') {
        statusElement.textContent = `Status: Connecting to ${message}...`;
        statusElement.classList.add('text-yellow-700');
        connectBtn.disabled = true;
        partnerIdInput.disabled = true;
    } else if (state === 'connected') {
        statusElement.textContent = `Status: Connected with ${message}!`;
        statusElement.classList.add('text-green-700');
        connectBtn.disabled = true;
        partnerIdInput.disabled = true;
        chatArea.classList.remove('hidden');
        messageInput.disabled = false;
        sendBtn.disabled = false;
        messageInput.focus();
    } else if (state === 'id_ready') {
        statusElement.textContent = 'Status: Ready to connect';
        statusElement.classList.add('text-indigo-700');
        connectBtn.disabled = false;
    }
}

function addMessage(message, isMine) {
    const messageEl = document.createElement('div');
    messageEl.textContent = message;
    messageEl.className = `message-box ${isMine ? 'my-message self-end' : 'partner-message self-start'}`;
    chatLog.appendChild(messageEl);
    chatLog.scrollTop = chatLog.scrollHeight;
}

function initializePeer() {
    try {
        peer = new Peer({});
    } catch (error) {
        console.error("PeerJS Initialization Error:", error);
        showAlert('Initialization Failed', 'Could not initialize P2P engine. Check your internet connection.', true);
        updateUI('disconnected');
        return;
    }

    peer.on('open', (id) => {
        myIdElement.textContent = id;
        updateUI('id_ready');
        console.log('My Peer ID is: ' + id);
    });

    peer.on('error', (err) => {
        console.error('Peer Error:', err.type, err);
        if (err.type === 'peer-unavailable') {
            connMessage.textContent = 'Error: Partner ID not found or unreachable.';
        } else {
            showAlert('Peer Error', `An error occurred: ${err.type}. See console for details.`, true);
        }
        updateUI('disconnected');
    });

    peer.on('connection', (conn) => {
        handleConnection(conn, true);
    });
    
    peer.on('close', () => {
        updateUI('disconnected');
    });
}

function connectToPartner() {
    const partnerId = partnerIdInput.value.trim();
    if (!partnerId || partnerId === peer.id) {
        connMessage.textContent = 'Please enter a valid, different Peer ID.';
        return;
    }

    chatLog.innerHTML = '<div class="text-center text-sm text-gray-400 p-4">Attempting to connect...</div>';

    updateUI('connecting', partnerId);

    try {
        const conn = peer.connect(partnerId, {
            reliable: true
        });
        handleConnection(conn, false);

    } catch (error) {
        console.error("Connection initiation failed:", error);
        connMessage.textContent = 'Failed to initiate connection. Check ID and try again.';
        updateUI('disconnected');
    }
}

function handleConnection(conn, isReceiver) {
    if (connection && connection.open) {
        console.log("Closing existing connection to accept new one.");
        connection.close();
    }
    connection = conn;

    connection.on('open', () => {
        console.log(`Connection established with: ${connection.peer}`);
        chatLog.innerHTML = '';
        updateUI('connected', connection.peer);
        showAlert('Connection Successful!', `You are now chatting with ${connection.peer}.`, false);
        addMessage(`You are connected to ${connection.peer}.`, false);
    });

    connection.on('data', (data) => {
        if (typeof data === 'string') {
            addMessage(data, false);
        }
    });

    connection.on('close', () => {
        console.log('Connection closed.');
        connection = null;
        updateUI('disconnected');
        showAlert('Connection Lost', 'Your partner has disconnected.', true);
    });

    connection.on('error', (err) => {
        console.error('Connection Error:', err);
        connection = null;
        updateUI('disconnected');
        showAlert('Network Error', 'Connection failed or dropped. Try connecting again.', true);
    });

    if (isReceiver) {
        partnerIdInput.value = connection.peer;
    }
}

function sendMessage() {
    const msg = messageInput.value.trim();
    if (!msg || !connection || !connection.open) {
        return;
    }

    try {
        connection.send(msg);
        addMessage(msg, true);
        messageInput.value = '';
    } catch (error) {
        console.error("Failed to send message:", error);
        showAlert('Send Failed', 'Could not send message. Connection may be closed.', true);
    }
}

function handleKey(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
}

window.onload = initializePeer;
window.copyMyId = copyMyId;
window.connectToPartner = connectToPartner;
window.sendMessage = sendMessage;
window.handleKey = handleKey;
window.closeAlert = closeAlert;