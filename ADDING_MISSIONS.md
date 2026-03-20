# Como Adicionar Novas Missões ao GameREX

Guia passo a passo para adicionar missões com QR codes dedicados (tipo SIRR, GeoLink, Caçando o Dado).

## Visão Geral

Cada missão com QR codes próprios precisa de alterações em **7 arquivos**. Use as missões existentes (SIRR, GeoLink, Caçando o Dado) como referência.

## Passo a Passo

### 1. Escolher um tipo de evento e IDs

- Escolha um **tipo** curto (ex: `sirr`, `geolink`, `dado`).
- Escolha um **prefixo de ID** para os eventos (ex: `SIRR1-4`, `GL1-7`, `CD1-3`).
- O tipo **não** deve conflitar com tipos existentes (`oral`, `poster`, `plenaria`, `stand`, `sirr`, `happyhour`, `geolink`, `dado`).

### 2. Schema SQL — `supabase/schema.sql`

Adicione o novo tipo ao CHECK constraint da tabela `events`:

```sql
type TEXT NOT NULL CHECK (type IN ('oral', 'poster', ..., 'novo_tipo')),
```

### 3. Seed SQL — `supabase/seed.sql`

Adicione os eventos antes do `-- Happy Hour`:

```sql
-- Nome da Atividade (available all days)
('XX1', 'novo_tipo', 1, NULL, NULL, NULL, NULL),
('XX2', 'novo_tipo', 1, NULL, NULL, NULL, NULL),
```

> **Nota:** Todos usam `day: 1` por convenção (disponíveis todos os dias). Campos `room`, `time_slot`, `track_code` e `subtrilha` ficam `NULL`.

### 4. Tipos TypeScript — `game/src/lib/supabase.ts`

Adicione o tipo à union do `EventRow`:

```typescript
type: 'oral' | 'poster' | ... | 'novo_tipo'
```

### 5. Missões — `game/src/lib/missions.ts`

#### 5a. Adicionar tipo à interface `EventInfo`

```typescript
type: 'oral' | 'poster' | ... | 'novo_tipo'
```

#### 5b. Adicionar função helper de filtro

```typescript
function novosTipos(c: EventInfo[]) { return c.filter(e => e.type === 'novo_tipo') }
```

#### 5c. Adicionar a missão ao array `MISSIONS`

Inserir **antes** do `// ─── Happy Hour ───`:

```typescript
// ─── Nome da Missão ───
{
  id: 'id_da_missao',
  name: 'Nome da Missão',
  description: 'Descrição curta',
  category: 'stand',  // categoria na UI (stand = Mini-Expo/Aplicações)
  points: 100,
  check: (c) => {
    const items = novosTipos(c)
    const ids = new Set(items.map(e => e.id))
    const count = ['XX1', 'XX2'].filter(id => ids.has(id)).length
    return { done: count >= 2, progress: count, total: 2 }
  },
},
```

### 6. Etapas na UI — `game/src/pages/Missions.tsx`

No `switch` da função `getMissionSteps`, adicionar um `case` **antes** do `case 'lideres_supremas'`:

```typescript
case 'id_da_missao': {
  const ids = new Set(byType('novo_tipo').map(e => e.id))
  return [
    { label: 'Descrição da etapa 1', done: ids.has('XX1') },
    { label: 'Descrição da etapa 2', done: ids.has('XX2') },
  ]
}
```

### 7. Admin — `admin/src/App.tsx`

Adicionar a missão ao array `MISSIONS` (formato compacto de uma linha):

```typescript
{ id: 'id_da_missao', name: 'Nome', points: 100, check: (c) => { const ids=new Set(c.filter(e=>e.type==='novo_tipo').map(e=>e.id)); return['XX1','XX2'].every(id=>ids.has(id)) }},
```

### 8. QR Code Generator — `qrcodegen/src/data/events.ts`

#### 8a. Adicionar tipo à interface `EventData`

```typescript
type: 'oral' | 'poster' | ... | 'novo_tipo'
```

#### 8b. Adicionar eventos com títulos

```typescript
// ── Nome da Atividade ──
{ id: 'XX1', type: 'novo_tipo', title: 'Título da etapa 1', day: 1, room: null, time_slot: '', track: null },
{ id: 'XX2', type: 'novo_tipo', title: 'Título da etapa 2', day: 1, room: null, time_slot: '', track: null },
```

### 9. QR Code Generator UI — `qrcodegen/src/App.tsx`

Adicionar o tipo aos 4 maps/listas:

- `TYPE_EMOJI`: emoji para o tipo
- `TYPE_LABEL`: label legível
- `typeOrder`: ordem de exibição (número)
- `<select>`: opção no dropdown de filtro

## Deploy

1. **Supabase**: Executar os INSERTs dos novos eventos em produção. Se necessário, atualizar o CHECK constraint com `ALTER TABLE`.
2. **GitHub Actions**: O deploy do `game/` e `admin/` é automático via push para `main`.
3. **qrcodegen**: Rodar localmente (`cd qrcodegen && npm run dev`), filtrar pelo tipo, e exportar/imprimir os QR codes.

## Checklist Rápido

- [ ] `supabase/schema.sql` — CHECK constraint
- [ ] `supabase/seed.sql` — INSERT dos eventos
- [ ] `game/src/lib/supabase.ts` — union type
- [ ] `game/src/lib/missions.ts` — tipo, helper, missão
- [ ] `game/src/pages/Missions.tsx` — etapas no switch
- [ ] `admin/src/App.tsx` — missão no array
- [ ] `qrcodegen/src/data/events.ts` — tipo + eventos
- [ ] `qrcodegen/src/App.tsx` — emoji, label, ordem, filtro
