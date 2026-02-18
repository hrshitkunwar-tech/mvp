import { useState, useEffect } from 'react'
import { useAction, useQuery } from "convex/react";
import { type FunctionReference, makeFunctionReference } from "convex/server";
import { Info, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react'

const api = {
  ingest: {
    smartSearch: makeFunctionReference<"action">("ingest:smartSearch"),
    vectorSearch: makeFunctionReference<"action">("ingest:vectorSearch"),
  },
  scrapedata: {
    getById: makeFunctionReference<"query">("scrapedata:getById"),
  },
  enrich: {
    getProcedures: makeFunctionReference<"query">("enrich:getProcedures"),
  },
};

function App() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [toolInDb, setToolInDb] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const smartSearch = useAction(api.ingest.smartSearch)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 600)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (debouncedQuery.length > 3) {
      handleSearch(debouncedQuery)
    } else {
      setResults([])
      setAnalysis(null)
      setToolInDb(null)
      setError(null)
    }
  }, [debouncedQuery])

  const handleSearch = async (q: string) => {
    setIsSearching(true)
    setError(null)
    try {
      const data = await smartSearch({ query: q, limit: 12 })
      setResults(data.results || [])
      setAnalysis(data.analysis || null)
      setToolInDb(data.tool_in_db ?? true)
    } catch (err: any) {
      setError(err?.message || "Search failed. Please try again.")
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const showToolNotFound = analysis?.tool_name && toolInDb === false

  return (
    <div className="app-container">
      <header>
        <h1>Tool Navigator AI</h1>
        <p>Semantic search across 19,000+ AI and SaaS tools</p>
      </header>

      <div className="search-section">
        <div className="search-box-wrapper">
          <input
            type="text"
            className="search-box"
            placeholder="e.g. 'how to manage user permissions in Slack' or 'Figma design system'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Analysis badges */}
        {analysis && (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
            {analysis.tool_name && (
              <span style={{
                fontSize: '0.78rem', padding: '4px 12px', borderRadius: '20px',
                background: toolInDb ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)',
                color: toolInDb ? '#60a5fa' : '#f87171',
                border: `1px solid ${toolInDb ? 'rgba(59,130,246,0.3)' : 'rgba(239,68,68,0.3)'}`,
                display: 'flex', alignItems: 'center', gap: '5px'
              }}>
                {toolInDb
                  ? <CheckCircle size={12} />
                  : <AlertCircle size={12} />
                }
                {analysis.tool_name}
              </span>
            )}
            {analysis.intent && (
              <span style={{ fontSize: '0.78rem', background: 'rgba(139,92,246,0.15)', padding: '4px 12px', borderRadius: '20px', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
                🎯 {analysis.intent}
              </span>
            )}
            {analysis.category && (
              <span style={{ fontSize: '0.78rem', background: 'rgba(16,185,129,0.15)', padding: '4px 12px', borderRadius: '20px', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', textTransform: 'capitalize' }}>
                📂 {analysis.category}
              </span>
            )}
          </div>
        )}

        {/* Tool not in DB banner */}
        {showToolNotFound && (
          <div style={{
            marginTop: '1rem', padding: '12px 20px', borderRadius: '10px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            color: '#fca5a5', fontSize: '0.85rem', textAlign: 'center', maxWidth: '600px', margin: '1rem auto 0'
          }}>
            <AlertCircle size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            <strong>{analysis.tool_name}</strong> is not yet in our knowledge base.
            Showing semantically related results instead.
          </div>
        )}
      </div>

      <main>
        {isSearching ? (
          <div className="loading-container">
            <span className="loader"></span>
          </div>
        ) : error ? (
          <div className="empty-state" style={{ color: '#f87171' }}>
            ⚠️ {error}
          </div>
        ) : results.length > 0 ? (
          <div className="results-grid">
            {results.map((res, i) => (
              <ToolCard key={`${res.tool_name}-${i}`} data={res} />
            ))}
          </div>
        ) : query.length > 3 && !isSearching ? (
          <div className="empty-state">
            {analysis?.tool_name && toolInDb === false ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔄</div>
                <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.5rem' }}>
                  {analysis.tool_name} is being ingested
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto' }}>
                  This tool hasn't been added to our knowledge base yet. Try searching for Slack, Notion, Figma, or GitHub — or check back soon.
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔍</div>
                <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '0.5rem' }}>
                  No results above confidence threshold
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                  Try rephrasing — e.g. "how to invite users in Slack" or "Notion database setup"
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            Start typing to search the knowledge base...
          </div>
        )}
      </main>
    </div>
  )
}

function ToolCard({ data }: { data: any }) {
  const doc = useQuery(api.scrapedata.getById, data.scrapedataId ? { id: data.scrapedataId } : "skip")
  const procedures = useQuery(api.enrich.getProcedures, data.tool_name ? { tool_name: data.tool_name } : "skip")

  // Clean snippet — remove any residual markdown
  const cleanSnippet = (text: string) => {
    if (!text) return ''
    return text
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[*_`#>|]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 280)
  }

  const snippet = cleanSnippet(data.text || '')
  const score = Math.round((data.score || 0) * 100)
  const scoreColor = score >= 60 ? '#34d399' : score >= 40 ? '#fbbf24' : '#9ca3af'

  return (
    <div className="tool-card">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: '#e2e8f0' }}>{data.tool_name}</h3>
        <span className="score-badge" style={{ background: `${scoreColor}20`, color: scoreColor, border: `1px solid ${scoreColor}40` }}>
          {score}% match
        </span>
      </div>

      {/* Category tag */}
      {doc?.category && (
        <span style={{ fontSize: '0.65rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', display: 'block' }}>
          {doc.category}
        </span>
      )}

      {/* Clean text snippet */}
      {snippet && (
        <p className="snippet" style={{ fontSize: '0.85rem', lineHeight: '1.5', color: '#9ca3af', margin: '0 0 0.75rem' }}>
          {snippet}{snippet.length === 280 ? '…' : ''}
        </p>
      )}

      {/* Procedures */}
      {procedures && procedures.length > 0 && (
        <div style={{ marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#6366f1', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Info size={11} /> How-To Guides
          </div>
          {procedures.slice(0, 3).map((p: any, i: number) => (
            <div key={i} style={{ marginBottom: '6px', fontSize: '0.8rem' }}>
              <span style={{ color: '#c4b5fd', fontWeight: 500 }}>→ {p.name}</span>
              {p.description && (
                <span style={{ color: '#6b7280', marginLeft: '4px' }}>— {p.description.slice(0, 80)}{p.description.length > 80 ? '…' : ''}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        {doc?.url ? (
          <a href={doc.url} target="_blank" rel="noopener noreferrer"
            style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            Visit Site <ExternalLink size={11} />
          </a>
        ) : <span />}
      </div>
    </div>
  )
}

export default App
