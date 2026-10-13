// Service worker do Sobre o Saibro — só cuida do "instalável" e de um fallback
// offline pra tela principal. NÃO cacheia dados do Supabase (horários, reservas
// etc. têm que vir sempre da rede, senão o cliente vê informação desatualizada).
const CACHE = "saibro-shell-v1";
const SHELL_URL = "/";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.add(SHELL_URL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Só mexe em pedidos do próprio site. Supabase e qualquer outro domínio
  // passam direto pela rede, sem cache.
  if (url.origin !== self.location.origin) return;

  // Navegação (abrir/recarregar o app): tenta rede primeiro, cai pro shell
  // salvo em cache se estiver offline.
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put(SHELL_URL, res.clone()));
          return res;
        })
        .catch(() => caches.match(SHELL_URL))
    );
    return;
  }

  // Demais arquivos estáticos do próprio site (ícones, manifest): cache-first.
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
