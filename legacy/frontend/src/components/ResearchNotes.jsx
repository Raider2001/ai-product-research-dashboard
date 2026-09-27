import { useEffect, useState } from 'react';

function ResearchNotes({ apiBase, products }) {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        product_name: '',
        title: '',
        note: '',
        priority: 'medium',
        tags: ''
    });

    useEffect(() => {
        loadNotes();
    }, [apiBase]);

    const loadNotes = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${apiBase}/research-notes`);
            const data = await response.json();
            setNotes(data.notes || []);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            setSubmitting(true);
            const response = await fetch(`${apiBase}/research-notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            if (!response.ok) {
                const payload = await response.json();
                throw new Error(payload.error || 'Could not save note');
            }

            const created = await response.json();
            setNotes((current) => [created, ...current]);
            setForm({ product_name: '', title: '', note: '', priority: 'medium', tags: '' });
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="research-notes-section">
            <div className="research-notes-header">
                <h3>Research Notes</h3>
                <p>Track competitor checks, pricing ideas, and consumer behavior signals.</p>
            </div>

            <form className="research-notes-form" onSubmit={handleSubmit}>
                <input
                    list="product-names"
                    name="product_name"
                    value={form.product_name}
                    onChange={handleChange}
                    placeholder="Product name"
                    className="note-input"
                />
                <datalist id="product-names">
                    {products.map((product) => (
                        <option key={product.product_id} value={product.name} />
                    ))}
                </datalist>
                <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="Note title"
                    className="note-input"
                    required
                />
                <select name="priority" value={form.priority} onChange={handleChange} className="note-input">
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                </select>
                <input
                    name="tags"
                    value={form.tags}
                    onChange={handleChange}
                    placeholder="Tags, comma separated"
                    className="note-input"
                />
                <textarea
                    name="note"
                    value={form.note}
                    onChange={handleChange}
                    placeholder="Record shipping concerns, supplier notes, or competitor findings..."
                    className="note-textarea"
                    required
                />
                <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Research Note'}
                </button>
            </form>

            {error && <p className="note-error">{error}</p>}
            {loading ? <p className="loading">Loading notes...</p> : null}

            <div className="research-notes-list">
                {notes.map((entry) => (
                    <article key={entry.id} className="research-note-card">
                        <div className="research-note-topline">
                            <strong>{entry.title}</strong>
                            <span className={`note-priority note-priority-${entry.priority}`}>{entry.priority}</span>
                        </div>
                        {entry.product_name ? <div className="research-note-product">{entry.product_name}</div> : null}
                        <p>{entry.note}</p>
                        {entry.tags?.length ? (
                            <div className="research-note-tags">
                                {entry.tags.map((tag) => (
                                    <span key={tag} className="note-tag">{tag}</span>
                                ))}
                            </div>
                        ) : null}
                    </article>
                ))}
            </div>
        </section>
    );
}

export default ResearchNotes;