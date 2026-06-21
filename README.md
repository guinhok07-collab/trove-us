# Trove — Loja online (EUA)

Marca: **Trove** — *Life's essentials, in one place*

## Rodar local

```bash
cd C:\Users\Guimi\meusprojeto\techdrop-us
npm install
copy .env.example .env.local
npm run dev
```

- Loja: http://localhost:3000
- Painel stats: http://localhost:3000/analytics
- Checklist produtos: http://localhost:3000/launch

---

## Deploy daqui (Cursor / terminal)

O projeto já está linkado à Vercel (`trove-us`).

### Publicar em produção

```powershell
cd C:\Users\Guimi\meusprojeto\techdrop-us
npm run deploy
```

### Preview (teste antes de ir ao ar)

```powershell
npm run deploy:preview
```

### Atualizar via GitHub (automático)

```powershell
git add .
git commit -m "sua mudanca"
git push
```

A Vercel redeploya sozinha quando você dá push na branch `main`.

### Conta Vercel linkada

- Team: `dadoscacambas-7977s-projects`
- Projeto: `trove-us`
- URL: https://trove-us.vercel.app

Se `npm run deploy` pedir login: `npx vercel login`

---

### 1. Criar conta (grátis)

1. GitHub: https://github.com/signup
2. Vercel: https://vercel.com/signup (entre com GitHub)

### 2. Subir o código pro GitHub

No PowerShell, dentro da pasta do projeto:

```powershell
cd C:\Users\Guimi\meusprojeto\techdrop-us
git add .
git commit -m "Trove store ready for deploy"
```

Crie um repositório no GitHub (ex: `trove-store`), depois:

```powershell
git remote add origin https://github.com/SEU-USUARIO/trove-store.git
git branch -M main
git push -u origin main
```

### 3. Deploy na Vercel

1. Vercel → **Add New Project**
2. Importe o repositório `trove-store`
3. Framework: **Next.js** (detecta automático)
4. Em **Environment Variables**, adicione:

| Variável | Valor |
|----------|-------|
| `NEXT_PUBLIC_SITE_URL` | `https://trovegoods.com` (ou URL `.vercel.app` temporária) |
| `OWNER_PIN` | PIN secreto do dono (server-only — **não** use `NEXT_PUBLIC_`) |

5. Clique **Deploy** — em ~2 min o site está no ar.

### 4. Domínio trovegoods.com

1. Compre em Namecheap, GoDaddy ou Google Domains (~US$ 12/ano)
2. Vercel → Project → **Settings → Domains** → Add `trovegoods.com`
3. Siga as instruções de DNS (copiar registros A/CNAME)
4. Atualize `NEXT_PUBLIC_SITE_URL` para `https://trovegoods.com`

### Alternativa sem GitHub

```powershell
npx vercel@latest
```

Siga o assistente no terminal (login no browser). Repita `npx vercel --prod` para produção.

---

## PASSO 2 — Produtos reais (CJ Dropshipping)

### 1. Criar conta CJ

1. https://cjdropshipping.com → Register (grátis)
2. Complete o perfil (nome, email, país: Brazil funciona)

### 2. Buscar produtos (10 para começar)

No CJ, use estes filtros **sempre**:

- **Ship From** → United States
- **Sort** → Orders (mais vendidos)
- Avaliação 4+ estrelas

Abra http://localhost:3000/launch — lista dos 10 produtos iniciais com termos de busca e preços sugeridos.

| Departamento | Buscar no CJ | Vender por |
|---|---|---|
| Pet | orthopedic dog bed | ~$49.99 |
| Pet | no pull dog harness | ~$27.99 |
| Pet | pet water fountain | ~$34.99 |
| Home | closet hanging organizer | ~$32.99 |
| Home | LED motion night light | ~$19.99 |
| Wellness | mini massage gun | ~$59.99 |
| Wellness | foam roller | ~$29.99 |
| Tech | aluminum laptop stand | ~$39.99 |
| Tech | USB C hub 7 in 1 | ~$44.99 |
| Tech | keyboard wrist rest | ~$24.99 |

