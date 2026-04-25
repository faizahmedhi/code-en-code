import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import './index.css'

const CATEGORIES = ['Product', 'Support', 'Speed', 'UX', 'Value']
const STORAGE_KEY = 'feedback-portal-entries'

// ─── Helpers ──────────────────────────────────────────────
function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

function formatTime(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

function truncate(str, max = 120) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

// ─── Header ───────────────────────────────────────────────
function Header() {
  return (
    <header className="header-bar">
      <h1 className="header-title">Feedback portal</h1>
      <div className="live-badge" aria-label="Live indicator">
        <span className="live-dot" />
        <span className="live-text">live</span>
      </div>
    </header>
  )
}

// ─── Metric Card ──────────────────────────────────────────
function MetricCard({ label, value, sub, valueClass }) {
  return (
    <div className="metric-card">
      <span className="metric-label">{label}</span>
      <span className={`metric-value ${valueClass || ''}`}>{value}</span>
      <span className="metric-sub">{sub}</span>
    </div>
  )
}

// ─── Metrics Row ──────────────────────────────────────────
function MetricsRow({ entries }) {
  const stats = useMemo(() => {
    const count = entries.length
    if (count === 0) {
      return {
        avg: '—',
        avgSub: 'no data yet',
        total: '0',
        topStars: '—',
        topSub: 'no data yet',
        satisfaction: '—',
        satSub: '4–5 star rate',
      }
    }

    const sum = entries.reduce((a, e) => a + e.rating, 0)
    const avg = (sum / count).toFixed(1)

    // Most common rating
    const freq = [0, 0, 0, 0, 0]
    entries.forEach((e) => freq[e.rating - 1]++)
    let maxFreq = 0
    let topRating = 5
    freq.forEach((f, i) => {
      if (f > maxFreq) {
        maxFreq = f
        topRating = i + 1
      }
    })

    const satisfied = entries.filter((e) => e.rating >= 4).length
    const satPct = Math.round((satisfied / count) * 100)

    return {
      avg,
      avgSub: `from ${count} review${count !== 1 ? 's' : ''}`,
      total: String(count),
      topStars: '★'.repeat(topRating),
      topSub: `${topRating}-star most common`,
      satisfaction: `${satPct}%`,
      satSub: '4–5 star rate',
    }
  }, [entries])

  return (
    <div className="metrics-row">
      <MetricCard label="Average rating" value={stats.avg} sub={stats.avgSub} />
      <MetricCard label="Total submissions" value={stats.total} sub="submissions" />
      <MetricCard label="Top rating" value={stats.topStars} sub={stats.topSub} valueClass="stars-value" />
      <MetricCard label="Satisfaction rate" value={stats.satisfaction} sub={stats.satSub} />
    </div>
  )
}

// ─── Star Selector ────────────────────────────────────────
function StarSelector({ rating, setRating }) {
  return (
    <div className="star-row" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star-btn ${n <= rating ? 'filled' : ''}`}
          onClick={() => setRating(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          role="radio"
          aria-checked={n <= rating}
        >
          {n <= rating ? '★' : '☆'}
        </button>
      ))}
    </div>
  )
}

// ─── Category Pills ───────────────────────────────────────
function CategoryPills({ category, setCategory }) {
  return (
    <div className="pill-row" role="radiogroup" aria-label="Category">
      {CATEGORIES.map((c) => (
        <button
          key={c}
          type="button"
          className={`pill ${category === c ? 'active' : ''}`}
          onClick={() => setCategory(c)}
          aria-label={`Category: ${c}`}
          role="radio"
          aria-checked={category === c}
        >
          {c}
        </button>
      ))}
    </div>
  )
}

// ─── Submit Form ──────────────────────────────────────────
function SubmitForm({ onSubmit }) {
  const [rating, setRating] = useState(0)
  const [category, setCategory] = useState('Product')
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = useCallback(() => {
    if (rating === 0) return
    onSubmit({ rating, category, comment: comment.trim(), timestamp: Date.now() })
    setRating(0)
    setComment('')
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 1500)
  }, [rating, category, comment, onSubmit])

  return (
    <div className="card" id="submit-form">
      <div className="card-label">Submit your rating</div>
      <StarSelector rating={rating} setRating={setRating} />
      <CategoryPills category={category} setCategory={setCategory} />
      <textarea
        className="comment-box"
        rows={3}
        placeholder="Optional comment…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        aria-label="Feedback comment"
      />
      <button
        className={`submit-btn ${submitted ? 'success' : ''}`}
        disabled={rating === 0 && !submitted}
        onClick={handleSubmit}
        aria-label="Submit feedback"
        id="submit-button"
      >
        {submitted ? 'Submitted! ✓' : 'Submit'}
      </button>
    </div>
  )
}

// ─── Distribution Chart ──────────────────────────────────
function DistributionChart({ entries }) {
  const dist = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]
    entries.forEach((e) => counts[e.rating - 1]++)
    const max = Math.max(...counts, 1)
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: counts[star - 1],
      pct: (counts[star - 1] / max) * 100,
    }))
  }, [entries])

  return (
    <div className="card" id="distribution-chart">
      <div className="card-label">Rating distribution</div>
      <div className="dist-rows">
        {dist.map((d) => (
          <div className="dist-row" key={d.star}>
            <span className="dist-star-label">{d.star}</span>
            <div className="dist-track">
              <div
                className="dist-fill"
                data-star={d.star}
                style={{ width: `${d.pct}%` }}
              />
            </div>
            <span className="dist-count">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── AI Insight ───────────────────────────────────────────
function AIInsight({ entries }) {
  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const lastFetchedAt = useRef(0)

  useEffect(() => {
    const count = entries.length
    if (count < 3) {
      setInsight('')
      setError(false)
      lastFetchedAt.current = 0
      return
    }

    // Fetch at every multiple of 3
    const bucket = Math.floor(count / 3) * 3
    if (bucket === lastFetchedAt.current) return
    lastFetchedAt.current = bucket

    const feedbackList = entries
      .slice(0, 20)
      .map((e) => `${e.rating}/5 (${e.category}): ${e.comment || 'No comment'}`)
      .join('\n')

    const prompt = `Here are recent user feedback ratings:\n${feedbackList}\n\nGive a concise 2-sentence insight about sentiment patterns and one specific actionable improvement. Be direct. No preamble or sign-off.`

    setLoading(true)
    setError(false)

    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('API error')
        return res.json()
      })
      .then((data) => {
        const text = data?.content?.[0]?.text || ''
        setInsight(text)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [entries])

  const renderBody = () => {
    if (entries.length < 3) {
      return <p className="ai-placeholder">Submit a few ratings to generate an insight.</p>
    }
    if (loading) {
      return (
        <div className="shimmer-block">
          <div className="shimmer-line" />
          <div className="shimmer-line" />
        </div>
      )
    }
    if (error) {
      return <p className="ai-placeholder">AI insight unavailable right now.</p>
    }
    return <p className="ai-text">{insight}</p>
  }

  return (
    <div className="card" id="ai-insight">
      <div className="ai-label">AI insight</div>
      {renderBody()}
    </div>
  )
}

// ─── Feed Entry ───────────────────────────────────────────
function FeedEntry({ entry }) {
  const stars = '★'.repeat(entry.rating) + '☆'.repeat(5 - entry.rating)
  return (
    <div className="feed-entry">
      <div className="feed-top">
        <span className="feed-stars" aria-label={`${entry.rating} stars`}>{stars}</span>
        <span className="feed-category">{entry.category}</span>
        <span className="feed-time">{formatTime(entry.timestamp)}</span>
      </div>
      {entry.comment && (
        <div className="feed-comment">{truncate(entry.comment)}</div>
      )}
    </div>
  )
}

// ─── Recent Submissions ──────────────────────────────────
function RecentSubmissions({ entries }) {
  const visible = entries.slice(0, 20)

  return (
    <div className="card" id="recent-submissions">
      <div className="card-label">Recent submissions</div>
      {visible.length === 0 ? (
        <p className="feed-empty">No submissions yet — be the first!</p>
      ) : (
        <div className="feed-scroll">
          {visible.map((e, i) => (
            <FeedEntry key={`${e.timestamp}-${i}`} entry={e} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────
export default function App() {
  const [entries, setEntries] = useState(() => loadEntries())

  useEffect(() => {
    saveEntries(entries)
  }, [entries])

  const handleSubmit = useCallback((entry) => {
    setEntries((prev) => [entry, ...prev])
  }, [])

  return (
    <main className="portal-wrapper">
      <Header />
      <MetricsRow entries={entries} />
      <section className="two-col-row">
        <SubmitForm onSubmit={handleSubmit} />
        <DistributionChart entries={entries} />
      </section>
      <AIInsight entries={entries} />
      <RecentSubmissions entries={entries} />
    </main>
  )
}
