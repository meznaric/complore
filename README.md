# complexity-explore

> This was entirely vibe coded in a morning, several features are still missing, but it's a start.

CLI tool that given the folder produces a single html file report of complexity of code in that folder.

![report example](https://otivdev.ams3.cdn.digitaloceanspaces.com/github/Screenshot%202025-08-20%20at%2011.28.52.png)

## Report

- Interactive and intuitive - so you can with a hover see more details
- Shows aggregates of all different components
- Tree view of files (or folders)
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
    - Report output (json, html, or compact)
