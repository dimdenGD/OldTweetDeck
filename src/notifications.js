function createModal(html, className, onclose, canclose) {
    let modal = document.createElement('div');
    modal.classList.add('otd-modal');
    let modal_content = document.createElement('div');
    modal_content.classList.add('otd-modal-content');
    if(className) modal_content.classList.add(className);
    modal_content.innerHTML = html;
    modal.appendChild(modal_content);
    let close = document.createElement('span');
    close.classList.add('otd-modal-close');
    close.title = "ESC";
    close.innerHTML = '&times;';
    document.body.style.overflowY = 'hidden';
    function removeModal() {
        modal.remove();
        let event = new Event('findActiveTweet');
        document.dispatchEvent(event);
        document.removeEventListener('keydown', escapeEvent);
        if(onclose) onclose();
        let modals = document.getElementsByClassName('modal');
        if(modals.length === 0) {
            document.body.style.overflowY = 'auto';
        }
    }
    modal.removeModal = removeModal;
    function escapeEvent(e) {
        if(e.key === 'Escape' || (e.altKey && e.keyCode === 78)) {
            if(!canclose || canclose()) removeModal();
        }
    }
    close.addEventListener('click', removeModal);
    modal.addEventListener('click', e => {
        if(e.target === modal) {
            if(!canclose || canclose()) removeModal();
        }
    });
    document.addEventListener('keydown', escapeEvent);
    modal_content.appendChild(close);
    document.body.appendChild(modal);
    return modal;
}

async function getNotifications() {
    let notifs = await fetch('https://oldtd.org/notifications.json?t='+Date.now()).then(r => r.json());
    let readNotifs = localStorage.getItem('readNotifications') ? JSON.parse(localStorage.getItem('readNotifications')) : [];
    let notifsToDisplay = notifs.filter(notif => !readNotifs.includes(notif.id));

    return notifsToDisplay;
}
function maxVersionCheck(ver, maxVer) {
    let verArr = ver.split('.');
    let maxVerArr = maxVer.split('.');
    for(let i = 0; i < verArr.length; i++) {
        if(parseInt(verArr[i]) > parseInt(maxVerArr[i])) return false;
        if(parseInt(verArr[i]) < parseInt(maxVerArr[i])) return true;
    }
    return true;
}
function minVersionCheck(ver, minVer) {
    let verArr = ver.split('.');
    let minVerArr = minVer.split('.');
    for(let i = 0; i < verArr.length; i++) {
        if(parseInt(verArr[i]) < parseInt(minVerArr[i])) return false;
        if(parseInt(verArr[i]) > parseInt(minVerArr[i])) return true;
    }
    return true;
}

async function showNotifications() {
    let notifsToDisplay = await getNotifications();
    if(notifsToDisplay.length === 0) return;
    let manifest = await fetch(chrome.runtime.getURL('/manifest.json')).then(r => r.json());
    let currentVersion = manifest.version;
   
    for(let notif of notifsToDisplay) {
        if(!localStorage.OTDnotifsReadOnce && notif.ignoreOnInstall) {
            let readNotifs = localStorage.getItem('readNotifications') ? JSON.parse(localStorage.getItem('readNotifications')) : [];
            if(readNotifs.includes(notif.id)) continue;
            readNotifs.push(notif.id);
            localStorage.setItem('readNotifications', JSON.stringify(readNotifs));
            continue;
        }
        if(notif.maxVersion && !maxVersionCheck(currentVersion, notif.maxVersion)) continue;
        if(notif.minVersion && !minVersionCheck(currentVersion, notif.minVersion)) continue;
        if(document.querySelector('.otd-notification-modal')) continue;
        let notifHTML = `<div class="otd-notification otd-notification-${notif.type}"><div class="otd-notification-content">${notif.text}</div></div>`;
        let shown = Date.now();
        createModal(notifHTML, 'otd-notification-modal', () => {
            if(!notif.dismissable) return;
            let readNotifs = localStorage.getItem('readNotifications') ? JSON.parse(localStorage.getItem('readNotifications')) : [];
            if(readNotifs.includes(notif.id)) return;
            readNotifs.push(notif.id);
            localStorage.setItem('readNotifications', JSON.stringify(readNotifs));
        }, () => Date.now() - shown > 3000);
    }
    localStorage.OTDnotifsReadOnce = '1';
}

let style = document.createElement('style');
style.innerHTML = /*css*/`
.otd-modal {
    position: fixed;
    z-index: 200;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: rgb(0, 0, 0);
    background-color: rgba(0, 0, 0, 0.4);
}

.otd-modal-content {
    width: fit-content;
    min-width: 500px;
    margin: auto;
    border-radius: 5px;
    padding: 20px;
    background-color: white;
    color: black;
    top: 20%;
    position: relative;
    max-height: 60%;
    overflow-y: inherit;
    animation: opac 0.2s ease-in-out;
}
html.dark .otd-modal-content {
    background-color: #15202b;
    color: white;
}
.otd-notification-warning > .otd-notification-content::before {
    content: "⚠️";
    margin-right: 5px;
}
.otd-notification-error > .otd-notification-content::before {
    content: "❌";
    margin-right: 5px;
}
.otd-notification-info > .otd-notification-content::before {
    content: "ℹ️";
    margin-right: 5px;
}
@keyframes opac {
    0% {
        opacity: 0
    }
    100% {
        opacity: 1
    }
}

.otd-modal-close {
    color: #aaaaaa;
    float: right;
    font-size: 20px;
    font-weight: bold;
    top: 0;
    right: 5px;
    position: absolute;
}

.otd-modal-close:hover,
.otd-modal-close:focus {
    color: black;
    text-decoration: none;
    cursor: pointer;
}
`;

setTimeout(() => {
    document.head.appendChild(style);
}, 1000);
setTimeout(showNotifications, 2000);
setInterval(showNotifications, 60000 * 60);