# complexity-explore

> This was entirely vibe coded in a morning, several features are still missing, but it's a start.

CLI tool that given the folder produces a single html file report of complexity of code in that folder.

![report example](https://otivdev.ams3.cdn.digitaloceanspaces.com/github/Screenshot%202025-08-20%20at%2011.28.52.png)

## Usage

```bash
complore - explore code complexity

Usage: complore [paths..] [options]

Options:
  --config <file>        JSON config file
  --out <path>           Output file (report.html or report.json)
  --report <html|json|compact>   Output format (default: html)
  --height <metric>      Metric for height (loc|activity|functions|imports|maxfunc)
  --color <metric>       Metric for color (loc|activity|functions|imports|maxfunc)
  --foldersOnly          Aggregate by folders only
  --ignore <list>        Comma separated list of globs to ignore
  --help                 Show help

Example:
  complore 'app/**/*.ts' 'app/**/*.tsx'
```

## Report

- Interactive and intuitive - so you can with a hover see more details
- Shows aggregates of all different components
- Tree view of files (or folders)
    - Height: component 1
    - Color: component 2
- Components can be configured what they are
    - Lines of codes relative to max
    - Activity: based on how often is the file changed relative to max (using git)
    - ~~Tree sitter query (so we can support large number of file types out of the box)~~ (currently regex based)
        - Number of functions (functions)
        - Number of imports (imports)
        - ~~Number of references~~
        - Biggest function number of rows (maxfunc)
