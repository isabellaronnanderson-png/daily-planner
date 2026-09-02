// /api/gdelt.js
// Queries the free, keyless GDELT 2.0 DOC API for international press coverage
// of the Nordic countries — i.e. articles ABOUT the Nordics published OUTSIDE them.
// Docs: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
//
// NOTE: GDELT's sourcecountry: filter takes FIPS 2-letter country codes,
// NOT country names (Sweden's code is SW, not "Sweden").

const NORDIC_FIPS_CODES = {
  Sweden: 'SW',
  Norway: 'NO',
  Denmark: 'DA',
  Finland: 'FI',
  Iceland: 'IC',
}
const MAX_LOOKBACK_DAYS = 14
const MAX_RECORDS = 60
const FETCH_TIMEOUT_MS = 8000

function toGdeltDateTime(date) {
  return date.toISOString().replace(/[-:T]/g, '').slice(0, 14)
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function degraded(since, now, message, debug) {
  return {
    since: since.toISOString(),
    fetchedAt: now.toISOString(),
    count: 0,
    articles: [],
    error: message,
    // Temporary while debugging deployment issues — safe to show for a
    // personal single-user app. Remove once this is confirmed working.
    debug,
  }
}

export default async function handler(req, res) {
  const now = new Date()
  let since = req.query.since ? new Date(req.query.since) : null
  const earliestAllowed = new Date(now.getTime() - MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
  if (!since || isNaN(since.getTime()) || since < earliestAllowed) {
    since = earliestAllowed
  }

  const topicClause = '(Sweden OR Norway OR Denmark OR Finland OR Iceland OR Nordic OR Scandinavia)'
  const exclusionClause = Object.values(NORDIC_FIPS_CODES)
    .map((code) => `-sourcecountry:${code}`)
    .join(' ')
  const query = `${topicClause} ${exclusionClause} sourcelang:english`

  const params = new URLSearchParams({
    query,
    mode: 'ArtList',
    format: 'json',
    maxrecords: String(MAX_RECORDS),
    sort: 'DateDesc',
    startdatetime: toGdeltDateTime(since),
    enddatetime: toGdeltDateTime(now),
  })

  const url = `https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`

  try {
    const response = await fetchWithTimeout(
      url,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; nordic-dispatch/1.0)' } },
      FETCH_TIMEOUT_MS
    )
    const raw = await response.text()

    if (!response.ok) {
      console.error('GDELT non-OK response', response.status, raw.slice(0, 500), 'query was:', query)
      return res
        .status(200)
        .json(degraded(since, now, `GDELT returned status ${response.status}`, raw.slice(0, 300)))
    }

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch (parseErr) {
      console.error('GDELT returned non-JSON', raw.slice(0, 500))
      return res
        .status(200)
        .json(degraded(since, now, 'GDELT returned an unexpected response format', raw.slice(0, 300)))
    }

    const seen = new Set()
    const articles = (parsed.articles || [])
      .filter((a) => a.url && a.title)
      .filter((a) => {
        const key = a.title.trim().toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map((a) => ({
        title: a.title.trim(),
        url: a.url,
        domain: a.domain || '',
        sourceCountry: a.sourcecountry || '',
        language: a.language || '',
        seenAt: a.seendate || null,
      }))

    res.status(200).json({
      since: since.toISOString(),
      fetchedAt: now.toISOString(),
      count: articles.length,
      articles,
    })
  } catch (err) {
    console.error('GDELT fetch failed', err)
    res.status(200).json(degraded(since, now, `Fetch failed: ${err.message || err.name || 'unknown error'}`))
  }
}
