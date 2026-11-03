"""
Vector embedding store for BrandLens knowledge base.
Uses in-memory numpy arrays with cosine similarity.
Supports Gemini text-embedding-004 as well as offline semantic vector projection.
"""
import re
import numpy as np
from typing import List, Tuple, Optional, Callable
from backend.models import SourceChunk, Source

class EmbeddingStore:
    def __init__(self):
        self.chunks: dict[str, SourceChunk] = {}
        self._vectors: Optional[np.ndarray] = None
        self._chunk_ids: List[str] = []
        self._dirty = True
        self._embed_fn: Optional[Callable[[str], List[float]]] = None

    def configure(self, embed_fn: Callable[[str], List[float]]):
        """Set the embedding function (e.g. Gemini embed_content)."""
        self._embed_fn = embed_fn
        # Re-embed all chunks if embed_fn is updated
        for chunk in self.chunks.values():
            try:
                chunk.embedding = self._embed_fn(chunk.text)
            except Exception:
                pass
        self._dirty = True

    def ingest_source(self, source: Source):
        """Chunk a source document and compute embeddings."""
        self.remove_source(source.id)
        chunks = self._chunk_text(source.content, source)
        for chunk in chunks:
            if self._embed_fn:
                try:
                    chunk.embedding = self._embed_fn(chunk.text)
                except Exception:
                    chunk.embedding = self._offline_embed(chunk.text)
            else:
                chunk.embedding = self._offline_embed(chunk.text)
            self.chunks[chunk.id] = chunk
        self._dirty = True

    def remove_source(self, source_id: str):
        """Remove all chunks for a retired or deleted source."""
        to_remove = [cid for cid, c in self.chunks.items() if c.source_id == source_id]
        for cid in to_remove:
            del self.chunks[cid]
        if to_remove:
            self._dirty = True

    def embed_query(self, query: str) -> List[float]:
        """Compute embedding for query string."""
        if self._embed_fn:
            try:
                return self._embed_fn(query)
            except Exception:
                return self._offline_embed(query)
        return self._offline_embed(query)

    def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        source_filter: Optional[List[str]] = None
    ) -> List[Tuple[SourceChunk, float]]:
        """Find top-k most similar chunks by cosine similarity."""
        self._rebuild_index()
        if self._vectors is None or len(self._vectors) == 0:
            return []

        query = np.array(query_embedding, dtype=float)
        query_norm = np.linalg.norm(query)
        if query_norm == 0:
            return []
        query = query / query_norm

        norms = np.linalg.norm(self._vectors, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1e-9, norms)
        normalized = self._vectors / norms

        similarities = (normalized @ query).flatten()

        results = []
        top_indices = np.argsort(similarities)[::-1]
        for idx in top_indices:
            cid = self._chunk_ids[idx]
            chunk = self.chunks[cid]
            if source_filter and chunk.source_id not in source_filter:
                continue
            sim = float(similarities[idx])
            if sim > 0.15:
                results.append((chunk, sim))
            if len(results) >= top_k:
                break
        return results

    def _offline_embed(self, text: str, dim: int = 128) -> List[float]:
        """
        Deterministic lightweight semantic embedding generator.
        Uses character and word n-gram projection with term frequency.
        """
        vec = np.zeros(dim, dtype=float)
        words = re.findall(r'\b\w+\b', text.lower())
        if not words:
            return vec.tolist()

        for word in words:
            # Word hashing
            h = hash(word)
            idx1 = abs(h) % dim
            sign1 = 1.0 if (h >> 3) % 2 == 0 else -1.0
            vec[idx1] += sign1 * 1.5

            # 3-gram hashing
            for i in range(len(word) - 2):
                tri = word[i:i+3]
                h_tri = hash(tri)
                idx2 = abs(h_tri) % dim
                sign2 = 1.0 if (h_tri >> 2) % 2 == 0 else -1.0
                vec[idx2] += sign2 * 0.5

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    def _chunk_text(
        self,
        text: str,
        source: Source,
        max_words: int = 150,
        overlap: int = 30
    ) -> List[SourceChunk]:
        """Split source content into overlapping chunks."""
        words = text.split()
        if not words:
            return []

        chunks = []
        start = 0
        while start < len(words):
            end = min(start + max_words, len(words))
            chunk_text = " ".join(words[start:end])
            chunks.append(SourceChunk(
                source_id=source.id,
                source_title=source.title,
                section=source.section,
                text=chunk_text
            ))
            if end >= len(words):
                break
            start += max_words - overlap
        return chunks

    def _rebuild_index(self):
        """Rebuild the numpy vector index if chunks have changed."""
        if not self._dirty:
            return
        valid = [(cid, c) for cid, c in self.chunks.items() if c.embedding]
        if not valid:
            self._vectors = None
            self._chunk_ids = []
            return
        self._chunk_ids = [cid for cid, _ in valid]
        self._vectors = np.array([c.embedding for _, c in valid], dtype=float)
        self._dirty = False

embedding_store = EmbeddingStore()
