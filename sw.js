/* Кэш оболочки приложения.

   Загрузки пользователя тут не хранятся — они в IndexedDB.
   Картинки библиотеки (папка img/) в SHELL не входят намеренно:
   если хоть одного файла не окажется на месте, addAll свалится
   и не установится вообще ничего. Они кэшируются на лету, при
   первом показе — блок fetch ниже кладёт в кэш всё, что успешно
   загрузилось.

   ВАЖНО: правишь index.html или добавляешь картинки — подними
   номер версии ниже. Иначе телефон отдаст старую копию из кэша. */
const V = 'vellum-v7';

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-mask.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)));
});

/* Новая версия ждёт, пока страница не разрешит — тогда показывается
   полоска «Обновление готово». Если человек её не нажмёт, версия
   встанет сама при следующем запуске. */
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // счётчик посещений мимо кэша — иначе статистика собьётся
  if (e.request.method !== 'GET' || url.hostname === 'cloud.umami.is') return;

  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request)
      .then(res => {
        if (res.ok && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(V).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match('./index.html'))
    )
  );
});
