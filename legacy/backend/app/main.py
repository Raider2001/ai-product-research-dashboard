import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from app.services.data_loader import data_loader
from app.services.ai_service import ai_service
from pydantic import BaseModel

app = FastAPI(title="AI Product Research Dashboard API")

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== Health Check ====================
@app.get("/health")
def health_check():
    return {"status": "ok"}


# ==================== Product Endpoints ====================
@app.get("/api/products")
def get_products(skip: int = Query(0, ge=0), limit: int = Query(10, ge=1, le=100)):
    """Get paginated list of products"""
    return data_loader.get_products(skip=skip, limit=limit)


@app.get("/api/products/{product_id}")
def get_product(product_id: int):
    """Get a specific product by ID"""
    product = data_loader.get_product_by_id(product_id)
    if not product:
        return {"error": "Product not found"}
    return product


@app.get("/api/products/search/")
def search_products(q: str = Query(..., min_length=1)):
    """Search products by name"""
    results = data_loader.search_products(q)
    return {"query": q, "results": results, "count": len(results)}


# ==================== Supplier Endpoints ====================
@app.get("/api/suppliers")
def get_suppliers():
    """Get all suppliers"""
    return data_loader.get_suppliers()


# ==================== Analytics Endpoints ====================
@app.get("/api/analytics")
def get_analytics():
    """Get product analytics and metrics"""
    return data_loader.get_analytics()


# ==================== AI Agent Endpoints ====================
class ResearchQuery(BaseModel):
    query: str


class SupplierQuery(BaseModel):
    category: str


class ProfitQuery(BaseModel):
    product_name: str
    cost: float
    market_price: float


class KeywordQuery(BaseModel):
    product_name: str
    category: str


@app.post("/api/agent/research")
def research_products(req: ResearchQuery):
    """AI agent: Research products based on query"""
    result = ai_service.research_products(req.query)
    return result


@app.post("/api/agent/suppliers")
def analyze_suppliers(req: SupplierQuery):
    """AI agent: Analyze suppliers for a category"""
    result = ai_service.analyze_suppliers(req.category)
    return result


@app.post("/api/agent/profit")
def calculate_profit(req: ProfitQuery):
    """AI agent: Calculate profit margins"""
    result = ai_service.calculate_profit_margin(req.product_name, req.cost, req.market_price)
    return result


@app.post("/api/agent/keywords")
def get_keywords(req: KeywordQuery):
    """AI agent: Get SEO keywords for a product"""
    result = ai_service.get_keywords(req.product_name, req.category)
    return result


@app.post("/api/agent/opportunities")
def score_opportunities():
    """AI agent: Score all products for market opportunities"""
    data = data_loader.get_products(skip=0, limit=100)
    products = data.get("products", []) if isinstance(data, dict) else data
    result = ai_service.score_opportunities(products)
    return result
