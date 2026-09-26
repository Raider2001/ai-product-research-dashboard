import os
from typing import Optional
from anthropic import Anthropic
from openai import AzureOpenAI, OpenAI

class AIService:
    """AI service supporting both Claude (Anthropic) and OpenAI/Azure OpenAI models"""
    
    def __init__(self):
        self.claude_client = None
        self.openai_client = None
        self.azure_openai_client = None
        self.preferred_model = os.getenv("PREFERRED_AI_MODEL", "claude")
        
        # Initialize Claude
        if os.getenv("ANTHROPIC_API_KEY"):
            self.claude_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        
        # Initialize OpenAI
        if os.getenv("OPENAI_API_KEY"):
            self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Initialize Azure OpenAI
        if os.getenv("AZURE_OPENAI_API_KEY"):
            self.azure_openai_client = AzureOpenAI(
                api_key=os.getenv("AZURE_OPENAI_API_KEY"),
                api_version="2024-08-01-preview",
                azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
            )
    
    def research_products(self, query: str) -> dict:
        """Use AI to research products based on a query"""
        prompt = f"""You are an expert product researcher for ecommerce. Analyze the following product research query and provide insights.

Query: {query}

Please provide:
1. Product recommendations (name, category, estimated demand)
2. Potential profit margins
3. Competition level (low/medium/high)
4. Target keywords
5. Supplier suggestions

Format your response as a structured analysis."""

        return self._call_ai(prompt, "research_products")
    
    def analyze_suppliers(self, product_category: str) -> dict:
        """Analyze suppliers for a product category"""
        prompt = f"""You are a supply chain expert. Analyze the best suppliers for the product category: {product_category}

Provide:
1. Top suppliers in this category
2. Lead times
3. Quality ratings
4. Cost considerations
5. Recommendations"""

        return self._call_ai(prompt, "analyze_suppliers")
    
    def calculate_profit_margin(self, product_name: str, cost: float, market_price: float) -> dict:
        """Calculate and analyze profit margins"""
        prompt = f"""Analyze the profit potential for this product:
Product: {product_name}
Cost: ${cost}
Market Price: ${market_price}

Provide:
1. Profit margin percentage
2. Viability assessment
3. Pricing recommendations
4. Risk factors
5. Improvement suggestions"""

        return self._call_ai(prompt, "profit_analysis")
    
    def get_keywords(self, product_name: str, category: str) -> dict:
        """Get SEO keywords for a product"""
        prompt = f"""Generate SEO keywords for this product:
Product: {product_name}
Category: {category}

Provide:
1. High-volume keywords (10-20 searches/month)
2. Long-tail keywords (3+ words, lower competition)
3. Commercial intent keywords
4. Search volume estimates
5. Competition level for each"""

        return self._call_ai(prompt, "keywords")
    
    def score_opportunities(self, products: list) -> dict:
        """Score products based on opportunity potential"""
        products_summary = "\n".join([
            f"- {p.get('name', '')}: Price ${p.get('price', 0)}, Market Score {p.get('market_score', 0)}"
            for p in products[:5]  # Analyze top 5
        ])
        
        prompt = f"""Analyze the market opportunity for these products. For each, assess:
1. Demand level (0-100, based on market score)
2. Competition level (0-100, estimate based on product popularity)
3. Opportunity score (0-100, considering demand vs competition)

Products:
{products_summary}

For each product, provide a JSON response with: name, demand, competition, opportunity_score, and brief reasoning.

Format as valid JSON array like:
[{{"name": "Product Name", "demand": 75, "competition": 60, "opportunity_score": 82, "reasoning": "High demand with moderate competition"}}]

Return ONLY the JSON array, no other text."""

        response = self._call_ai(prompt, "opportunity_scoring")
        
        # Parse the JSON response and enhance it
        if response.get("success"):
            try:
                # Extract JSON from response
                import json
                response_text = response.get("response", "[]")
                # Find JSON array in response
                start_idx = response_text.find('[')
                end_idx = response_text.rfind(']') + 1
                if start_idx >= 0 and end_idx > start_idx:
                    json_str = response_text[start_idx:end_idx]
                    opportunities = json.loads(json_str)
                    return {
                        "success": True,
                        "opportunities": opportunities,
                        "task": "opportunity_scoring"
                    }
            except:
                pass
        
        return response
    
    def _call_ai(self, prompt: str, task_type: str) -> dict:
        """Internal method to call the AI service"""
        try:
            if self.preferred_model == "claude" and self.claude_client:
                response = self.claude_client.messages.create(
                    model="claude-haiku-4-5-20251001",
                    max_tokens=1024,
                    messages=[
                        {"role": "user", "content": prompt}
                    ]
                )
                return {
                    "success": True,
                    "model": "claude-3-5-sonnet",
                    "response": response.content[0].text,
                    "task": task_type
                }
            
            elif self.azure_openai_client:
                response = self.azure_openai_client.chat.completions.create(
                    model="gpt-4o",  # Use your deployed model name
                    messages=[
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=1024
                )
                return {
                    "success": True,
                    "model": "azure-gpt-4o",
                    "response": response.choices[0].message.content,
                    "task": task_type
                }
            
            elif self.openai_client:
                response = self.openai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=1024
                )
                return {
                    "success": True,
                    "model": "gpt-4o",
                    "response": response.choices[0].message.content,
                    "task": task_type
                }
            
            else:
                return {
                    "success": False,
                    "error": "No AI service configured. Please set API keys.",
                    "task": task_type
                }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "task": task_type
            }


# Singleton instance
ai_service = AIService()
