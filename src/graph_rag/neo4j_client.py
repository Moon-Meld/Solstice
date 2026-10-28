"""Neo4j client for Cypher execution, triplet ingestion, and 2-hop skill bridge queries."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
import logging

try:
    from neo4j import GraphDatabase, Driver
except ImportError:
    GraphDatabase = None
    Driver = None

from src.config import settings

logger = logging.getLogger("solstice.neo4j")


TWO_HOP_BRIDGE_CYPHER = """
MATCH (candidate_skill:Skill)
WHERE candidate_skill.id IN $candidate_skill_ids OR candidate_skill.name IN $candidate_skill_names
MATCH path = (candidate_skill)-[:REQUIRES_CONCEPT|BRIDGES_TO*1..2]-(target_skill:Skill)
WHERE (target_skill.id IN $target_skill_ids OR target_skill.name IN $target_skill_names)
  AND candidate_skill <> target_skill
RETURN candidate_skill.name AS source_skill,
       target_skill.name AS target_skill,
       [node in nodes(path) | coalesce(node.name, node.id)] AS bridge_path,
       length(path) AS hop_count
ORDER BY hop_count ASC
LIMIT 10
"""

CONCEPT_SHARED_BRIDGE_CYPHER = """
MATCH (s1:Skill)-[:REQUIRES_CONCEPT]->(c:Concept)<-[:REQUIRES_CONCEPT]-(s2:Skill)
WHERE (s1.id IN $candidate_skill_ids OR s1.name IN $candidate_skill_names)
  AND (s2.id IN $target_skill_ids OR s2.name IN $target_skill_names)
  AND s1 <> s2
RETURN s1.name AS source_skill,
       c.name AS shared_concept,
       s2.name AS target_skill,
       [s1.name, c.name, s2.name] AS bridge_path,
       2 AS hop_count
