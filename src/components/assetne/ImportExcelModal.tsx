import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Modal, ModalFooter } from './Modal'
import { useCreateEquipmentMutation } from '~/lib/equipment/queries'
import { useCreateClientMutation } from '~/lib/clients/queries'
import { useCreateProductionItemMutation } from '~/lib/production/queries'
import { useCreatePatrimonyItemMutation } from '~/lib/patrimony/queries'

const MAX_IMPORT_ROWS = 200

type ImportType = 'equipment' | 'clients' | 'production' | 'patrimony'

type EquipRow = {
  nome: string
  categoria: string
  valor: string
  serie?: string
  condicao?: string
}
type ClientRow = { nome: string }
type ProdRow = {
  nome: string
  categoria: string
  quantidade: number
  condicao?: string
  localizacao?: string
  codigo?: string
  notas?: string
}

type PatRow = {
  nome: string
  categoria: string
  codigoPatrimonial: string
  marca?: string
  modelo?: string
  localizacao?: string
  condicao?: string
  valor?: string
  notas?: string
}

type ParsedRow = EquipRow | ClientRow | ProdRow | PatRow

function normalizeCondition(raw: string): 'new' | 'good' | 'regular' {
  const v = raw?.toLowerCase().trim()
  if (v === 'novo' || v === 'new')     return 'new'
  if (v === 'regular')                 return 'regular'
  return 'good'
}

function normalizeProdCondition(raw: string): 'bom' | 'regular' | 'ruim' {
  const v = raw?.toLowerCase().trim()
  if (v === 'ruim' || v === 'bad')     return 'ruim'
  if (v === 'regular')                 return 'regular'
  return 'bom'
}

