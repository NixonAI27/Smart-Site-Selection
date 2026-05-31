import os
import chromadb
from chromadb.utils import embedding_functions

CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_db")
COLLECTION_NAME = "carpentry_estimates"

_client = None
_collection = None


def _get_collection():
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(path=CHROMA_PATH)
        ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        _collection = _client.get_or_create_collection(
            name=COLLECTION_NAME, embedding_function=ef
        )
    return _collection


def add_document(doc_id: str, text: str, metadata: dict) -> None:
    col = _get_collection()
    col.upsert(ids=[doc_id], documents=[text], metadatas=[metadata])


def query_similar(text: str, n_results: int = 5) -> list[dict]:
    col = _get_collection()
    count = col.count()
    if count == 0:
        return []
    n = min(n_results, count)
    results = col.query(query_texts=[text], n_results=n)
    items = []
    for i, doc in enumerate(results["documents"][0]):
        items.append({
            "id": results["ids"][0][i],
            "text": doc,
            "metadata": results["metadatas"][0][i],
            "distance": results["distances"][0][i],
        })
    return items


def delete_document(doc_id: str) -> None:
    col = _get_collection()
    col.delete(ids=[doc_id])


def list_documents() -> list[dict]:
    col = _get_collection()
    if col.count() == 0:
        return []
    result = col.get()
    return [
        {"id": result["ids"][i], "metadata": result["metadatas"][i]}
        for i in range(len(result["ids"]))
    ]
