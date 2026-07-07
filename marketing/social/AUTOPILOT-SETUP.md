# Trove — Autopilot de Anúncios Meta

Cria anúncios de tráfego automaticamente a partir do catálogo. Você só **pausa** o que não performa (ou deixa o review automático pausar).

## O que faz

| Comando | Ação |
|---------|------|
| `npm run ads:autopilot` | Gera criativos + publica até **3 anúncios novos**/dia no Meta |
| `npm run ads:review` | Analisa métricas e **pausa** ads ruins + avisa no Telegram |
| `npm run ads:run` | Autopilot + review em sequência |
| `npm run ads:dashboard` | **Painel visual** — acompanhar, pausar, rodar comandos |

## Painel de acompanhamento (recomendado)

Abre no navegador com tudo em um lugar:

```bash
npm run ads:dashboard
```

Ou clique duas vezes no Desktop: **`Trove-Autopilot-Painel.bat`**

URL: **http://localhost:3847**

O painel mostra:
- Anúncios ativos + gasto/cliques (últimos 7 dias)
- Botão **Pausar** em cada anúncio ruim
- Fila dos próximos produtos
- Comandos com botão **Executar** ou **Copiar**
- Links: Gerenciador Meta, admin do site, Instagram
- Atualiza sozinho a cada 60 segundos

## Configuração (uma vez)

### 1. Token Meta (Marketing API)

1. Acesse [developers.facebook.com](https://developers.facebook.com) → seu app (ou crie app **Business**)
2. **Ferramentas** → **Graph API Explorer**
3. Permissões: `ads_management`, `ads_read`, `pages_read_engagement`, `business_management`
4. Gere token → converta em **token de longa duração** (60 dias) ou use **System User** no Business Manager (recomendado)

### 2. IDs (já conhecidos do Trove)

| Variável | Valor |
|----------|-------|
| `META_PAGE_ID` | `1170245709513727` |
| `META_PIXEL_ID` | `1678050193246903` |
| `META_AD_ACCOUNT_ID` | Conta **Igor Gomes** — veja em Gerenciador de Anúncios → Configurações (formato `act_123…` ou só números) |

### 3. Arquivo `.env.local` (no PC)

```env
# Meta Ads Autopilot
META_ACCESS_TOKEN=EAAxxxx...
META_AD_ACCOUNT_ID=act_XXXXXXXXX
META_PAGE_ID=1170245709513727
META_PIXEL_ID=1678050193246903

# R$ 10/dia por anúncio (valor em centavos)
META_AD_DAILY_BUDGET_CENTS=1000

# Máximo de anúncios novos por execução
META_AD_MAX_NEW=3

# ACTIVE = publica direto · PAUSED = rascunho para revisar
META_AD_STATUS=ACTIVE

# Review: pausa se gastar R$15 sem clique
META_AD_PAUSE_SPEND_CENTS=1500

# Telegram (já usa o mesmo do pedido)
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

### 4. Instagram no anúncio (opcional)

No Business Manager → Configurações da Página → Instagram → copie o **Instagram account ID**:
```env
META_INSTAGRAM_ACTOR_ID=178414xxxxxxxx
```

## Uso diário

```bash
cd meusprojeto/techdrop-us

# Criar novos anúncios (máx 3 por vez)
npm run ads:autopilot

# Revisar e pausar ruins
npm run ads:review

# Tudo junto
npm run ads:run
```

### Teste sem publicar
```bash
node --env-file=.env.local scripts/meta-ads-autopilot.mjs --dry-run
node --env-file=.env.local scripts/meta-ads-review.mjs --dry-run
```

## Agendamento automático (Windows)

Execute **como Administrador** no PowerShell:

```powershell
cd C:\Users\Guimi\meusprojeto\techdrop-us
.\scripts\setup-ad-autopilot-scheduler.ps1
```

Isso cria:
- **Review** todo dia às 9h (pausa ruins)
- **Autopilot** segundas às 10h (3 anúncios novos)

## Fluxo recomendado

```
Segunda: ads:autopilot  → +3 anúncios novos
Diário:  ads:review     → pausa losers, Telegram com relatório
Você:    Gerenciador Meta → confere, pausa manual se quiser
```

## Regras de pausa automática

| Condição | Ação |
|----------|------|
| Gastou ≥ R$15 e **0 cliques** | Pausa |
| 400+ impressões e CTR < 0,25% | Pausa |

Ajuste em `.env.local`: `META_AD_PAUSE_SPEND_CENTS`, `META_AD_MIN_IMPRESSIONS`, `META_AD_MIN_CTR`

## Estado salvo

`marketing/social/autopilot-state.json` — IDs dos anúncios criados (não commitar).

## Modo LIVE do app (obrigatório)

Antes de `npm run ads:autopilot`, coloque o app **Trove Autopilot** em modo **Live**:

1. [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Trove Autopilot**
2. No topo: interruptor **Desenvolvimento** → mude para **Live**
3. Se pedir URL de privacidade: `https://trove-us.com/privacy`
4. Gere o token de novo no Graph API Explorer após mudar para Live

Sem modo Live, a API retorna: *"app em modo de desenvolvimento"*.

- Só **Meta** (Facebook/Instagram) via API — TikTok continua manual com vídeos da pasta Desktop
- Meta pode levar **24h em revisão** em anúncios novos
- Token expira — renove a cada 60 dias ou use System User permanente