export function ImportExcelModal({
  type,
  onClose,
}: {
  type: ImportType
  onClose: () => void
}) {
  const [rows,      setRows]      = useState<ParsedRow[]>([])
  const [error,     setError]     = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [done,      setDone]      = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const createEquip    = useCreateEquipmentMutation()
  const createClient   = useCreateClientMutation()
  const createProd     = useCreateProductionItemMutation()
  const createPatrimony = useCreatePatrimonyItemMutation()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })

        if (type === 'equipment') {
          const parsed: EquipRow[] = json
            .map((r) => ({
              nome:      String(r['Nome'] || r['nome'] || r['NOME'] || '').trim(),
              categoria: String(r['Categoria'] || r['categoria'] || r['CATEGORIA'] || 'Outro').trim(),
              valor:     String(r['Valor'] || r['valor'] || r['VALOR'] || 'R$ 0').trim(),
              serie:     String(r['Série'] || r['Serie'] || r['série'] || r['serie'] || r['SN'] || '').trim() || undefined,
              condicao:  String(r['Condição'] || r['Condicao'] || r['condicao'] || r['condição'] || 'bom').trim(),
            }))
            .filter((r) => r.nome.length > 0)
            .slice(0, MAX_IMPORT_ROWS)
          setRows(parsed)
        } else if (type === 'production') {
          const parsed: ProdRow[] = json
            .map((r) => ({
              nome:        String(r['Nome'] || r['nome'] || r['NOME'] || '').trim(),
              categoria:   String(r['Categoria'] || r['categoria'] || r['CATEGORIA'] || 'Outro').trim(),
              quantidade:  Math.max(1, parseInt(String(r['Quantidade'] || r['quantidade'] || r['Qtd'] || r['qtd'] || '1')) || 1),
              condicao:    String(r['Condição'] || r['Condicao'] || r['condicao'] || r['condição'] || 'bom').trim(),
              localizacao: String(r['Localização'] || r['Localizacao'] || r['localizacao'] || '').trim() || undefined,
              codigo:      String(r['Código'] || r['Codigo'] || r['codigo'] || r['código'] || '').trim() || undefined,
              notas:       String(r['Notas'] || r['notas'] || r['Observações'] || r['observacoes'] || '').trim() || undefined,
            }))
            .filter((r) => r.nome.length > 0)
            .slice(0, MAX_IMPORT_ROWS)
          setRows(parsed)
        } else if (type === 'patrimony') {
          let autoCode = 1
          const parsed: PatRow[] = json
            .map((r) => ({
              nome:              String(r['Nome'] || r['nome'] || r['NOME'] || '').trim(),
              categoria:         String(r['Categoria'] || r['categoria'] || 'Outro').trim(),
              codigoPatrimonial: String(r['Código'] || r['Codigo'] || r['codigo'] || r['código'] || r['CodigoPatrimonial'] || r['codigoPatrimonial'] || '').trim() || `IMP-${String(autoCode++).padStart(3, '0')}`,
              marca:             String(r['Marca'] || r['marca'] || '').trim() || undefined,
              modelo:            String(r['Modelo'] || r['modelo'] || '').trim() || undefined,
              localizacao:       String(r['Localização'] || r['Localizacao'] || r['localizacao'] || '').trim() || undefined,
              condicao:          String(r['Condição'] || r['Condicao'] || r['condicao'] || 'bom').trim(),
              valor:             String(r['Valor'] || r['valor'] || r['ValorEstimado'] || '').trim() || undefined,
              notas:             String(r['Notas'] || r['notas'] || r['Observações'] || '').trim() || undefined,
            }))
            .filter((r) => r.nome.length > 0)
            .slice(0, MAX_IMPORT_ROWS)
          setRows(parsed)
        } else {
          const parsed: ClientRow[] = json
            .map((r) => ({
              nome: String(r['Nome'] || r['nome'] || r['NOME'] || '').trim(),
            }))
            .filter((r) => r.nome.length > 0)
            .slice(0, MAX_IMPORT_ROWS)
          setRows(parsed)
        }
      } catch {
        setError('Não foi possível ler o arquivo. Use .xlsx ou .xls.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  async function handleImport() {
    setImporting(true)
    try {
      if (type === 'equipment') {
        for (const row of rows as EquipRow[]) {
          await createEquip.mutateAsync({
            name:         row.nome,
            category:     row.categoria,
            value:        row.valor,
            serialNumber: row.serie,
            condition:    normalizeCondition(row.condicao ?? ''),
          })
        }
      } else if (type === 'production') {
        for (const row of rows as ProdRow[]) {
          await createProd.mutateAsync({
            name:          row.nome,
            category:      row.categoria,
            totalQty:      row.quantidade,
            condition:     normalizeProdCondition(row.condicao ?? ''),
            location:      row.localizacao,
            codigoInterno: row.codigo,
            notes:         row.notas,
          })
        }
      } else if (type === 'patrimony') {
        for (const row of rows as PatRow[]) {
          const val = row.valor ? parseFloat(row.valor.replace(/[R$\s.]/g, '').replace(',', '.')) : null
          await createPatrimony.mutateAsync({
            name:           row.nome,
            category:       row.categoria,
            patrimonyCode:  row.codigoPatrimonial,
            brand:          row.marca,
            model:          row.modelo,
            location:       row.localizacao,
            condition:      row.condicao ?? 'bom',
            status:         'disponivel',
            quantity:       1,
            estimatedValue: val && !isNaN(val) ? val : null,
            notes:          row.notas,
          })
        }
      } else {
        for (const row of rows as ClientRow[]) {
          await createClient.mutateAsync(row.nome)
        }
      }
      setDone(true)
    } finally {
      setImporting(false)
    }
  }

  const title =
    type === 'equipment'  ? 'Importar Equipamentos' :
    type === 'production' ? 'Importar Itens de Produção' :
    type === 'patrimony'  ? 'Importar Patrimônio' :
    'Importar Clientes'

  return (
    <Modal title={title} onClose={onClose} width={520}>
      {done ? (
        <div className="py-6 text-center">
          <div className="mb-2 text-[32px]">✓</div>
          <div className="text-[15px] font-semibold text-[#3fb950]">
            {rows.length} {type === 'equipment' ? 'equipamento(s) importado(s)' : 'cliente(s) importado(s)'}
          </div>
          <button
            onClick={onClose}
            className="mt-4 rounded-md bg-[#1f6feb] px-5 py-2 text-[13px] font-medium text-white"
          >
            Fechar
          </button>
        </div>
      ) : (
        <>
          {/* Template hint */}
          <div className="mb-4 rounded-md border border-white/10 bg-[#0d1117] p-3 text-[12px] text-[#8b949e]">
            {type === 'equipment' ? (
              <>
                Colunas esperadas:{' '}
                <span className="font-['JetBrains_Mono'] text-[#58a6ff]">Nome</span>,{' '}
                <span className="font-['JetBrains_Mono'] text-[#58a6ff]">Categoria</span>,{' '}
                <span className="font-['JetBrains_Mono'] text-[#58a6ff]">Valor</span>,{' '}
                <span className="font-['JetBrains_Mono'] text-[#6e7681]">Série (opc.)</span>,{' '}
                <span className="font-['JetBrains_Mono'] text-[#6e7681]">Condição (opc.)</span>
              </>
            ) : type === 'production' ? (
              <>
                Colunas esperadas:{' '}
                <span className="font-['JetBrains_Mono'] text-[#58a6ff]">Nome</span>,{' '}
                <span className="font-['JetBrains_Mono'] text-[#58a6ff]">Categoria</span>,{' '}
                <span className="font-['JetBrains_Mono'] text-[#6e7681]">Quantidade (opc.)</span>,{' '}
                <span className="font-['JetBrains_Mono'] text-[#6e7681]">Condição (opc.)</span>,{' '}
                <span className="font-['JetBrains_Mono'] text-[#6e7681]">Localização (opc.)</span>,{' '}
                <span className="font-['JetBrains_Mono'] text-[#6e7681]">Código (opc.)</span>
              </>
            ) : type === 'patrimony' ? (
              <>
                Colunas esperadas:{' '}
                <span className="font-['JetBrains_Mono'] text-[#58a6ff]">Nome</span>,{' '}
                <span className="font-['JetBrains_Mono'] text-[#58a6ff]">Categoria</span>,{' '}
                <span className="font-['JetBrains_Mono'] text-[#6e7681]">Código (opc.)</span>,{' '}
                <span className="font-['JetBrains_Mono'] text-[#6e7681]">Marca (opc.)</span>,{' '}
                <span className="font-['JetBrains_Mono'] text-[#6e7681]">Modelo (opc.)</span>,{' '}
                <span className="font-['JetBrains_Mono'] text-[#6e7681]">Valor (opc.)</span>
              </>
            ) : (
              <>
                Coluna esperada:{' '}
                <span className="font-['JetBrains_Mono'] text-[#58a6ff]">Nome</span>
              </>
            )}
          </div>

          {/* File input */}
          <div
            className="mb-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/10 p-6 transition-colors hover:border-[#58a6ff]/40 hover:bg-[#58a6ff]/[0.03]"
            onClick={() => fileRef.current?.click()}
          >
            <div className="text-[28px]">📊</div>
            <div className="text-[13px] font-medium text-[#8b949e]">
              {rows.length > 0 ? `${rows.length} linha(s) detectada(s)` : 'Clique para selecionar o arquivo'}
            </div>
            <div className="text-[11px] text-[#6e7681]">.xlsx / .xls / .csv</div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              className="hidden"
            />
          </div>

          {error && (
            <div className="mb-3 rounded-md border border-[#f85149]/20 bg-[#f85149]/10 px-3 py-2 text-[12px] text-[#f85149]">
              {error}
            </div>
          )}

          {/* Preview */}
          {rows.length > 0 && (
            <div className="mb-4 max-h-[200px] overflow-y-auto rounded-lg border border-white/10 bg-[#0d1117]">
              {rows.slice(0, 20).map((row, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3 py-2 text-[12px] ${i < rows.length - 1 ? 'border-b border-white/[0.06]' : ''}`}
                >
                  <span className="shrink-0 font-['JetBrains_Mono'] text-[#6e7681]">{i + 1}</span>
                  {'valor' in row ? (
                    <>
                      <span className="font-medium text-[#e6edf3]">{(row as EquipRow).nome}</span>
                      <span className="text-[#6e7681]">{(row as EquipRow).categoria}</span>
                      <span className="ml-auto font-['JetBrains_Mono'] text-[#8b949e]">{(row as EquipRow).valor}</span>
                    </>
                  ) : 'quantidade' in row ? (
                    <>
                      <span className="font-medium text-[#e6edf3]">{(row as ProdRow).nome}</span>
                      <span className="text-[#6e7681]">{(row as ProdRow).categoria}</span>
                      <span className="ml-auto font-['JetBrains_Mono'] text-[#8b949e]">{(row as ProdRow).quantidade}x</span>
                    </>
                  ) : (
                    <span className="font-medium text-[#e6edf3]">{(row as ClientRow).nome}</span>
                  )}
                </div>
              ))}
              {rows.length > 20 && (
                <div className="px-3 py-2 text-[11px] text-[#6e7681]">
                  + {rows.length - 20} linha(s) adicionais
                  {rows.length >= MAX_IMPORT_ROWS && (
                    <span className="ml-1 text-[#f59e0b]">(limite de {MAX_IMPORT_ROWS} linhas aplicado)</span>
                  )}
                </div>
              )}
            </div>
          )}

          <ModalFooter
            onClose={onClose}
            onConfirm={handleImport}
            confirmLabel={`Importar ${rows.length > 0 ? rows.length + ' ' + (type === 'equipment' ? 'equipamentos' : 'clientes') : ''}`}
            disabled={rows.length === 0}
            loading={importing}
          />
        </>
      )}
    </Modal>
  )
}
