import React, { useState } from 'react';

const ProductFilter = ({ products, onFilter }) => {
    const [priceRange, setPriceRange] = useState([0, 500]);
    const [scoreRange, setScoreRange] = useState([0, 100]);
    const [selectedCollections, setSelectedCollections] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

    const getCollections = () => {
        if (!products || products.length === 0) return [];
        return Array.from(new Set(products.map((product) => product.collection || product.category)));
    };

    const applyFilters = (price, score, collections) => {
        if (!products) return;

        const filtered = products.filter((product) => {
            const productPrice = parseFloat(product.product_price ?? product.price) || 0;
            const productScore = parseFloat(product.overall_score ?? product.market_score) || 0;
            const collection = product.collection || product.category;
            const priceMatch = productPrice >= price[0] && productPrice <= price[1];
            const scoreMatch = productScore >= score[0] && productScore <= score[1];
            const collectionMatch = collections.length === 0 || collections.includes(collection);
            return priceMatch && scoreMatch && collectionMatch;
        });

        onFilter(filtered);
    };

    const handlePriceChange = (event, index) => {
        const next = [...priceRange];
        next[index] = parseFloat(event.target.value);
        setPriceRange(next);
        applyFilters(next, scoreRange, selectedCollections);
    };

    const handleScoreChange = (event, index) => {
        const next = [...scoreRange];
        next[index] = parseFloat(event.target.value);
        setScoreRange(next);
        applyFilters(priceRange, next, selectedCollections);
    };

    const handleCollectionChange = (collection) => {
        const updated = selectedCollections.includes(collection)
            ? selectedCollections.filter((item) => item !== collection)
            : [...selectedCollections, collection];
        setSelectedCollections(updated);
        applyFilters(priceRange, scoreRange, updated);
    };

    const handleReset = () => {
        setPriceRange([0, 500]);
        setScoreRange([0, 100]);
        setSelectedCollections([]);
        onFilter(products);
    };

    const collections = getCollections();
    const active = selectedCollections.length > 0 || priceRange[0] > 0 || priceRange[1] < 500 || scoreRange[0] > 0 || scoreRange[1] < 100;

    return (
        <div className="filter-panel">
            <div className="filter-header">
                <button className="filter-toggle" onClick={() => setIsOpen(!isOpen)}>
                    Filters {active ? '(on)' : ''}
                </button>
                {active && (
                    <button className="filter-reset" onClick={handleReset}>Clear</button>
                )}
            </div>

            {isOpen && (
                <div className="filter-content">
                    <div className="filter-group">
                        <label className="filter-label">Retail price</label>
                        <div className="range-inputs">
                            <input type="number" min="0" max="500" value={priceRange[0]} onChange={(event) => handlePriceChange(event, 0)} className="range-input" />
                            <span>-</span>
                            <input type="number" min="0" max="500" value={priceRange[1]} onChange={(event) => handlePriceChange(event, 1)} className="range-input" />
                        </div>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Overall score</label>
                        <div className="range-inputs">
                            <input type="number" min="0" max="100" value={scoreRange[0]} onChange={(event) => handleScoreChange(event, 0)} className="range-input" />
                            <span>-</span>
                            <input type="number" min="0" max="100" value={scoreRange[1]} onChange={(event) => handleScoreChange(event, 1)} className="range-input" />
                        </div>
                    </div>

                    {collections.length > 0 && (
                        <div className="filter-group">
                            <label className="filter-label">Collections</label>
                            <div className="checkbox-group">
                                {collections.map((collection) => (
                                    <label key={collection} className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={selectedCollections.includes(collection)}
                                            onChange={() => handleCollectionChange(collection)}
                                            className="checkbox-input"
                                        />
                                        <span>{collection}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProductFilter;