LIMIT 10
"""


class SolsticeNeo4jClient:
    """Production Neo4j client with robust offline fallback for tests and cold starts."""

    def __init__(
        self,
        uri: Optional[str] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
        driver: Optional[Any] = None
    ):
        self.uri = uri or settings.neo4j_uri
        self.user = user or settings.neo4j_user
        self.password = password or settings.neo4j_password
        self._driver = driver
        self._driver_checked = False
        # In-memory graph storage fallback for sandbox / testing environments
        self._in_memory_nodes: Dict[str, Dict[str, Any]] = {}
        self._in_memory_edges: List[Dict[str, Any]] = []

    def get_driver(self) -> Optional[Any]:
        """Lazy-initialize or return existing Neo4j driver."""
        if self._driver is not None:
            return self._driver
        if self._driver_checked:
            return None
        self._driver_checked = True
        if GraphDatabase is not None and self.uri:
            driver = None
            try:
                driver = GraphDatabase.driver(
                    self.uri,
                    auth=(self.user, self.password),
                    connection_timeout=0.5
                )
                driver.verify_connectivity()
                self._driver = driver
                return self._driver
            except Exception as e:
                if driver is not None:
                    try:
                        driver.close()
                    except Exception:
                        pass
                logger.debug(f"Neo4j connection could not be established ({e}); using memory graph fallback.")
                self._driver = None
                return None
        return None

    def close(self) -> None:
        """Close Neo4j driver connection."""
        if self._driver is not None:
            try:
                self._driver.close()
            except Exception:
                pass
            self._driver = None

    def __del__(self) -> None:
        self.close()

    def execute_cypher(self, query: str, parameters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Execute arbitrary Cypher query against Neo4j or memory simulator."""
        driver = self.get_driver()
        parameters = parameters or {}
        if driver is not None:
            try:
                with driver.session() as session:
                    result = session.run(query, parameters)
                    return [record.data() for record in result]
            except Exception as e:
                logger.warning(f"Cypher execution failed on Neo4j driver: {e}. Falling back to internal engine.")

        # Fallback simulation for 2-hop bridge queries
        return self._simulate_cypher(query, parameters)

    def ingest_triplets(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> Dict[str, int]:
        """Ingest Knowledge Graph entities and edges."""
        ingested_nodes = 0
        ingested_edges = 0

        # Store in internal memory representation
        for node in nodes:
            node_id = str(node.get("id") or node.get("name"))
            self._in_memory_nodes[node_id] = dict(node)
            ingested_nodes += 1

        for edge in edges:
            self._in_memory_edges.append(dict(edge))
            ingested_edges += 1

        driver = self.get_driver()
        if driver is not None:
            try:
                with driver.session() as session:
                    for n in nodes:
                        label = n.get("type", "Entity")
                        session.run(
                            f"MERGE (e:{label} {{id: $id}}) SET e += $props",
                            {"id": n["id"], "props": n}
                        )
                    for e in edges:
                        rel = e.get("relation", "RELATED_TO")
                        session.run(
                            f"""
                            MATCH (a {{id: $source}}), (b {{id: $target}})
                            MERGE (a)-[r:{rel}]->(b)
                            """,
                            {"source": e["source"], "target": e["target"]}
                        )
            except Exception as ex:
                logger.warning(f"Remote Neo4j ingestion failed ({ex}); in-memory fallback stored triplets successfully.")

        return {"nodes_ingested": ingested_nodes, "edges_ingested": ingested_edges}

    def find_two_hop_skill_bridges(
        self,
        candidate_skills: List[str],
        target_skills: List[str]
    ) -> List[Dict[str, Any]]:
        """Discover 2-hop cognitive paths bridging candidate skills to target skills."""
        params = {
            "candidate_skill_ids": candidate_skills,
            "candidate_skill_names": candidate_skills,
            "target_skill_ids": target_skills,
            "target_skill_names": target_skills,
        }

        # Try executing path query on live Neo4j if available
        results = self.execute_cypher(TWO_HOP_BRIDGE_CYPHER, params)
        if not results:
            results = self.execute_cypher(CONCEPT_SHARED_BRIDGE_CYPHER, params)

        if not results:
            # Deterministic graph traversal over in-memory graph
            results = self._in_memory_two_hop_traversal(candidate_skills, target_skills)

        return results

    def _in_memory_two_hop_traversal(
        self,
        candidate_skills: List[str],
        target_skills: List[str]
    ) -> List[Dict[str, Any]]:
        """Deterministic BFS / 2-hop traversal over stored in-memory graph."""
        bridges: List[Dict[str, Any]] = []
        cand_set = {s.lower() for s in candidate_skills}
        target_set = {s.lower() for s in target_skills}

        # Build adjacency maps
        # out_edges: src -> list of (target, relation)
        out_edges: Dict[str, List[Dict[str, str]]] = {}
        # in_edges: target -> list of (source, relation)
        in_edges: Dict[str, List[Dict[str, str]]] = {}

        for edge in self._in_memory_edges:
            src = str(edge.get("source", ""))
            tgt = str(edge.get("target", ""))
            rel = str(edge.get("relation", ""))
            out_edges.setdefault(src, []).append({"target": tgt, "relation": rel})
            in_edges.setdefault(tgt, []).append({"source": src, "relation": rel})

        # Find direct 1-hop or 2-hop paths
        for c_id, c_node in self._in_memory_nodes.items():
            c_name = c_node.get("name", c_id)
            if c_id.lower() not in cand_set and c_name.lower() not in cand_set:
                continue

            # Check 1-hop
            for out in out_edges.get(c_id, []):
                mid_id = out["target"]
                mid_node = self._in_memory_nodes.get(mid_id, {"name": mid_id})
                mid_name = mid_node.get("name", mid_id)

                if mid_id.lower() in target_set or mid_name.lower() in target_set:
                    bridges.append({
                        "source_skill": c_name,
                        "target_skill": mid_name,
                        "bridge_path": [c_name, mid_name],
                        "hop_count": 1
                    })

                # Check 2-hop through intermediate node
                for out2 in out_edges.get(mid_id, []):
                    dest_id = out2["target"]
                    dest_node = self._in_memory_nodes.get(dest_id, {"name": dest_id})
                    dest_name = dest_node.get("name", dest_id)
                    if dest_id.lower() in target_set or dest_name.lower() in target_set:
                        bridges.append({
                            "source_skill": c_name,
                            "target_skill": dest_name,
                            "bridge_path": [c_name, mid_name, dest_name],
                            "shared_concept": mid_name,
                            "hop_count": 2
                        })

                # Also check common parent concept: c_id -> mid <- dest_id
                for in2 in in_edges.get(mid_id, []):
                    other_src_id = in2["source"]
                    if other_src_id == c_id:
                        continue
                    other_src_node = self._in_memory_nodes.get(other_src_id, {"name": other_src_id})
                    other_name = other_src_node.get("name", other_src_id)
                    if other_src_id.lower() in target_set or other_name.lower() in target_set:
                        bridges.append({
                            "source_skill": c_name,
                            "target_skill": other_name,
                            "bridge_path": [c_name, mid_name, other_name],
                            "shared_concept": mid_name,
                            "hop_count": 2
                        })

        # Deduplicate
        unique_bridges: List[Dict[str, Any]] = []
        seen = set()
        for b in bridges:
            key = (b["source_skill"], b["target_skill"], tuple(b["bridge_path"]))
            if key not in seen:
                seen.add(key)
                unique_bridges.append(b)

        return unique_bridges

    def _simulate_cypher(self, query: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Handle fallback Cypher simulations for testing."""
        if "Skill" in query and "bridge" in query.lower():
            c_skills = params.get("candidate_skill_names") or params.get("candidate_skill_ids") or []
            t_skills = params.get("target_skill_names") or params.get("target_skill_ids") or []
            return self._in_memory_two_hop_traversal(c_skills, t_skills)
        return []
