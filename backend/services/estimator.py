from services.embeddings import query_similar
from services.ai_service import suggest_pricing


def build_rag_suggestions(project_description: str, scope_items: list[dict]) -> list[dict]:
    """Query ChromaDB for similar past estimates and get AI-suggested pricing."""
    query_text = project_description + " " + " ".join(
        item.get("description", "") for item in scope_items
    )
    similar = query_similar(query_text, n_results=5)
    if not similar:
        return []
    return suggest_pricing(scope_items, similar)
