```mermaid
flowchart TD
A[Browser Extension] --> B[Raw Screenshots]
B --> C[Vision Interpretation Layer]
C --> D[Structured UI State]
D --> E[n8n Orchestration]
E --> F[Agents]
F --> G[Tools]
G --> E
E --> H[Guidance Output]
```