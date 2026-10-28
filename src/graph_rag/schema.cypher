// ==============================================================================
// Solstice Knowledge Graph Schema & Index Definitions
// Entities: Candidate, Skill, Project, Metric, Role, Company, Concept
// Edges: UTILIZES_TECH, ACHIEVED_OUTCOME, REQUIRES_CONCEPT, REQUIRES_SKILL, BRIDGES_TO
// ==============================================================================

// Uniqueness Constraints
CREATE CONSTRAINT candidate_id_unique IF NOT EXISTS
FOR (c:Candidate) REQUIRE c.id IS UNIQUE;

CREATE CONSTRAINT skill_id_unique IF NOT EXISTS
FOR (s:Skill) REQUIRE s.id IS UNIQUE;

CREATE CONSTRAINT project_id_unique IF NOT EXISTS
FOR (p:Project) REQUIRE p.id IS UNIQUE;

CREATE CONSTRAINT metric_id_unique IF NOT EXISTS
FOR (m:Metric) REQUIRE m.id IS UNIQUE;

CREATE CONSTRAINT role_id_unique IF NOT EXISTS
FOR (r:Role) REQUIRE r.id IS UNIQUE;

CREATE CONSTRAINT company_id_unique IF NOT EXISTS
FOR (co:Company) REQUIRE co.id IS UNIQUE;

CREATE CONSTRAINT concept_id_unique IF NOT EXISTS
FOR (cn:Concept) REQUIRE cn.id IS UNIQUE;

// Property Indexes for High-Velocity Lookup
CREATE INDEX skill_name_idx IF NOT EXISTS
FOR (s:Skill) ON (s.name);

CREATE INDEX concept_name_idx IF NOT EXISTS
FOR (cn:Concept) ON (cn.name);

CREATE INDEX role_name_idx IF NOT EXISTS
FOR (r:Role) ON (r.name);

// Full-Text Search Indexes for Semantic Fallback
CREATE FULLTEXT INDEX skillFulltextIndex IF NOT EXISTS
FOR (s:Skill) ON EACH [s.name, s.category];

CREATE FULLTEXT INDEX projectFulltextIndex IF NOT EXISTS
FOR (p:Project) ON EACH [p.name, p.role];

CREATE FULLTEXT INDEX jdConceptFulltextIndex IF NOT EXISTS
FOR (cn:Concept) ON EACH [cn.name, cn.description];

// Vector Index for Neural Embeddings (Neo4j 5.18+)
CREATE VECTOR INDEX skillEmbeddingIndex IF NOT EXISTS
FOR (s:Skill) ON (s.embedding)
OPTIONS { indexConfig: {
  `vector.dimensions`: 1536,
  `vector.similarity_function`: 'cosine'
}};
