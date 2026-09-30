# Spiderbench Lite: multiplayer

Versão leve e **multiplayer** do Spiderbench, um jogo 3D de balançar na teia pela cidade que roda no navegador.
Cada pessoa abre o link, escolhe um nome e entra no mesmo mundo. Não tem login nem cadastro.

- Cidade com prédios texturizados, calçadas, parques e carros estacionados
- Homem-Aranha e bandidos com os modelos 3D e as animações do jogo original
- Teia, tirolesa, escalada de paredes, pulo carregado, combos, esquiva
- Bandidos (IA local) que perseguem e atacam
- Multiplayer: todos se veem em tempo real com nome em cima da cabeça, cor de traje diferente e teia visível. Dá para dar soco em outros jogadores.
- Renderiza sempre em 800x600 esticado na tela, para rodar em máquina fraca

---

## Rodar no VPS com Docker (recomendado)

### 1. Pré-requisitos no VPS

- Docker e o plugin Docker Compose (`docker compose version` precisa funcionar)
  - Ubuntu/Debian: `curl -fsSL https://get.docker.com | sh`
- Git
- Uns 500 MB livres (os assets do jogo ocupam ~150 MB)

### 2. Clonar e subir

```bash
git clone <URL-DO-SEU-REPOSITORIO> spiderbench
cd spiderbench
docker compose up -d --build
```

Pronto. O servidor fica na porta **3000** e reinicia sozinho se o VPS reiniciar (`restart: unless-stopped`).

Conferir se está no ar:

```bash
docker compose ps
docker compose logs -f        # mostra quem entra e sai ("+ jogador 3 (2 online)")
curl -I http://localhost:3000/lite/
```

### 3. Liberar acesso para os jogadores

Os jogadores entram em:

```
http://IP-DO-VPS:3000/lite/
```

(`http://IP-DO-VPS:3000/` também funciona, porque redireciona para `/lite/`.)

**Firewall do VPS**: libere a porta 3000.

```bash
sudo ufw allow 3000/tcp         # se usa ufw
```

**VPS em casa, jogadores fora da sua rede**: no roteador, crie um **redirecionamento de porta** (port forwarding)
da porta externa 3000 para o IP local do VPS, porta 3000. Os amigos usam o seu **IP público** (veja em https://ifconfig.me).
Se o seu IP público muda, use um DNS dinâmico (DuckDNS, No-IP, etc.).

**Só na rede local (LAN)**: nada no roteador. Use o IP local do VPS (ex.: `http://192.168.0.50:3000/lite/`).

### 4. Mudar a porta

```bash
PORT=8080 docker compose up -d
```

(muda só a porta externa; dentro do container continua 3000)

### 5. Atualizar depois de mudar o código

```bash
git pull
docker compose up -d --build
```

### 6. Parar

```bash
docker compose down
```

---

## (Opcional) Domínio com HTTPS

Não é obrigatório. Se tiver um domínio apontando para o VPS, o jeito mais simples é o [Caddy](https://caddyserver.com),
que emite o certificado sozinho e já repassa o WebSocket do multiplayer:

```
# /etc/caddy/Caddyfile
jogo.seudominio.com {
    reverse_proxy localhost:3000
}
```

Os jogadores entram em `https://jogo.seudominio.com/lite/`. O jogo detecta o HTTPS e usa `wss://` sozinho.
Com nginx, lembre de repassar os cabeçalhos `Upgrade` e `Connection` na rota `/ws`.

---

## Rodar sem Docker (para testar no PC)

Precisa de Node.js 18 ou mais novo.

```bash
cd lite/server
npm install
cd ../..
node lite/server/server.mjs
```

Abra `http://localhost:3000/lite/`. O terminal mostra os endereços que outros PCs da rede podem usar.

---

## Controles

| Tecla | Ação |
|---|---|
| Mouse | câmera |
| W A S D | andar |
| Shift | correr (na parede: subir mais rápido) |
| Espaço | pular. Segure para um pulo mais alto. Na parede: salto. Na teia: solta com impulso |
| **Botão direito** (segurar) | balançar na teia. Solte para largar |
| E / botão do meio | tirolesa: puxa até a beira do prédio que você está mirando |
| **Botão esquerdo** / F | atacar. Clique em sequência para combo; o 5º golpe é um uppercut. Avança sozinho até o alvo |
| Q | esquivar (fica invulnerável por um instante) |
| C / Ctrl | largar a teia e mergulhar |
| Encostar num prédio | gruda na parede. W sobe, S desce, A/D anda de lado; no topo sobe no telhado |
| T | teleportar até outro jogador (repita para ir ao próximo) |
| Esc | pausar |

O nome escolhido fica salvo no navegador para a próxima vez.

---

## Como funciona

```
lite/
  index.html            o jogo inteiro (three.js, sem build)
  three.module.min.js   three.js 0.170
  jsm/                  GLTFLoader e SkeletonUtils do three.js
  server/
    server.mjs          servidor HTTP (arquivos) + WebSocket (multiplayer) na mesma porta
    package.json        única dependência: ws
assets/                 modelos, texturas e sons do jogo original (usados pelo lite)
Dockerfile, docker-compose.yml
```

- **Servidor**: serve os arquivos da pasta do projeto e repassa mensagens no caminho `/ws`.
  Cada jogador manda sua posição, animação e teia 20 vezes por segundo, e o servidor repassa aos outros.
  Não guarda nada em disco nem em banco. Se reiniciar, todo mundo reconecta sozinho em 5 s.
- **Cidade**: gerada com semente fixa, então é igual em todos os computadores.
- **Bandidos**: cada jogador tem os seus (não são sincronizados). O resto do mundo é compartilhado.
- **Sem servidor**: abrindo o `lite/index.html` por um servidor estático qualquer, o jogo funciona em modo solo.
- **Teste automático**: `http://.../lite/?bot` joga sozinho (anda, balança, ataca). Serve para ver o multiplayer
  funcionando com uma segunda aba.

### Limitações conhecidas

- Sem anti-cheat nem validação no servidor: o cliente é confiável. Para jogar com amigos está ok; não exponha para
  o mundo esperando proteção.
- Os socos entre jogadores são decididos por quem bate, então com ping alto podem parecer injustos.
- O jogo original (`/index.html`, versão completa) **não** é servido por este servidor: ele espera estar em
  `/spiderbench/` e é pesado demais para máquinas fracas. Use a versão lite.

---

## Projeto original

Os assets (modelos, texturas, sons) vêm do jogo original, criado por outro autor:

**https://github.com/xikhar/spiderbench**. Todo o crédito do jogo original vai para ele.

## Disclaimer

This is an unofficial, non-commercial fan project, published for fun and educational purposes only.

- It is **not affiliated with, endorsed by, sponsored by, or connected to** Marvel, Marvel Entertainment, The Walt Disney Company, Sony Group Corporation, Sony Interactive Entertainment, Insomniac Games, or any other game studio, publisher or rights holder.
- "Spider-Man" and all related names, characters, logos, and trademarks are the property of their respective owners. Any similarity to existing games, characters or franchises is unintentional or used purely as homage; no ownership or affiliation is claimed.
- All other trademarks, service marks, product names and company names mentioned are the property of their respective owners.
- No revenue is generated from this project.
- The software is provided "as is", without warranty of any kind, express or implied. Use it at your own risk.

## Takedown

If you are a rights holder and believe any content in this repository infringes your rights, please open an issue in this repository and it will be removed promptly.

## License

This repository does not grant any license beyond what the original author provides. Refer to the [original repository](https://github.com/xikhar/spiderbench) for licensing terms.
