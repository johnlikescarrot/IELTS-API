export interface TopicPoint {
  title: string;
  points: string[];
}

export interface Topic {
  id: number;
  name: string;
  sections: TopicPoint[];
}

export interface Resource {
  id: string;
  title: string;
  filename: string;
  format: string;
  size: number;
  category: string;
  path: string;
  sourceUrl: string;
  downloadUrl: string;
}

export interface WritingSample {
  id: string;
  test: string;
  band: number;
  task: number;
  subject: string;
  prompt: string;
  instructions: string;
  answer: string;
  examinerComment: string;
  source: {
    repository: string;
    file: string;
    url: string;
  };
}

export interface Citation {
  title: string;
  authors: string[];
  version: string;
  year: number;
  doi: string;
  url: string;
  sourceRepositoryUrl: string;
  description: string;
  keywords: string[];
}

export interface IndexResponse {
  service: string;
  version: string;
  documentation: string;
  baseUrl: string;
  endpoints: Record<string, string>;
}