Ver margens estimadas:

```bash
npm run margins
```

**Regra:** lucro ≥ 40% depois de (custo produto + frete + taxa PayPal 3.4%).

### 3. Colocar no site

Para cada produto encontrado no CJ:

1. Abra `src/data/products.ts`
2. Encontre o `slug` correspondente (ex: `orthopedic-dog-bed`)
3. Atualize:
   - `name` — título claro em inglês
   - `description` / `longDescription` — reescreva (não copie Amazon)
   - `price` — preço de venda Trove
   - `compareAtPrice` — ~30–40% acima (opcional)
   - `image` e `images` — URL da foto do CJ (clique direito → copiar URL)
   - `image` e `images` — URL da foto do CJ
   - `supplierSku` — ID do produto CJ (referência)
   - **`cjVid`** — ID da variante CJ (**obrigatório** para pedido automático)
   - `cjSku` — SKU da variante (opcional)

4. Salve e faça deploy: `npm run deploy`

---

## Pedidos automáticos (API CJ)

Documentação oficial: [developers.cjdropshipping.com](https://developers.cjdropshipping.com)

### O que você precisa

| # | O quê | Onde conseguir |
|---|-------|----------------|
| 1 | **CJ_API_KEY** | CJ → Authorization → API → **Generate** |
| 2 | **Saldo na wallet CJ** | CJ → Wallet → add funds (para `CJ_PAY_TYPE=2`) |
| 3 | **cjVid** em cada produto | CJ → abra produto → variantes → copie Variant ID |
| 4 | Variáveis na **Vercel** | Project → Settings → Environment Variables |

### Variáveis na Vercel

```
CJ_API_KEY=sua-chave-aqui
CJ_PAY_TYPE=2
CJ_FROM_COUNTRY=US
CJ_STORE_NAME=Trove
```

| CJ_PAY_TYPE | Comportamento |
|-------------|---------------|
| `2` | **Automático** — paga do saldo CJ e envia |
| `3` | Cria pedido no CJ — você paga manual no painel |

Depois de salvar as variáveis → **Redeploy** na Vercel.

### Fluxo automático

```
Cliente finaliza checkout no Trove
        ↓
Site chama /api/orders
        ↓
Calcula frete CJ (US → US)
        ↓
Cria pedido no CJ (createOrderV2)
        ↓
CJ envia pro cliente
```

### Como achar o cjVid

1. No CJ, abra o produto
2. Clique em **Connect** / adicione a **My Products**
3. Veja as variantes (S/M/L etc.) — cada uma tem um **VID**
4. Cole em `products.ts`:

```typescript
cjVid: "439FC05B-1311-4349-87FA-1E1EF942C418",
cjSku: "CJSKU123",
supplierSku: "1234567890",
```

### Webhook (opcional)

URL para configurar no CJ: `https://trove-us.vercel.app/api/cj/webhook`

---

## Status do projeto

| Parte | Status |
|-------|--------|
| Site (design, páginas, carrinho) | ✅ Pronto |
| Checkout + API CJ | ✅ Pronto (precisa CJ_API_KEY) |
| SEO (sitemap, robots, favicon) | ✅ Pronto |
| Deploy Vercel | ✅ No ar |
| Pagamento cliente (PayPal/Stripe) | ⏳ Próximo |
| Produtos reais + cjVid | ⏳ Você faz agora |

---

## Email sugerido

hello@trovegoods.com (configure no domínio depois de comprar)

## Domínio sugerido

**trovegoods.com** (prioridade .com)

## Arquivos úteis

| Arquivo | Para quê |
|---------|----------|
| `src/data/sourcing.ts` | 10 produtos launch + margens |
| `src/data/products.ts` | Catálogo do site |
| `src/lib/cj/` | Integração API CJ |
| `scripts/margins.mjs` | Calculadora de margem |
