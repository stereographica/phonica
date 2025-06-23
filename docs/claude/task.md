# Document Improvement
## Work Overview
What you will be implementing is document improvement. We are planning several major feature implementations, but before that, we want to improve various documents.

## Goals to Achieve
The following is the ideal form of documentation we aim for:
- Accurately reflecting the actual state of the codebase and implementation status
- Reflecting the latest information from various packages
- Establishing rules for writing high-quality code
- Establishing rules and know-how for sufficient quality assurance
- **NEW** Creating a directory for implementation reports and establishing rules for writing reports. Details will be described later.

## What to Implement in the Improvement
- First, read everything under @docs/ and understand the current document information
- Read the entire codebase and pick up content that should be documented
- Research the latest information about packages being used and implementation/testing know-how on the web, and scrutinize information that should be included in the documentation
- Place documents under @docs/
  - Place documents for human reading directly under @docs/. Write in Japanese and format with readability in mind
  - Under @docs/claude/ are documents to be referenced from @CLAUDE.md. To reduce token count, write everything in English. Also, write in the optimal format for Claude to read
  - If you think the existing file division method is inappropriate, feel free to create new files, merge them, or rename them. Focus on creating the best documentation possible
- For existing documents, boldly delete descriptions or files that you think are unnecessary or redundant
- Once all documents are organized, write references to various documents in @CLAUDE.md
- Write the most important information and rules in @CLAUDE.md
- Keep each document file to around 500 lines and divide appropriately
- For various information under investigation, create a temp directory and leave English memos inside (memos must be left to prevent context window overflow and information loss). Delete the temp directory after all document improvement work is completed

## About Work Reports
As a new initiative, we will create work reports
- Create an `impl_reports` directory
- Under the `impl_reports` directory, create files with the filename format `{YYYY-MM-DD}-{implementation-title}.md`
- For content, refer to the format below
- Write rules in @CLAUDE.md to ensure reports are created every time instructed work is completed
- First, create a report about this document improvement

### Report Format
Write everything in Japanese
```markdown
# Work Report {YYYY-MM-DD}-{Japanese title about implementation content}
## Work Content
{Briefly describe the work done this time}
## Knowledge Gained
{Describe knowledge gained through this work}
## Items for Improvement
{Describe improvement items noticed during work}
## Work Impressions
{Write impressions of this work. Anything you felt is fine. Write freely}
```
