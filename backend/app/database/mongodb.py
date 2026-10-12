import os
import json
import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger("preppilot.database")

class LocalDocumentCollection:
    """A thread-safe, persistent local JSON-backed document store for development fallback.
    Implements core MongoDB Motor collection async semantics so code remains 100% database-agnostic.
    """
    def __init__(self, data_dir: str, collection_name: str):
        self.collection_name = collection_name
        self.file_path = os.path.join(data_dir, f"{collection_name}.json")
        self._lock = asyncio.Lock()
        self._cache: List[Dict[str, Any]] = []
        self._load()

    def _load(self):
        if os.path.exists(self.file_path):
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    self._cache = json.load(f)
            except Exception as e:
                logger.error(f"Error loading local store {self.collection_name}: {e}")
                self._cache = []
        else:
            self._cache = []

    def _save(self):
        os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
        with open(self.file_path, "w", encoding="utf-8") as f:
            # Serializer for ObjectIds & datetimes
            def default_serializer(o):
                if isinstance(o, ObjectId):
                    return str(o)
                if isinstance(o, datetime):
                    return o.isoformat()
                raise TypeError(f"Object of type {type(o)} is not JSON serializable")
            json.dump(self._cache, f, default=default_serializer, indent=2)

    def _matches(self, doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
        for k, v in query.items():
            if k == "_id":
                doc_id = str(doc.get("_id", ""))
                q_id = str(v)
                if doc_id != q_id:
                    return False
            elif isinstance(v, dict):
                # Simple operator support ($in, $ne, $gte)
                if "$in" in v:
                    if doc.get(k) not in v["$in"]:
                        return False
                elif "$ne" in v:
                    if doc.get(k) == v["$ne"]:
                        return False
            else:
                if doc.get(k) != v:
                    return False
        return True

    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with self._lock:
            for doc in self._cache:
                if self._matches(doc, query):
                    res = dict(doc)
                    res["_id"] = ObjectId(res["_id"]) if isinstance(res.get("_id"), str) else res.get("_id")
                    return res
            return None

    def find(self, query: Optional[Dict[str, Any]] = None):
        class Cursor:
            def __init__(self, parent, q):
                self.parent = parent
                self.q = q or {}
                self._sort_key = None
                self._sort_dir = 1
                self._limit = 0

            def sort(self, key_or_list, direction=1):
                if isinstance(key_or_list, list):
                    self._sort_key = key_or_list[0][0]
                    self._sort_dir = key_or_list[0][1]
                else:
                    self._sort_key = key_or_list
                    self._sort_dir = direction
                return self

            def limit(self, num: int):
                self._limit = num
                return self

            async def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
                async with self.parent._lock:
                    results = [dict(doc) for doc in self.parent._cache if self.parent._matches(doc, self.q)]
                    if self._sort_key:
                        results.sort(key=lambda x: x.get(self._sort_key, 0) or 0, reverse=(self._sort_dir < 0))
                    max_len = length or self._limit or len(results)
                    final = results[:max_len]
                    for r in final:
                        if isinstance(r.get("_id"), str):
                            r["_id"] = ObjectId(r["_id"])
                    return final

            def __aiter__(self):
                return self

            async def __anext__(self):
                docs = await self.to_list()
                if not hasattr(self, "_idx"):
                    self._idx = 0
                if self._idx < len(docs):
                    res = docs[self._idx]
                    self._idx += 1
                    return res
                raise StopAsyncIteration
        return Cursor(self, query)

    async def insert_one(self, document: Dict[str, Any]):
        async with self._lock:
            doc_copy = dict(document)
            if "_id" not in doc_copy or doc_copy["_id"] is None:
                doc_copy["_id"] = str(ObjectId())
            else:
                doc_copy["_id"] = str(doc_copy["_id"])
            self._cache.append(doc_copy)
            self._save()
            class InsertResult:
                inserted_id = ObjectId(doc_copy["_id"])
            return InsertResult()

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any]):
        async with self._lock:
            for doc in self._cache:
                if self._matches(doc, query):
                    if "$set" in update:
                        for k, v in update["$set"].items():
                            doc[k] = str(v) if isinstance(v, ObjectId) else v
                    if "$inc" in update:
                        for k, v in update["$inc"].items():
                            doc[k] = doc.get(k, 0) + v
                    self._save()
                    class UpdateResult:
                        modified_count = 1
                    return UpdateResult()
            class UpdateResultZero:
                modified_count = 0
            return UpdateResultZero()

    async def count_documents(self, query: Dict[str, Any]) -> int:
        async with self._lock:
            return sum(1 for doc in self._cache if self._matches(doc, query))

class LocalDatabase:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.collections: Dict[str, LocalDocumentCollection] = {}

    def __getitem__(self, name: str) -> LocalDocumentCollection:
        if name not in self.collections:
            self.collections[name] = LocalDocumentCollection(self.data_dir, name)
        return self.collections[name]


class DatabaseManager:
    client: Optional[AsyncIOMotorClient] = None
    db = None
    mode: str = "uninitialized"

    @classmethod
    async def connect(cls):
        if settings.MONGODB_URI and settings.MONGODB_URI.strip():
            try:
                logger.info("Connecting to MongoDB Atlas...")
                cls.client = AsyncIOMotorClient(
                    settings.MONGODB_URI,
                    serverSelectionTimeoutMS=4000
                )
                # Verify ping
                await cls.client.admin.command('ping')
                cls.db = cls.client[settings.DATABASE_NAME]
                cls.mode = "mongodb_atlas"
                logger.info(f"Connected to MongoDB Atlas: {settings.DATABASE_NAME}")
                return
            except Exception as e:
                logger.warning(f"Could not connect to MongoDB Atlas ({e}). Falling back to Local Document Store.")
        
        # Development fallback
        data_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data")
        os.makedirs(data_dir, exist_ok=True)
        cls.db = LocalDatabase(data_dir)
        cls.mode = "development_local_store"
        logger.info(f"Using development local document store at {data_dir}")

    @classmethod
    async def disconnect(cls):
        if cls.client:
            cls.client.close()
            logger.info("Closed MongoDB client connection")

def get_database():
    return DatabaseManager.db

def get_database_mode() -> str:
    return DatabaseManager.mode
