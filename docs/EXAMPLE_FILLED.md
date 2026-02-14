# Example (Filled)

This is a small example showing how the template can be completed.

## Purpose
Generate `FromHash` mappers from FlatBuffers schemas and a Maven plugin to wire them into builds.

## Scope
- Included:
  - Generate mapper sources and FlatBuffers Java classes
  - One‑level nested tables and structs
- Excluded:
  - Vectors and unions (planned)

## Inputs
1. `.fbs` schema files under `schema/`
2. Hash map with camelCase keys

## Outputs
1. `gen-src/` with mapper + Java output
2. `gen-src/bfbs` with BFBS files

## Key Rules
1. Schema names snake_case, hash keys camelCase.
2. Nested fields flattened (`address.street` -> `addressStreet`).
3. Missing required fields throw `IllegalArgumentException`.

## Tests
1. Unit tests per production class.
2. Mojo integration test compiles and runs generated code.
3. Round‑trip hash data matches output buffers.

---

# Example First 3 Tests (TDD)
1. `NameUtilsTest` — converts snake_case to camelCase.
2. `MapperCodegenTest` — generates `FromHash` for a flat table.
3. `FlatbufHashMojoIntegrationTest` — executes mojo + compiles output.
