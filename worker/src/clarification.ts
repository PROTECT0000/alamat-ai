import type { Issue, IssueCode, ValidationResult } from './types'

export function generateClarification(result: ValidationResult): string | null {
  if (result.status === 'valid') return null
  if (result.status === 'invalid') return 'Halo kak, mohon kirim alamat lengkap beserta jalan, nomor, dan wilayah tujuan ya?'

  const order: IssueCode[] = ['HIERARCHY_MISMATCH', 'AMBIGUOUS_REGION', 'UNKNOWN_REGION', 'MISSING_FIELD']
  const questions: string[] = []
  for (const code of order) {
    for (const issue of result.issues) {
      if (issue.code !== code || questions.length === 2) continue
      const question = questionFor(issue)
      if (question && !questions.includes(question)) questions.push(question)
    }
  }
  if (questions.length === 0) return null
  return truncate(`Halo kak, untuk memastikan paket sampai, ${questions.join(' ')}`, 320)
}

function questionFor(issue: Issue): string {
  if (issue.code === 'HIERARCHY_MISMATCH') return 'boleh konfirmasi kembali kecocokan desa, kecamatan, dan kabupaten/kotanya?'
  if (issue.code === 'AMBIGUOUS_REGION') {
    const names = issue.candidates.map((candidate) => candidate.name)
    return names.length > 0 ? `alamatnya berada di ${names.join(' atau ')} ya?` : `boleh diperjelas ${label(issue.field)}-nya?`
  }
  if (issue.code === 'UNKNOWN_REGION') return `boleh konfirmasi kembali nama ${label(issue.field)}-nya?`
  if (issue.code === 'MISSING_FIELD') return `boleh dibantu ${label(issue.field)}-nya?`
  return ''
}

function label(field: string | null): string {
  if (field === 'desa_kelurahan') return 'desa/kelurahan'
  if (field === 'kabupaten_kota') return 'kabupaten/kota'
  if (field === 'kode_pos') return 'kode pos'
  return (field ?? 'detail alamat').replaceAll('_', ' ')
}

function truncate(value: string, limit: number): string {
  const characters = Array.from(value)
  return characters.length <= limit ? value : `${characters.slice(0, limit - 1).join('').trim()}…`
}
