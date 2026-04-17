self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
    let data = {};

    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = {
            title: 'PawPrice',
            body: event.data ? event.data.text() : '通知があります',
            url: '/',
        };
    }

    const title = data.title || 'PawPrice';
    const options = {
        body: data.body || '通知があります',
        data: {
            url: data.url || '/',
        },
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification?.data?.url || '/';

    event.waitUntil(clients.openWindow(url));
});