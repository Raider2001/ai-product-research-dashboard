import { useState } from 'react';

function AIChat() {
    const [messages, setMessages] = useState([
        {
            id: 1,
            type: 'bot',
            text: 'BizChat is set up for a 30-SKU organization store: Home, Desk & Office, Kitchen. I grade fit, profit after Shopify fees, shipping speed, competition, and photo quality. Ask me to rank products, check a margin, or review the launch catalog.'
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = { id: Date.now(), type: 'user', text: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const text = input.toLowerCase();
            let endpoint = '/agent/research';
            let payload = { query: input };

            if (text.includes('supplier')) {
                endpoint = '/agent/suppliers';
                payload = { category: 'Home Organization' };
            } else if (text.includes('profit') || text.includes('margin')) {
                const numbers = input.match(/\$?\d+\.?\d*/g) || [];
                endpoint = '/agent/profit';
                payload = {
                    product_name: input.slice(0, 80),
                    cost: parseFloat(numbers[0]) || 14,
                    market_price: parseFloat(numbers[1]) || 39.99,
                    shipping: parseFloat(numbers[2]) || 5,
                    advertising: parseFloat(numbers[3]) || 0
                };
            } else if (text.includes('keyword')) {
                endpoint = '/agent/keywords';
                payload = {
                    product_name: 'desk organizer',
                    category: 'Desk & Office'
                };
            } else if (text.includes('score') || text.includes('opportunit')) {
                endpoint = '/agent/opportunities';
                payload = {};
            }

            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                const textResponse = data.response
                    || (Array.isArray(data.opportunities)
                        ? data.opportunities.slice(0, 8).map((item) => `${item.grade || ''} ${item.opportunity_score} — ${item.name}`).join('\n')
                        : data.error)
                    || 'No response.';
                setMessages((prev) => [...prev, { id: Date.now() + 1, type: 'bot', text: textResponse }]);
            } else {
                setMessages((prev) => [...prev, {
                    id: Date.now() + 1,
                    type: 'bot',
                    text: 'Could not reach the research API. Start the Node server on port 8000.'
                }]);
            }
        } catch (error) {
            setMessages((prev) => [...prev, { id: Date.now() + 1, type: 'bot', text: `Error: ${error.message}` }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="ai-chat-section">
            <div className="chat-container">
                <h2>BizChat</h2>
                <div className="chat-messages">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`message message-${msg.type}`}>
                            <div className="message-content">{msg.text}</div>
                        </div>
                    ))}
                    {loading && (
                        <div className="message message-bot">
                            <div className="message-content typing">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="chat-input-area">
                    <input
                        type="text"
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyPress={(event) => event.key === 'Enter' && handleSend()}
                        placeholder="Ask about niche fit, launch catalog, or margin..."
                        disabled={loading}
                        className="chat-input"
                    />
                    <button onClick={handleSend} disabled={loading || !input.trim()} className="chat-send-btn">
                        {loading ? '...' : 'Send'}
                    </button>
                </div>

                <div className="chat-hints">
                    <p>Try:</p>
                    <ul>
                        <li>Which products should fill the launch catalog?</li>
                        <li>Research bamboo desk organizer</li>
                        <li>Calculate profit: cost $14, price $39.99, shipping $5</li>
                        <li>What suppliers ship from the US?</li>
                    </ul>
                </div>
            </div>
        </section>
    );
}

export default AIChat;
