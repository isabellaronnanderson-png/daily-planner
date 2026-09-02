// /api/nordic-rss.js
// Pulls top recent headlines from two national outlets per Nordic country,
// and attaches an English machine translation of each headline.
//
// Translation uses Google's public (undocumented, keyless) translate
// endpoint. It's the same "no signup needed" trick many hobby projects use.
// It can occasionally rate-limit under heavy use — if that happens the
// headline just shows without a translation line rather than breaking.

import Parser from 'rss-parser'

const OUTLETS = [
  { country: 'Sweden', outlet: 'SVT Nyheter', url: 'https://www.svt.se/nyheter/rss.xml' },
  { country: 'Sweden', outlet: 'Dagens Nyheter', url: 'https://www.dn.se/rss/' },
  { country: 'Norway', outlet: 'NRK', url: 'https://www.nrk.no/toppsaker.rss' },
  { country: 'Norway', outlet: 'Aftenposten', url: 'https://www.aftenposten.no/rss/' },
  { country: 'Denmark', outlet: 'DR Nyheder', url: 'https://www.dr.dk/nyheder/service/feeds/senestenyt' },
  { country: 'Denmark', outlet: 'Politiken', url: 'https://politiken.dk/rss/senestenyt.rss' },
  { country: 'Finland', outlet: 'Yle Uutiset', url: 'https://feeds.yle.fi/uutiset/v1/recent.rss?publisherIds=YLE_UUTISET' },
  { country: 'Finland', outlet: 'Iltalehti', url: 'https://www.iltalehti.fi/rss/rss.xml' },
  { country: 'Iceland', outlet: 'RÚV', url: 'https://www.ruv.is/rss' },
  { country: 'Iceland', outlet: 'Vísir', url: 'https://www.visir.is/rss/allt' },
]

const MAX_LOOKBACK_DAYS = 14
const MAX_PER_OUTLET = 4
const FETCH_TIMEOUT_MS = 6000

const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; nordic-dispatch/1.0)' },
})

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function translateToEnglish(text) {
  if (!text) return null
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(
      text
    )}`
    const response = await fetchWithTimeout(url, {}, FETCH_TIMEOUT_MS)
    if (!response.ok) return null
    const data = await response.json()
    // data[0] is an array of [translatedChunk, originalChunk, ...] segments
    const translated = (data[0] || []).map((chunk) => chunk[0]).join('')
    // Don't bother showing a "translation" that's identical to the original
    // (happens for outlets that are already partly in English, e.g. brand names)
    if (!translated || translated.trim().toLowerCase() === text.trim().toLowerCase()) return null
    return translated
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  const now = new Date()
  let since = req.query.since ? new Date(req.query.since) : null
  const earliestAllowed = new Date(now.getTime() - MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
  if (!since || isNaN(since.getTime()) || since < earliestAllowed) {
    since = earliestAllowed
  }

  const results = await Promise.all(
    OUTLETS.map(async (outlet) => {
      try {
        const feed = await parser.parseURL(outlet.url)
        let items = (feed.items || [])
          .map((item) => ({
            title: (item.title || '').trim(),
            link: item.link,
            pubDate: item.pubDate || item.isoDate || null,
          }))
          .filter((item) => item.title && item.link)
          .filter((item) => {
            if (!item.pubDate) return true
            const d = new Date(item.pubDate)
            return isNaN(d.getTime()) || d >= since
          })
          .sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0))
          .slice(0, MAX_PER_OUTLET)

        items = await Promise.all(
          items.map(async (item) => ({
            ...item,
            translatedTitle: await translateToEnglish(item.title),
          }))
        )

        return { country: outlet.country, outlet: outlet.outlet, items, error: null }
      } catch (err) {
        console.error(`Feed failed for ${outlet.outlet} (${outlet.url})`, err.message || err)
        return { country: outlet.country, outlet: outlet.outlet, items: [], error: 'Feed unavailable right now' }
      }
    })
  )

  res.status(200).json({
    since: since.toISOString(),
    fetchedAt: now.toISOString(),
    outlets: results,
  })
}
