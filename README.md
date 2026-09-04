# 🎓 IELTS-API: Optimized, Free & Unauthenticated IELTS RESTful API

[![CI Pipeline](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/ci.yml/badge.svg)](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/ci.yml)
[![Super-Linter](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/linter.yml/badge.svg)](https://github.com/johnlikescarrot/IELTS-API/actions/workflows/linter.yml)
[![Coverage](https://img.shields.io/badge/Coverage-100%25-brightgreen.svg)](https://github.com/johnlikescarrot/IELTS-API)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A high-performance, completely **free**, **unauthenticated**, and **production-ready** REST API in TypeScript built for IELTS test takers, ESL educators, and educational application developers.

Based on comprehensive IELTS open-source data from [`zhengyishiming/IELTS`](https://github.com/zhengyishiming/IELTS), this API provides structured access to over 4,300 vocabulary terms with IPA phonetics, scoring calculators, automated essay evaluation algorithms, speaking topic banks, practice mock tests, and university admission cutoffs.

---

## 🚀 Key Features

- **🔓 100% Free & No Authentication Required**: Instant access without API keys, tokens, or rate-limit friction.
- **📚 4,310+ IELTS Vocabulary Database**: Spanning 22 structured thematic chapters with phonetic IPA, definitions, mnemonics, and notes.
- **⚡ Interactive Vocabulary Quiz & Flashcards Generator**: Dynamic multiple-choice, phonetic transcription matching, and definition pairing questions.
- **🧮 Comprehensive Band Score Calculator**:
  - Official raw score (0–40) to Band conversion for Academic Reading, General Training Reading, and Listening.
  - Overall band calculation with official IELTS half-band rounding logic.
  - Target Score Planner: calculates required sub-scores to achieve a target overall band.
  - Canadian Language Benchmark (CLB) conversion matrix for Express Entry & immigration streams.
- **✍️ Automated Essay Analyzer & Writing Engine**:
  - Lexical richness, readability (Flesch-Kincaid & Flesch Reading Ease), and cohesive device detection.
  - IELTS Task 1 and Task 2 band score range estimation with actionable examiner feedback.
  - Extensive bank of Task 1 and Task 2 prompts with Band 7–9 sample model essays.
  - Reference guides for cohesive linkers, transition words, and Lexical Resource tiers (Band 6 vs Band 7 vs Band 8+).
- **🗣️ Speaking Question Bank & Framework**:
  - Official 4-pillar band descriptors (FC, LR, GRA, PR).
  - Part 1 topic repository with sample Q&As.
  - Part 2/3 cue cards categorized by People, Places, Objects, Events, and Media.
  - Native response formulas (AREA, PREP, 5W1H) and authentic candidate transcript analyses.
- **📖 Practice Test Suite**: Authentic academic reading passages and listening test transcripts with automated scoring and band estimation.
- **🏫 Institutional IELTS Requirements**: 30 Canadian colleges and universities with minimum overall and individual band cutoffs.
- **📖 Interactive Swagger / OpenAPI 3.0 Documentation**: Live API explorer built-in at `/api/v1/docs`.
- **🧪 100% Test Coverage**: Complete test coverage across Statements, Branches, Functions, and Lines with strict Jest thresholds.

---

## 🛠️ Architecture & Tech Stack

- **Runtime**: Node.js (v18+) & TypeScript (v5.7+)
- **Framework**: Express.js
- **Security & Performance**: Helmet, CORS, gzip compression
- **Documentation**: Swagger UI Express, OpenAPI 3.0.3 specification
- **Testing**: Jest, Supertest, ts-jest (Strict 100% coverage threshold enforced)
- **Code Quality**: ESLint, Prettier, Super-Linter GitHub Actions CI

---

## 📦 Quick Start & Local Setup

### Prerequisites

- Node.js (v18.x, v20.x, or v22.x recommended)
- npm (v9+)

### Installation

```bash
# Clone the repository
git clone https://github.com/johnlikescarrot/IELTS-API.git
cd IELTS-API

# Install dependencies
npm install

# Start development server with hot-reload
npm run dev
```

The server will be running on `http://localhost:3000`.

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server using `ts-node` |
| `npm run build` | Compile TypeScript to production JavaScript in `dist/` |
| `npm start` | Run compiled production server from `dist/server.js` |
| `npm run test` | Run test suite with Jest |
| `npm run test:coverage` | Run full test suite with 100% coverage validation |
| `npm run lint` | Check code quality with ESLint |
| `npm run lint:fix` | Automatically fix ESLint violations |
| `npm run format` | Format codebase using Prettier |
| `npm run format:check` | Verify formatting consistency |

---

## 📖 API Documentation & Live Explorer

Interactive Swagger UI documentation is available directly in the browser:
- **Interactive UI**: `http://localhost:3000/api/v1/docs`
- **OpenAPI 3.0 JSON Spec**: `http://localhost:3000/api/v1/openapi.json`
- **Root API Index**: `http://localhost:3000/` or `http://localhost:3000/api`
- **Health Check**: `http://localhost:3000/api/v1/health`

---

## 📡 API Endpoints Overview

### 1. 🔤 Vocabulary Endpoints (`/api/v1/vocabulary`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/vocabulary` | Paginated vocabulary list. Supports `page`, `limit`, `chapter`, `search`, `prefix`, `category`, `sort`. |
| `GET` | `/api/v1/vocabulary/:id` | Retrieve vocabulary item by numeric ID (1–4310). |
| `GET` | `/api/v1/vocabulary/word/:word` | Retrieve vocabulary item by word string (e.g. `ubiquitous`). |
| `GET` | `/api/v1/vocabulary/random` | Get random word(s). Query parameters: `count` (1–20), `chapter` (1–22). |
| `GET` | `/api/v1/vocabulary/chapters` | Get list and metadata for all 22 chapters with sample words. |
| `GET` | `/api/v1/vocabulary/quiz` | Generate IELTS vocabulary quiz questions (`multipleChoice`, `definitionMatch`, `phoneticMatch`). |
| `GET` | `/api/v1/vocabulary/flashcards` | Generate revision flashcards with hints and mnemonics. |

#### Example: Get Vocabulary with Filters
```http
GET /api/v1/vocabulary?chapter=1&limit=2&sort=word_asc
```
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "chapter": 1,
      "chapterName": "Chapter 1",
      "category": "Education & Academic Fundamentals",
      "word": "abdicate",
      "phonetic": "[ˈæbdɪkeɪt]",
      "explanation": "v. to give up formally (a high office, throne, authority, etc.)",
      "notes": "ab(away) + dic(speak/proclaim) + ate"
    },
    {
      "id": 2,
      "chapter": 1,
      "chapterName": "Chapter 1",
      "category": "Education & Academic Fundamentals",
      "word": "aberrant",
      "phonetic": "[æˈberənt]",
      "explanation": "adj. departing from the normal, usual, or expected course",
      "notes": "ab(away) + err(wander) + ant"
    }
  ],
  "meta": {
    "total": 196,
    "page": 1,
    "limit": 2,
    "totalPages": 98,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### 2. ✍️ Writing Endpoints (`/api/v1/writing`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/writing/prompts` | List Task 1 & Task 2 prompts with Band 7–9 sample essays. Filter by `taskType`, `category`, `search`. |
| `GET` | `/api/v1/writing/prompts/:id` | Get specific writing prompt and sample essay by ID. |
| `GET` | `/api/v1/writing/prompts/random` | Get a random writing prompt. |
| `GET` | `/api/v1/writing/band-descriptors` | Official IELTS writing evaluation criteria across all 4 criteria. |
| `GET` | `/api/v1/writing/cohesive-devices` | Comprehensive guide of cohesive linkers categorized by function. |
| `GET` | `/api/v1/writing/vocabulary-tiers` | Lexical upgrade guide comparing Band 6, Band 7, and Band 8+ terms. |
| `POST` | `/api/v1/writing/analyze` | Automated essay evaluation engine for word count, readability, cohesive linkers, and estimated band score. |

#### Example: Automated Essay Assessment
```http
POST /api/v1/writing/analyze
Content-Type: application/json

{
  "text": "The swift rise of artificial intelligence is reshaping modern labor markets. While critics argue that automation exacerbates unemployment, I firmly believe that the long-term benefits in terms of productivity significantly outweigh the drawbacks.\n\nOn the one hand, technological displacement undeniably creates friction. Routine manual tasks are delegated to algorithms. Consequently, governments must proactively invest in retraining programs.\n\nOn the other hand, the advantages of artificial intelligence are transformative. Firstly, AI enhances operational efficiency. Secondly, historical evidence illustrates that technological revolutions inevitably generate new industries.\n\nIn conclusion, although automation presents challenges, its capacity to elevate living standards makes it advantageous.",
  "taskType": "task2"
}
```
```json
{
  "success": true,
  "data": {
    "metrics": {
      "wordCount": 110,
      "sentenceCount": 9,
      "paragraphCount": 4,
      "averageSentenceLength": 12.2,
      "averageWordLength": 6.1,
      "readingTimeMinutes": 0.6
    },
    "cohesionAndTransitions": {
      "totalCohesiveDevicesFound": 6,
      "cohesiveDensityPercentage": 67,
      "detectedDevicesByCategory": {
        "addition": ["Secondly"],
        "contrast": ["While", "On the other hand", "On the one hand"],
        "causeAndEffect": ["Consequently"],
        "conclusion": ["In conclusion"]
      }
    },
    "lexicalResource": {
      "lexicalRichnessRatio": 0.81,
      "uniqueWordsCount": 89,
      "band7WordsFound": ["substantial", "generate"],
      "band8PlusWordsFound": ["exacerbates", "transformative", "advantageous"]
    },
    "readability": {
      "fleschReadingEase": 38.5,
      "fleschKincaidGradeLevel": 14.1,
      "readabilityLevel": "Fairly Difficult / Advanced Academic"
    },
    "bandEstimation": {
      "estimatedBandRange": "Band 7.0 - 7.5",
      "taskTypeAssumed": "task2",
      "wordCountStatus": "insufficient",
      "feedback": [
        "Word count (110) is below the recommended minimum for task2 (250 words). Penalty may apply for underlength response.",
        "Effective paragraph structure with 4 distinct sections.",
        "Good utilization of cohesive devices across 4 semantic categories.",
        "Good demonstration of sophisticated academic vocabulary."
      ]
    }
  }
}
```

---

### 3. 🗣️ Speaking Endpoints (`/api/v1/speaking`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/speaking/band-descriptors` | Speaking assessment criteria for Band 5 through Band 9. |
| `GET` | `/api/v1/speaking/part1-topics` | Part 1 topics with model answers. Filter by `topic`, `search`. |
| `GET` | `/api/v1/speaking/part1-topics/:id` | Retrieve single Part 1 topic by ID. |
| `GET` | `/api/v1/speaking/part2-cue-cards` | Part 2 cue cards and Part 3 follow-ups. Filter by `category`, `search`. |
| `GET` | `/api/v1/speaking/part2-cue-cards/:id` | Retrieve single Part 2 cue card by ID. |
| `GET` | `/api/v1/speaking/part2-cue-cards/random` | Get a random speaking cue card. |
| `GET` | `/api/v1/speaking/formulas` | Proven speaking answer structures (AREA, PREP, 5W1H). |
| `GET` | `/api/v1/speaking/transcripts` | Authentic candidate speech transcript analysis with examiner breakdown. |

---

### 4. 🧮 Band Score Calculator Endpoints (`/api/v1/calculator`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` or `GET` | `/api/v1/calculator/overall` | Compute overall IELTS band from 4 sub-scores with official rounding. |
| `GET` | `/api/v1/calculator/raw-to-band` | Convert raw score (0–40) to band score. Query params: `score`, `type` (`academicReading`, `generalTrainingReading`, `listening`). |
| `POST` | `/api/v1/calculator/target-planner` | Plan required sub-scores needed to achieve a target overall band. |
| `POST` or `GET` | `/api/v1/calculator/clb` | Convert IELTS scores to Canadian Language Benchmark (CLB) levels. |
| `GET` | `/api/v1/calculator/tables` | Reference datasets (raw-to-band matrices, CEFR mappings, CLB tables). |

#### Example: Calculate Overall Band Score
```http
POST /api/v1/calculator/overall
Content-Type: application/json

{
  "listening": 7.5,
  "reading": 7.0,
  "writing": 6.5,
  "speaking": 7.0
}
```
```json
{
  "success": true,
  "data": {
    "subscores": {
      "listening": 7.5,
      "reading": 7.0,
      "writing": 6.5,
      "speaking": 7.0
    },
    "exactAverage": 7.0,
    "overallBand": 7.0,
    "cefrLevel": "C1",
    "bandDescription": "Good user: Generally handles complex language well and understands detailed reasoning."
  }
}
```

---

### 5. 🏫 Canadian Colleges & Universities (`/api/v1/colleges`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/colleges` | List institutions with minimum overall & sub-score requirements. Filter by `province`, `provinceCode`, `city`, `minOverall`, `search`. |
| `GET` | `/api/v1/colleges/:id` | Retrieve institutional requirements by numeric ID. |
| `GET` | `/api/v1/colleges/provinces` | Aggregated statistics on institutions per Canadian province. |

---

### 6. 📖 Study Resources & References (`/api/v1/resources`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/resources` | Curated library of 15 IELTS preparation books, tools, and materials. Filter by `category`, `skill`, `level`, `format`, `search`. |
| `GET` | `/api/v1/resources/:id` | Get details of a specific resource. |
| `GET` | `/api/v1/resources/summary` | Distribution of resources grouped by skill. |

---

### 7. 📝 Practice Mock Tests (`/api/v1/practice`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/practice/reading` | List academic reading practice passages and questions. |
| `GET` | `/api/v1/practice/reading/:id` | Retrieve reading passage and questions by ID. |
| `GET` | `/api/v1/practice/listening` | List listening practice tests with transcripts and questions. |
| `GET` | `/api/v1/practice/listening/:id` | Retrieve listening test by ID. |
| `POST` | `/api/v1/practice/submit` | Submit test answers to receive automated grading, detailed explanations, and estimated band score. |

---

## 🧪 Testing & Code Quality

This project enforces **100% test coverage** across statements, branches, functions, and lines.

```bash
# Run all tests with coverage reporting
npm run test:coverage
```

### Coverage Table

| File | % Statements | % Branch | % Functions | % Lines |
|---|---|---|---|---|
| **All Files** | **100%** | **100%** | **100%** | **100%** |
| `src/app.ts` | 100% | 100% | 100% | 100% |
| `src/controllers/*` | 100% | 100% | 100% | 100% |
| `src/middlewares/*` | 100% | 100% | 100% | 100% |
| `src/routes/*` | 100% | 100% | 100% | 100% |
| `src/utils/*` | 100% | 100% | 100% | 100% |

---

## 🛡️ Continuous Integration & Super-Linter

Two automated GitHub Action workflows run on every push and pull request:
1. **CI Pipeline (`.github/workflows/ci.yml`)**: Builds across Node.js 18, 20, and 22, performs type checking, validates formatting, and executes tests against the 100% coverage threshold.
2. **Super-Linter (`.github/workflows/linter.yml`)**: Multi-language validation scanning TypeScript, JSON, Markdown, and YAML files.

---

## 📜 License & Attribution

- **License**: MIT License
- **Source Data Attribution**: Based on open-source IELTS preparation datasets by [`zhengyishiming/IELTS`](https://github.com/zhengyishiming/IELTS).
