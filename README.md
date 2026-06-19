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
| `NEXT_PUBLIC_ANALYTICS_PIN` | Um PIN secreto (ex: `8421`) |

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
   - `supplierSku` — ID do produto no CJ (para referência)
   - `rating` / `reviews` / `sold` — use números reais do CJ ou remova exageros

4. Salve e teste: `npm run dev`

### 4. Fluxo de pedido (manual no início)

```
Cliente compra no Trove → PayPal (quando conectar)
       ↓
Você recebe email/notificação
       ↓
Entra no CJ → My CJ → Orders → Create order
       ↓
Cola endereço do cliente → Paga CJ → CJ envia dos EUA
```

---

## Status do projeto

| Parte | Status |
|-------|--------|
| Site (design, páginas, carrinho) | ✅ Pronto |
| Checkout (fluxo demo) | ✅ Pronto |
| SEO (sitemap, robots, favicon) | ✅ Pronto |
| Pagamento real (PayPal/Stripe) | ⏳ Próximo |
| Produtos reais CJ | ⏳ Você faz agora |
| Domínio + deploy | ⏳ Passo 1 acima |

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
| `.env.example` | Variáveis de ambiente |
| `scripts/margins.mjs` | Calculadora de margem |
