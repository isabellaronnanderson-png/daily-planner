import { useEffect, useMemo, useState } from 'react'

const LAST_REFRESH_KEY = 'nordicDispatch.lastRefreshAt'
const LAST_REFRESH_DAY_KEY = 'nordicDispatch.lastRefreshDay'
const MAX_LOOKBACK_DAYS = 14

function todayString() {
  return new Date().toDateString()
}

function formatTimestamp(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDateline() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function clampSince(iso) {
  const earliest = new Date(Date.now() - MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
  if (!iso) return earliest.toISOString()
  const d = new Date(iso)
  if (isNaN(d.getTime()) || d < earliest) return earliest.toISOString()
  return d.toISOString()
}

function groupByCountry(outlets) {
  const order = []
  const map = {}
  for (const group of outlets) {
    if (!map[group.country]) {
      map[group.country] = []
      order.push(group.country)
    }
    map[group.country].push(group)
  }
  return order.map((country) => ({ country, outlets: map[country] }))
}

export default function App() {
  const [lastRefresh, setLastRefresh] = useState(() => localStorage.getItem(LAST_REFRESH_KEY))
  const [refreshedToday, setRefreshedToday] = useState(
    () => localStorage.getItem(LAST_REFRESH_DAY_KEY) === todayString()
  )
  const [abroad, setAbroad] = useState(null)
  const [home, setHome] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasEverLoaded, setHasEverLoaded] = useState(false)

  async function runRefresh() {
    setLoading(true)
    setError(null)
    const since = clampSince(lastRefresh)

    try {
      const [gdeltRes, rssRes] = await Promise.all([
        fetch(`/api/gdelt?since=${encodeURIComponent(since)}`),
        fetch(`/api/nordic-rss?since=${encodeURIComponent(since)}`),
      ])

      if (!gdeltRes.ok) throw new Error('The app itself is unreachable right now — try again shortly.')
      if (!rssRes.ok) throw new Error('The app itself is unreachable right now — try again shortly.')

      const gdeltData = await gdeltRes.json()
      const rssData = await rssRes.json()

      setAbroad({
        items: gdeltData.articles || [],
        error: gdeltData.error || null,
        debug: gdeltData.debug || null,
      })
      setHome(rssData.outlets || [])

      const now = new Date().toISOString()
      localStorage.setItem(LAST_REFRESH_KEY, now)
      localStorage.setItem(LAST_REFRESH_DAY_KEY, todayString())
      setLastRefresh(now)
      setRefreshedToday(true)
      setHasEverLoaded(true)
    } catch (err) {
      setError(err.message || "Something went wrong fetching today's dispatch.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!lastRefresh) {
      runRefresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const homeByCountry = useMemo(() => (home ? groupByCountry(home) : null), [home])
  const canRefresh = !refreshedToday && !loading

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead-rule thick" />
        <h1>Nordic Dispatch</h1>
        <div className="masthead-rule thin" />
        <div className="dateline">
          <span>{formatDateline()}</span>
          <span className="dateline-sep">&middot;</span>
          <span>Headlines only, straight from the source</span>
        </div>
      </header>

      <div className="controls">
        <div className="board-meta">
          <span className="meta-label">Last checked</span>
          <span className="meta-value">
            {lastRefresh ? formatTimestamp(lastRefresh) : 'never \u2014 fetching now'}
          </span>
        </div>
        <button className="refresh-btn" onClick={runRefresh} disabled={!canRefresh}>
          {loading ? 'Checking\u2026' : refreshedToday ? 'Checked today' : 'Check for news'}
        </button>
        {refreshedToday && !loading && (
          <p className="refresh-note">Come back tomorrow for what's new since {formatTimestamp(lastRefresh)}.</p>
        )}
        {error && <p className="error-note">{error}</p>}
      </div>

      {!hasEverLoaded && loading && <p className="loading-note">Fetching the first dispatch\u2026</p>}

      {hasEverLoaded && (
        <>
          <section className="section">
            <div className="section-label"><span>Abroad</span></div>
            {abroad && abroad.error && (
              <p className="empty-note">
                {abroad.error}
                {abroad.debug && <span className="debug-text"> — {abroad.debug}</span>}
              </p>
            )}
            {abroad && !abroad.error && abroad.items.length === 0 && (
              <p className="empty-note">No new international coverage of the Nordics since your last check.</p>
            )}
            <ul className="dispatch-list">
              {abroad &&
                abroad.items.map((a, i) => (
                  <li key={i} className={`dispatch-item${i === 0 ? ' lead' : ''}`}>
                    <a href={a.url} target="_blank" rel="noopener noreferrer">
                      {a.title}
                    </a>
                    <span className="item-meta">
                      {a.domain}
                      {a.sourceCountry ? ` \u00b7 ${a.sourceCountry}` : ''}
                    </span>
                  </li>
                ))}
            </ul>
          </section>

          <section className="section">
            <div className="section-label home"><span>At Home</span></div>
            <div className="country-grid">
              {homeByCountry &&
                homeByCountry.map(({ country, outlets }) => (
                  <div className="country-column" key={country}>
                    <h3 className="country-name">{country}</h3>
                    {outlets.map((group) => (
                      <div className="outlet-group" key={group.outlet}>
                        <h4 className="outlet-name">{group.outlet}</h4>
                        {group.error && <p className="empty-note">{group.error}</p>}
                        {!group.error && group.items.length === 0 && (
                          <p className="empty-note">Nothing new since your last check.</p>
                        )}
                        <ul className="dispatch-list">
                          {group.items.map((item, i) => (
                            <li key={i} className={`dispatch-item${i === 0 ? ' lead' : ''}`}>
                              <a href={item.link} target="_blank" rel="noopener noreferrer">
                                {item.title}
                              </a>
                              {item.translatedTitle && (
                                <span className="translation">{item.translatedTitle}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
