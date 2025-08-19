# complexity-explore

CLI tool that given the folder produces a single html file report of complexity of code in that folder.

## Report

- Interactive and intuitive - so you can with a hover see more details
- Shows aggregates of all different components
- tree view of files (or folders)
    - Height: component 1
    - Color: component 2
- Components can be configured what they are
    - Lines of codes relative to max
    - Activity: based on how often is the file changed relative to max (using git)
    - Tree sitter query (so we can support large number of file types out of the box)
        - Number of functions
        - Number of imports
        - Number of references
        - Biggest function number of rows
- Config
    - Focus on folders (show folders and their files’ aggregates of those components)
    - Height & Color components
    - Output location
    - Config file (only via cli, with sensible default)
    - Location (or as non flagged cli argument, can be multiple, support glob)
    - Checks (so you can get warnings/errors when certain conditions are met)
    - Ignore (can be multiple)
    - Report output (json or html)

## Project technical choices:

- Use tailwind in report
- Produce report.html that is only vanilla javascript with no dependencies except for tailwind from CDN
- Avoid transpilation or heavy frameworks
- Paths should all support globbing
- Respect gitignore

## ToDo

- Call it complore (COMPlexity expLORE)
- Make the project described above, modularized and easy to extend
- Make it as easy as possible to contribute
- Think of the best language that will be easy to install (eg. ‘brew install complore’) for end user, set up for CI, for collaboration, readily available for collaborators… minimum dependencies
- have github actions that ensure things work and deploy to the right channels, but quite minimum
- Prepare it for open source on github
- Make project of multiple files and do one by one with relevant memories of the previous file
