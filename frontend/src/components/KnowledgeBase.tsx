import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Book, Database, Search, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import './KnowledgeBase.css';

function KnowledgeBase() {
    const stats = useQuery(api.knowledge.getKnowledgeStats);
    const tools = useQuery(api.knowledge.getAvailableTools);
    const [selectedTool, setSelectedTool] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const toolDocs = useQuery(
        api.knowledge.getKnowledgeByTool,
        selectedTool ? { tool_name: selectedTool, limit: 20 } : 'skip'
    );

    const searchResults = useQuery(
        api.knowledge.searchKnowledge,
        searchQuery.length >= 3
            ? { query: searchQuery, tool_name: selectedTool || undefined, limit: 10 }
            : 'skip'
    );

    if (stats === undefined || tools === undefined) {
        return (
            <div className="knowledge-base">
                <div className="loading-state">
                    <div className="loading-spinner animate-spin"></div>
                    <p>Loading knowledge base...</p>
                </div>
            </div>
        );
    }

    const displayDocs = searchQuery.length >= 3 ? searchResults : toolDocs;

    return (
        <div className="knowledge-base">
            {/* Header */}
            <div className="kb-header">
                <div className="header-content">
                    <h2>
                        <Book size={28} />
                        Tool Knowledge Base
                    </h2>
                    <p className="text-secondary">
                        Documentation from {stats.total_tools} tools • {stats.total_documents} chunks
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="kb-stats">
                <div className="stat-card card glass">
                    <div className="stat-icon">
                        <Database size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total_documents}</div>
                        <div className="stat-label">Total Chunks</div>
                    </div>
                </div>

                <div className="stat-card card glass">
                    <div className="stat-icon">
                        <Book size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total_tools}</div>
                        <div className="stat-label">Tools</div>
                    </div>
                </div>

                <div className="stat-card card glass">
                    <div className="stat-icon">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">
                            {Object.keys(stats.by_channel).length}
                        </div>
                        <div className="stat-label">Channels</div>
                    </div>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="kb-controls card glass">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search documentation... (min 3 characters)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="tool-filter">
                    <label>Filter by tool:</label>
                    <select
                        value={selectedTool || ''}
                        onChange={(e) => setSelectedTool(e.target.value || null)}
                        className="tool-select"
                    >
                        <option value="">All Tools</option>
                        {tools.map((tool) => (
                            <option key={tool} value={tool}>
                                {tool} ({stats.by_tool[tool]} chunks)
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Results */}
            <div className="kb-results">
                {displayDocs === undefined ? (
                    <div className="loading-state">
                        <div className="loading-spinner animate-spin"></div>
                        <p>Loading...</p>
                    </div>
                ) : displayDocs && displayDocs.length > 0 ? (
                    <>
                        <div className="results-header">
                            <h3>
                                {searchQuery.length >= 3
                                    ? `Search Results (${displayDocs.length})`
                                    : `${selectedTool || 'All'} Documentation (${displayDocs.length})`}
                            </h3>
                        </div>
                        <div className="results-grid">
                            {displayDocs.map((doc) => (
                                <div key={doc._id} className="doc-card card glass-hover">
                                    <div className="doc-header">
                                        <div className="doc-meta">
                                            <span className="badge badge-primary">{doc.tool_name}</span>
                                            <span className="badge badge-secondary">{doc.source_type}</span>
                                            <span className="badge badge-info">{doc.channel}</span>
                                        </div>
                                        <div className="doc-chunk-info">
                                            Chunk {doc.chunk_index + 1}
                                        </div>
                                    </div>

                                    {doc.section && (
                                        <div className="doc-section">
                                            <strong>Section:</strong> {doc.section}
                                        </div>
                                    )}

                                    <div className="doc-content">
                                        {doc.content.substring(0, 300)}
                                        {doc.content.length > 300 && '...'}
                                    </div>

                                    <div className="doc-footer">
                                        <div className="doc-stats">
                                            <span>{doc.token_count || 0} tokens</span>
                                            <span>•</span>
                                            <span>{doc.content.length} chars</span>
                                        </div>
                                        <a
                                            href={doc.source_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="doc-link"
                                        >
                                            View Source →
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="empty-state card glass">
                        <div className="empty-icon">
                            <Search size={48} />
                        </div>
                        <h3>No Results Found</h3>
                        <p className="text-secondary">
                            {searchQuery.length >= 3
                                ? `No documentation found for "${searchQuery}"`
                                : selectedTool
                                    ? `No documentation available for ${selectedTool}`
                                    : 'Select a tool or search to view documentation'}
                        </p>
                    </div>
                )}
            </div>

            {/* Tools Breakdown */}
            <div className="kb-breakdown card glass">
                <h3>Knowledge by Tool</h3>
                <div className="breakdown-list">
                    {Object.entries(stats.by_tool)
                        .sort(([, a], [, b]) => b - a)
                        .map(([tool, count]) => (
                            <div key={tool} className="breakdown-item">
                                <div className="breakdown-label">
                                    <Book size={16} />
                                    {tool}
                                </div>
                                <div className="breakdown-bar">
                                    <div
                                        className="breakdown-fill"
                                        style={{
                                            width: `${(count / stats.total_documents) * 100}%`,
                                        }}
                                    ></div>
                                </div>
                                <div className="breakdown-value">{count} chunks</div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}

export default KnowledgeBase;
