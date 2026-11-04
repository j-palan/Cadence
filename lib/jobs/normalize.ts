export function plainText(html: string): string {
  // Greenhouse can double-encode HTML. Decode before stripping; never render HTML.
  let text = html
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: "'", lsquo: "'", bull: '•' }
  for (let pass = 0; pass < 3; pass++) text = text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (!code.startsWith('#')) return entities[code.toLowerCase()] ?? whole
    const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ' '
  })
  return text.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/(?:p|div|li|h[1-6])>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim().slice(0, 24000)
}
export function isSweIntern(title: string): boolean {
  return /\b(intern(?:ship)?|co[ -]?op)\b/i.test(title)
    && /\b(software|swe|developer|full[ -]?stack|front[ -]?end|back[ -]?end|platform engineer|mobile engineer|firmware)\b/i.test(title)
    && !/\b(senior|staff|principal|manager|sales|recruiter)\b/i.test(title)
}
export function countriesFor(location: string): string[] {
  const countries: string[] = []
  if (/\b(canada|canadian|toronto|vancouver|montreal|montréal|ottawa|waterloo|kitchener|calgary|edmonton|québec|quebec)\b/i.test(location) || /,\s*(ON|BC|QC|AB|NS|NB|MB|SK|PE|NL)\b/.test(location)) countries.push('CA')
  if (/\b(united states|usa|u\.s\.|new york|san francisco|san jose|seattle|boston|austin|chicago|palo alto|mountain view|sunnyvale|san mateo|redmond|bellevue|menlo park|los angeles|washington|atlanta|pittsburgh|boulder|denver|san diego)\b/i.test(location) || /,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/.test(location)) countries.push('US')
  return countries
}
export function internshipTerm(text: string): string {
  const season = text.match(/\b(summer|fall|autumn|winter|spring)\s*(20\d{2})?\b/i)
  const year = season?.[2] ?? text.match(/\b20\d{2}\b/)?.[0]
  return season ? `${season[1][0].toUpperCase()}${season[1].slice(1).toLowerCase()}${year ? ` ${year}` : ''}` : year ?? 'Not specified'
}
export function safeJobUrl(value: string): string | null {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null } catch { return null }
}
